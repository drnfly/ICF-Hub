from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
import uuid

router = APIRouter(prefix="/content", tags=["content"])

class MessageGenerateRequest(BaseModel):
    recipient_name: str
    topic: str
    key_points: List[str] = []
    tone: str = "professional" # professional, casual, urgent, friendly
    type: str = "email" # email, sms

class MessageResponse(BaseModel):
    subject: Optional[str] = None
    body: str

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

SYSTEM_PROMPT_EMAIL = """You are an expert professional communication assistant for construction contractors.
Your goal is to write clear, effective, and professional emails to homeowners/leads.
Output MUST be valid JSON with 'subject' and 'body' fields.
Do not include any other text."""

SYSTEM_PROMPT_SMS = """You are an expert professional communication assistant for construction contractors.
Your goal is to write short, effective, and professional SMS messages to homeowners/leads.
Keep it under 160 characters if possible, or 300 max.
Output MUST be valid JSON with 'body' field (subject should be null).
Do not include any other text."""

@router.post("/generate-message")
async def generate_message(data: MessageGenerateRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")

    session_id = str(uuid.uuid4())
    system_prompt = SYSTEM_PROMPT_EMAIL if data.type == "email" else SYSTEM_PROMPT_SMS
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt
    )

    user_prompt = f"""
    Write a {data.tone} {data.type} to {data.recipient_name}.
    Topic: {data.topic}
    Key Points to include:
    {', '.join(data.key_points)}
    
    Return JSON only.
    """

    try:
        response = await chat.send_message(UserMessage(text=user_prompt))
        import json
        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]
        
        result = json.loads(clean)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
