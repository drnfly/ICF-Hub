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
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv, dotenv_values
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

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


def load_llm_key() -> str:
    runtime_key = (os.environ.get("EMERGENT_LLM_KEY") or "").strip()
    if runtime_key:
        return runtime_key

    env_vals = dotenv_values(Path(__file__).parent.parent / ".env")
    return (env_vals.get("EMERGENT_LLM_KEY") or "").strip()


def get_optional_user_payload(authorization: str = Header(None)) -> Dict[str, Any] | None:
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


def pdf_pages_to_images_and_text(pdf_path: Path, max_pages: int = 3) -> tuple[List[str], str]:
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
    preview_filename = f"{uuid.uuid4().hex}_preview.png"
    preview_path = UPLOAD_DIR / preview_filename
    pix.save(str(preview_path))
    doc.close()

    return {
        "preview_filename": preview_filename,
        "preview_width": pix.width,
        "preview_height": pix.height
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
        raise


def infer_walls_from_dimension_text(pdf_text: str, wall_height_ft: float) -> Dict[str, Any]:
    if not pdf_text:
        return {}

    dimension_values: List[float] = []

    # Matches 12'-6" or 12' 6" formats
    feet_inches = re.findall(r"(\d{1,3})\s*['′]\s*(\d{1,2})?\s*(?:\"|in|”)?", pdf_text)
    for feet, inches in feet_inches:
        ft = float(feet)
        inch = float(inches) if inches else 0.0
        total_ft = ft + (inch / 12.0)
        if 6 <= total_ft <= 300:
            dimension_values.append(round(total_ft, 2))

    # Matches decimal feet like 24.5 ft
    decimal_feet = re.findall(r"\b(\d{1,3}(?:\.\d+)?)\s*(?:ft|feet)\b", pdf_text, flags=re.IGNORECASE)
    for value in decimal_feet:
        ft = float(value)
        if 6 <= ft <= 300:
            dimension_values.append(round(ft, 2))

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
            "notes": "Wall layout inferred from dimension text extracted from PDF."
        }

    return {}


def fallback_layout(wall_height_ft: float) -> Dict[str, Any]:
    walls = [
        {"id": "W1", "start": [0, 0], "end": [30, 0], "length_ft": 30, "height_ft": wall_height_ft, "openings": [{"type": "door", "width_ft": 3, "height_ft": 7, "offset_ft": 8}]},
        {"id": "W2", "start": [30, 0], "end": [30, 20], "length_ft": 20, "height_ft": wall_height_ft, "openings": []},
        {"id": "W3", "start": [30, 20], "end": [0, 20], "length_ft": 30, "height_ft": wall_height_ft, "openings": [{"type": "window", "width_ft": 4, "height_ft": 4, "offset_ft": 10}]},
        {"id": "W4", "start": [0, 20], "end": [0, 0], "length_ft": 20, "height_ft": wall_height_ft, "openings": []}
    ]
    return {"walls": walls, "ceiling_height_ft": wall_height_ft, "notes": "Fallback layout generated because floor-plan geometry extraction was uncertain."}


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
        length_ft = float(wall.get("length_ft") or wall.get("linear_feet") or 0)
        height_ft = float(wall.get("height_ft") or wall.get("ceiling_height_ft") or raw_payload.get("ceiling_height_ft") or fallback_wall_height_ft)

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

    ceiling_height_ft = float(raw_payload.get("ceiling_height_ft") or (sum(w["height_ft"] for w in normalized_walls) / max(len(normalized_walls), 1)) or fallback_wall_height_ft)

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
        "detected_walls": [
            {
                "id": wall["id"],
                "linear_feet": wall["linear_feet"],
                "sqft": wall["sqft"],
                "net_sqft": wall["net_sqft"],
                "openings_count": wall["openings_count"],
                "corners": 0,
                "radius_sections": 0
            }
            for wall in normalized_walls
        ],
        "model_3d": {
            "unit": "ft",
            "origin": [0, 0, 0],
            "walls": model_walls
        }
    }


