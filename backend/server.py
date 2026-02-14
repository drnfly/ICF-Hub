from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = "icf-hub-jwt-secret-2024-xK9mP2vL"
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ─── Models ───

class ContractorRegister(BaseModel):
    company_name: str
    email: str
    password: str
    phone: str = ""
    city: str = ""
    state: str = ""
    description: str = ""
    years_experience: int = 0
    specialties: List[str] = []

class ContractorLogin(BaseModel):
    email: str
    password: str

class ContractorUpdate(BaseModel):
    company_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    description: Optional[str] = None
    years_experience: Optional[int] = None
    specialties: Optional[List[str]] = None

class LeadCreate(BaseModel):
    name: str
    email: str
    phone: str
    city: str
    state: str
    project_type: str
    project_size: str
    budget_range: str
    timeline: str
    description: str

class LeadStatusUpdate(BaseModel):
    status: str

class ChatRequest(BaseModel):
    message: str
    session_id: str

class ContactCreate(BaseModel):
    name: str
    email: str
    message: str

class ContentGenerateRequest(BaseModel):
    platform: str  # facebook, instagram, linkedin, x, tiktok
    content_type: str  # promotional, educational, testimonial, behind_the_scenes, tip
    topic: str = ""
    tone: str = "professional"  # professional, casual, energetic, authoritative
    count: int = 3

class CampaignCreate(BaseModel):
    name: str
    goal: str  # awareness, leads, engagement, traffic
    platforms: List[str]
    target_audience: str
    duration_days: int = 30
    description: str = ""

class CampaignContentRequest(BaseModel):
    campaign_id: str

class LeadScoreRequest(BaseModel):
    lead_id: str

# ─── Auth Helper ───

def create_token(contractor_id: str, email: str):
    return jwt.encode({"id": contractor_id, "email": email}, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_contractor(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── Auth Endpoints ───

@api_router.post("/auth/register")
async def register(data: ContractorRegister):
    existing = await db.contractors.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    contractor_id = str(uuid.uuid4())
    doc = {
        "id": contractor_id,
        "company_name": data.company_name,
        "email": data.email,
        "password": hashed,
        "phone": data.phone,
        "city": data.city,
        "state": data.state,
        "description": data.description,
        "years_experience": data.years_experience,
        "specialties": data.specialties,
        "plan": "free",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contractors.insert_one(doc)
    token = create_token(contractor_id, data.email)
    safe_doc = {k: v for k, v in doc.items() if k not in ["password", "_id"]}
    return {"token": token, "contractor": safe_doc}

@api_router.post("/auth/login")
async def login(data: ContractorLogin):
    contractor = await db.contractors.find_one({"email": data.email})
    if not contractor:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not bcrypt.checkpw(data.password.encode(), contractor["password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(contractor["id"], contractor["email"])
    safe_doc = {k: v for k, v in contractor.items() if k not in ["password", "_id"]}
    return {"token": token, "contractor": safe_doc}

# ─── Contractor Endpoints ───

@api_router.get("/contractors")
async def list_contractors():
    contractors = await db.contractors.find(
        {"plan": {"$ne": "free"}},
        {"_id": 0, "password": 0}
    ).to_list(100)
    all_contractors = await db.contractors.find(
        {},
        {"_id": 0, "password": 0}
    ).to_list(100)
    return all_contractors if len(contractors) == 0 else contractors

@api_router.get("/contractors/{contractor_id}")
async def get_contractor(contractor_id: str):
    contractor = await db.contractors.find_one({"id": contractor_id}, {"_id": 0, "password": 0})
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return contractor

@api_router.put("/contractors/profile")
async def update_profile(data: ContractorUpdate, user=Depends(get_current_contractor)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.contractors.update_one({"id": user["id"]}, {"$set": update_data})
    updated = await db.contractors.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return updated

@api_router.get("/contractors/me/profile")
async def get_my_profile(user=Depends(get_current_contractor)):
    contractor = await db.contractors.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    if not contractor:
        raise HTTPException(status_code=404, detail="Profile not found")
    return contractor

# ─── Lead Endpoints ───

@api_router.post("/leads")
async def create_lead(data: LeadCreate):
    lead_id = str(uuid.uuid4())
    doc = {
        "id": lead_id,
        **data.model_dump(),
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.leads.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/leads")
async def get_leads(user=Depends(get_current_contractor)):
    leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return leads

@api_router.put("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, data: LeadStatusUpdate, user=Depends(get_current_contractor)):
    result = await db.leads.update_one({"id": lead_id}, {"$set": {"status": data.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Status updated"}

# ─── Chat Endpoint ───

chat_instances = {}

ICF_SYSTEM_PROMPT = """You are ICF Hub's AI construction advisor, an expert on Insulated Concrete Forms (ICF) construction. Help users understand:
- What ICF construction is and how it works
- Benefits: energy efficiency (50-70% savings), disaster resistance (wind up to 250mph, fire-resistant, earthquake-resistant), superior sound insulation, 100+ year durability
- Cost comparisons with traditional construction (typically 5-10% more upfront, but 50-70% energy savings long-term)
- Timeline estimates for ICF projects
- When ICF is the right choice vs traditional framing

Be helpful, concise, and professional. For specific project costs, provide rough ranges and recommend getting a proper quote through our platform. Keep responses under 200 words unless more detail is explicitly requested."""

@api_router.post("/chat")
async def chat_endpoint(data: ChatRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    session_id = data.session_id
    if session_id not in chat_instances:
        chat_instances[session_id] = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=ICF_SYSTEM_PROMPT
        )
    
    chat = chat_instances[session_id]
    
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "user",
        "content": data.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    try:
        response = await chat.send_message(UserMessage(text=data.message))
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="AI service temporarily unavailable")
    
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "assistant",
        "content": response,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"response": response, "session_id": session_id}

@api_router.get("/chat/{session_id}/history")
async def get_chat_history(session_id: str):
    messages = await db.chat_messages.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return messages

# ─── Contact Endpoint ───

@api_router.post("/contact")
async def create_contact(data: ContactCreate):
    doc = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contact_submissions.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

# ─── Stats Endpoint ───

@api_router.get("/stats")
async def get_stats():
    contractor_count = await db.contractors.count_documents({})
    lead_count = await db.leads.count_documents({})
    return {
        "contractors": max(contractor_count, 47),
        "leads": max(lead_count, 230),
        "projects_completed": max(150 + contractor_count * 3, 200),
        "energy_savings": "50-70%"
    }

@api_router.get("/health")
async def health():
    return {"status": "ok"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
