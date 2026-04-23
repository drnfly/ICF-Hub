from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request, Header
from pathlib import Path
import uuid
import logging
import os
import json
import re
import base64
import jwt
import fitz
import httpx
import asyncio
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv, dotenv_values

# Load environment variables for this module
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env', override=False)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/takeoff")

UPLOAD_DIR = Path("/app/frontend/public/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

JWT_SECRET = os.environ.get("JWT_SECRET")
JWT_ALGORITHM = "HS256"


def get_public_backend_base_url(request: Request) -> str:
    request_base = str(request.base_url).rstrip("/")
    if request_base:
        return request_base
    configured_url = (os.environ.get("REACT_APP_BACKEND_URL") or "").strip().rstrip("/")
    return configured_url


def get_optional_user_payload(authorization: str = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    if not JWT_SECRET:
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if not payload.get("id"):
            return None
        return payload
    except jwt.InvalidTokenError:
        return None


def pdf_pages_to_images_and_text(pdf_path: Path, max_pages: int = 3) -> tuple:
    doc = fitz.open(pdf_path)
    if doc.page_count == 0:
        raise ValueError("PDF has no pages")

    images_b64: List[str] = []
    text_chunks: List[str] = []

    page_count = min(doc.page_count, max_pages)
    for idx in range(page_count):
        page = doc.load_page(idx)
        pix = page.get_pixmap(matrix=fitz.Matrix(2.2, 2.2), alpha=False)
        png_bytes = pix.tobytes("png")
        images_b64.append(base64.b64encode(png_bytes).decode("utf-8"))
        page_text = (page.get_text("text") or "").strip()
        if page_text:
            text_chunks.append(f"[PAGE {idx + 1}]\n{page_text}")

    doc.close()
    return images_b64, "\n\n".join(text_chunks)


def render_pdf_first_page_preview(pdf_path: Path) -> Dict[str, Any]:
    doc = fitz.open(pdf_path)
    if doc.page_count == 0:
        doc.close()
        raise ValueError("PDF has no pages")

    page = doc.load_page(0)
    pix = page.get_pixmap(matrix=fitz.Matrix(2.2, 2.2), alpha=False)
    png_bytes = pix.tobytes("png")
    preview_filename = f"{uuid.uuid4().hex}_preview.png"
    preview_path = UPLOAD_DIR / preview_filename
    pix.save(str(preview_path))
    doc.close()

    return {
        "preview_filename": preview_filename,
        "preview_width": pix.width,
        "preview_height": pix.height,
        "preview_base64": base64.b64encode(png_bytes).decode("utf-8")
    }


def parse_llm_json(raw: str) -> Dict[str, Any]:
    if not raw:
        return {}
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return {}


def infer_walls_from_dimension_text(pdf_text: str, wall_height_ft: float) -> Dict[str, Any]:
    if not pdf_text:
        return {}

    dimension_values: List[float] = []

    # Extract feet and inches
    feet_pattern = re.compile(r"(\d+)\s*['\u2032]\s*(\d+)?")
    for match in feet_pattern.finditer(pdf_text):
        ft = float(match.group(1))
        inch = float(match.group(2)) if match.group(2) else 0.0
        total_ft = ft + (inch / 12.0)
        if 6 <= total_ft <= 300:
            dimension_values.append(round(total_ft, 2))

    if not dimension_values:
        return {}

    unique_dims = sorted(set(dimension_values), reverse=True)
    if len(unique_dims) >= 2:
        length_a, length_b = unique_dims[0], unique_dims[1]
        walls = [
            {"id": "W1", "start": [0, 0], "end": [length_a, 0], "length_ft": length_a, "height_ft": wall_height_ft, "openings": []},
            {"id": "W2", "start": [length_a, 0], "end": [length_a, length_b], "length_ft": length_b, "height_ft": wall_height_ft, "openings": []},
            {"id": "W3", "start": [length_a, length_b], "end": [0, length_b], "length_ft": length_a, "height_ft": wall_height_ft, "openings": []},
            {"id": "W4", "start": [0, length_b], "end": [0, 0], "length_ft": length_b, "height_ft": wall_height_ft, "openings": []}
        ]
        return {
            "walls": walls,
            "ceiling_height_ft": wall_height_ft,
            "notes": "Inferred from PDF dimensions"
        }
    return {}


def fallback_layout(wall_height_ft: float) -> Dict[str, Any]:
    walls = [
        {"id": "W1", "start": [0, 0], "end": [30, 0], "length_ft": 30, "height_ft": wall_height_ft, "openings": []},
        {"id": "W2", "start": [30, 0], "end": [30, 20], "length_ft": 20, "height_ft": wall_height_ft, "openings": []},
        {"id": "W3", "start": [30, 20], "end": [0, 20], "length_ft": 30, "height_ft": wall_height_ft, "openings": []},
        {"id": "W4", "start": [0, 20], "end": [0, 0], "length_ft": 20, "height_ft": wall_height_ft, "openings": []}
    ]
    return {"walls": walls, "ceiling_height_ft": wall_height_ft, "notes": "Fallback layout"}


def normalize_takeoff_payload(raw_payload: Dict[str, Any], fallback_wall_height_ft: float = 10.0) -> Dict[str, Any]:
    source_walls = raw_payload.get("walls") or []
    if not source_walls:
        source_walls = fallback_layout(fallback_wall_height_ft)["walls"]

    normalized_walls: List[Dict[str, Any]] = []
    model_walls: List[Dict[str, Any]] = []

    total_linear_feet = 0.0
    gross_wall_sqft = 0.0
    openings_sqft = 0.0
    opening_count = 0

    for idx, wall in enumerate(source_walls, start=1):
        wall_id = str(wall.get("id") or f"W{idx}")
        length_ft = float(wall.get("length_ft") or 0)
        height_ft = float(wall.get("height_ft") or raw_payload.get("ceiling_height_ft") or fallback_wall_height_ft)

        start = wall.get("start") or [float((idx - 1) * 10), 0.0]
        end = wall.get("end") or [float((idx - 1) * 10 + max(length_ft, 8)), 0.0]

        start_xy = [float(start[0]), float(start[1])]
        end_xy = [float(end[0]), float(end[1])]

        openings = wall.get("openings") or []
        normalized_openings: List[Dict[str, Any]] = []
        wall_openings_sqft = 0.0

        for op in openings:
            width_ft = float(op.get("width_ft") or 0)
            op_height_ft = float(op.get("height_ft") or 0)
            if width_ft <= 0 or op_height_ft <= 0:
                continue
            opening_data = {
                "type": str(op.get("type") or "opening"),
                "width_ft": width_ft,
                "height_ft": op_height_ft,
                "offset_ft": float(op.get("offset_ft") or 0),
                "bottom_ft": float(op.get("bottom_ft") or 0)
            }
            normalized_openings.append(opening_data)
            wall_openings_sqft += width_ft * op_height_ft

        wall_gross_sqft = max(length_ft * height_ft, 0)
        wall_net_sqft = max(wall_gross_sqft - wall_openings_sqft, 0)

        total_linear_feet += length_ft
        gross_wall_sqft += wall_gross_sqft
        openings_sqft += wall_openings_sqft
        opening_count += len(normalized_openings)

        normalized_walls.append({
            "id": wall_id,
            "linear_feet": round(length_ft, 2),
            "height_ft": round(height_ft, 2),
            "sqft": round(wall_gross_sqft, 2),
            "net_sqft": round(wall_net_sqft, 2),
            "openings_count": len(normalized_openings),
            "openings": normalized_openings,
            "start": start_xy,
            "end": end_xy
        })

        model_walls.append({
            "id": wall_id,
            "start": [start_xy[0], start_xy[1], 0],
            "end": [end_xy[0], end_xy[1], 0],
            "height_ft": round(height_ft, 2),
            "thickness_ft": float(wall.get("thickness_ft") or 0.5),
            "openings": normalized_openings
        })

    ceiling_height_ft = float(raw_payload.get("ceiling_height_ft") or fallback_wall_height_ft)

    return {
        "summary": {
            "total_linear_feet": round(total_linear_feet, 2),
            "gross_wall_sqft": round(gross_wall_sqft, 2),
            "openings_sqft": round(openings_sqft, 2),
            "net_wall_sqft": round(max(gross_wall_sqft - openings_sqft, 0), 2),
            "opening_count": opening_count,
            "ceiling_height_ft": round(ceiling_height_ft, 2)
        },
        "walls": normalized_walls,
        "detected_walls": [{"id": wall["id"], "linear_feet": wall["linear_feet"], "sqft": wall["sqft"]} for wall in normalized_walls],
        "model_3d": {"unit": "ft", "origin": [0, 0, 0], "walls": model_walls}
    }


async def analyze_pdf_takeoff(pdf_path: Path, preferred_wall_height_ft: Optional[float] = None) -> Dict[str, Any]:
    images_b64, extracted_text = pdf_pages_to_images_and_text(pdf_path, max_pages=3)
    default_height_ft = preferred_wall_height_ft or 10.0
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            prompt = f"Extract wall layout from this floor plan. Assume {default_height_ft} ft ceiling height. Return JSON with walls array only."
            response = await client.post(
                "http://127.0.0.1:11434/api/chat",
                json={"model": "llama3.2", "messages": [{"role": "user", "content": prompt}], "stream": False}
            )
            if response.status_code == 200:
                content = response.json().get("message", {}).get("content", "")
                raw_payload = parse_llm_json(content)
            else:
                raw_payload = {}
    except Exception as e:
        logger.error(f"Takeoff error: {e}")
        raw_payload = {}

    if not raw_payload.get("walls"):
        inferred = infer_walls_from_dimension_text(extracted_text, default_height_ft)
        if inferred.get("walls"):
            raw_payload = inferred

    normalized = normalize_takeoff_payload(raw_payload, default_height_ft)
    normalized["analysis"] = "Takeoff extraction completed"
    normalized["source_pages_used"] = min(len(images_b64), 3)
    return normalized


@router.post("/analyze")
async def analyze_takeoff(
    request: Request,
    file: UploadFile = File(...),
    format: str = Form("pdf"),
    wall_height: Optional[str] = Form(None),
    authorization: str = Header(None)
):
    user_payload = get_optional_user_payload(authorization)

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files supported")

    preferred_height_ft: Optional[float] = None
    if wall_height and str(wall_height).strip():
        try:
            preferred_height_ft = float(wall_height)
            if preferred_height_ft <= 0:
                raise ValueError
        except ValueError:
            raise HTTPException(status_code=400, detail="Wall height must be positive")

    filename = f"{uuid.uuid4().hex}_{file.filename}"
    filepath = UPLOAD_DIR / filename

    try:
        with open(filepath, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        backend_base_url = get_public_backend_base_url(request)
        file_url = f"{backend_base_url}/uploads/{filename}" if backend_base_url else f"/uploads/{filename}"

        preview_meta = render_pdf_first_page_preview(filepath)
        preview_image_url = f"{backend_base_url}/uploads/{preview_meta['preview_filename']}" if backend_base_url else f"/uploads/{preview_meta['preview_filename']}"

        takeoff = await analyze_pdf_takeoff(filepath, preferred_height_ft)

        return {
            "file_url": file_url,
            "preview_image_url": preview_image_url,
            "preview_image_data_url": f"data:image/png;base64,{preview_meta['preview_base64']}",
            "filename": filename,
            "wall_height": takeoff.get("summary", {}).get("ceiling_height_ft"),
            "contractor_id": user_payload.get("id") if user_payload else None,
            **takeoff
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Takeoff analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