async def analyze_pdf_takeoff(pdf_path: Path, preferred_wall_height_ft: Optional[float] = None) -> Dict[str, Any]:
    llm_key = load_llm_key()
    if not llm_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    images_b64, extracted_text = pdf_pages_to_images_and_text(pdf_path, max_pages=3)

    system_prompt = """
You are an ICF takeoff assistant.
You must estimate wall layout from the blueprint and return strict JSON only.
No markdown.

Required schema:
{
  "ceiling_height_ft": number,
  "walls": [
    {
      "id": "W1",
      "length_ft": number,
      "height_ft": number,
      "start": [number, number],
      "end": [number, number],
      "thickness_ft": number,
      "openings": [
        {
          "type": "door|window|opening",
          "width_ft": number,
          "height_ft": number,
          "offset_ft": number,
          "bottom_ft": number
        }
      ]
    }
  ],
  "notes": "short note"
}

Rules:
- Use feet for all dimensions.
- Use visible drawing geometry first; use extracted PDF text as supporting evidence.
- Include all major exterior walls visible in uploaded pages.
- Include door/window openings if visible.
- Do not invent unrealistic dimensions.
"""

    default_height_ft = preferred_wall_height_ft or 10.0
    clipped_text = extracted_text[:12000] if extracted_text else "No extractable PDF text found."
    user_prompt = (
        "Analyze this uploaded floor plan PDF (up to first 3 pages) for ICF takeoff. "
        "Extract ceiling/wall heights from drawing notes/dimensions when available; "
        f"if height is not visible, use {default_height_ft} ft as fallback. "
        "Use both images and extracted text when estimating walls/openings. "
        f"Extracted text context:\n{clipped_text}\n\n"
        "Return JSON only."
    )

    chat = LlmChat(
        api_key=llm_key,
        session_id=f"takeoff_{uuid.uuid4().hex[:10]}",
        system_message=system_prompt
    ).with_model("openai", "gpt-5.2")

    llm_response = await chat.send_message(
        UserMessage(
            text=user_prompt,
            file_contents=[ImageContent(image_base64=img) for img in images_b64]
        )
    )

    raw_payload = parse_llm_json(llm_response)

    # If model returns no walls, attempt rule-based wall inference from PDF text before generic fallback
    if not raw_payload.get("walls"):
        inferred_payload = infer_walls_from_dimension_text(extracted_text, default_height_ft)
        if inferred_payload.get("walls"):
            raw_payload = inferred_payload

    normalized = normalize_takeoff_payload(raw_payload, default_height_ft)
    normalized["analysis"] = raw_payload.get("notes") or "AI takeoff extraction completed."
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
    """Analyze uploaded PDF floor plan and extract ICF takeoff metrics."""
    user_payload = get_optional_user_payload(authorization)

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF floor plans are supported in Takeoff Beta.")

    preferred_height_ft: Optional[float] = None
    if wall_height is not None and str(wall_height).strip() != "":
        try:
            preferred_height_ft = float(wall_height)
            if preferred_height_ft <= 0:
                raise ValueError
        except ValueError:
            raise HTTPException(status_code=400, detail="Wall height must be a positive number in feet.")

    filename = f"{uuid.uuid4().hex}_{file.filename}"
    filepath = UPLOAD_DIR / filename

    try:
        with open(filepath, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        backend_base_url = get_public_backend_base_url(request)
        file_url = f"{backend_base_url}/uploads/{filename}" if backend_base_url else f"/uploads/{filename}"

        preview_meta = render_pdf_first_page_preview(filepath)
        preview_image_url = (
            f"{backend_base_url}/uploads/{preview_meta['preview_filename']}"
            if backend_base_url
            else f"/uploads/{preview_meta['preview_filename']}"
        )

        takeoff = await analyze_pdf_takeoff(filepath, preferred_height_ft)

        return {
            "file_url": file_url,
            "preview_image_url": preview_image_url,
            "preview_width": preview_meta["preview_width"],
            "preview_height": preview_meta["preview_height"],
            "filename": filename,
            "format": format,
            "wall_height": takeoff.get("summary", {}).get("ceiling_height_ft"),
            "contractor_id": user_payload.get("id") if user_payload else None,
            **takeoff
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Takeoff analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
