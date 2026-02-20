
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
import base64
import os
import uuid
import logging
import httpx

logger = logging.getLogger(__name__)

async def get_base64_from_url(url):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                return base64.b64encode(response.content).decode("utf-8")
    except Exception as e:
        logger.error(f"Image download failed: {e}")
    return None

async def analyze_image_with_gpt4o(image_url):
    try:
        # Get base64
        b64_image = await get_base64_from_url(image_url)
        if not b64_image:
            return "Failed to download image."

        # Create Chat
        # Using default model (likely gpt-5.2) which supports vision according to docs
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"vision_{uuid.uuid4().hex[:8]}",
            system_message="You are an expert architect. Analyze this floor plan image. Identify rooms, layout, and potential ICF construction benefits."
        )
        
        # Use ImageContent
        image_content = ImageContent(
            image_base64=b64_image
        )
        
        # Send Message
        response = await chat.send_message(UserMessage(
            text="Please analyze this blueprint.",
            file_contents=[image_content]
        ))
        
        return f"[System: Plan Analysis: {response}]"
    except Exception as e:
        logger.error(f"Vision analysis failed: {e}")
        return f"[System: Vision analysis failed: {e}]"
