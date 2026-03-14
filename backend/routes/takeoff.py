from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
import uuid
import logging
import os
from vision_helper import analyze_image_with_gpt4o

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/takeoff")

UPLOAD_DIR = Path("/app/frontend/public/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/analyze")
async def analyze_takeoff(file: UploadFile = File(...), format: str = Form(...), wall_height: str = Form(...)):
    """Analyze uploaded plan and extract wall/opening data"""
    try:
        filename = f"{uuid.uuid4().hex}_{file.filename}"
        filepath = UPLOAD_DIR / filename
        
        with open(filepath, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        file_url = f"{os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')}/uploads/{filename}"
        
        # Use vision analysis to extract plan data
        analysis = await analyze_image_with_gpt4o(file_url)
        
        # Mock detected walls (in production, use more sophisticated CV/ML)
        detected_walls = [
            {"id": 1, "linear_feet": 200, "sqft": 2000, "corners": 8, "radius_sections": 0},
            {"id": 2, "linear_feet": 150, "sqft": 1500, "corners": 6, "radius_sections": 2}
        ]
        
        return {
            "file_url": file_url,
            "filename": filename,
            "format": format,
            "wall_height": wall_height,
            "analysis": analysis,
            "detected_walls": detected_walls
        }
    except Exception as e:
        logger.error(f"Takeoff analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
