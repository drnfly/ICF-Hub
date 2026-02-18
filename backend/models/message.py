import uuid
from typing import Optional, List
from pydantic import BaseModel

class MessageGenerateRequest(BaseModel):
    recipient_name: str
    topic: str
    key_points: List[str] = []
    tone: str = "professional" # professional, casual, urgent, friendly
    type: str = "email" # email, sms

class MessageResponse(BaseModel):
    subject: Optional[str] = None
    body: str
