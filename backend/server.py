from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import csv
import logging
import math
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ----------------------------- MongoDB ---------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ----------------------------- App / Router ----------------------------
app = FastAPI(title="ICF Operations Hub")
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
ACCESS_MIN = 15
REFRESH_DAYS = 7
LOCK_MIN = 15
MAX_FAILED = 5

# ----------------------------- Helpers ---------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": now_utc() + timedelta(minutes=ACCESS_MIN),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": now_utc() + timedelta(days=REFRESH_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie("access_token", access, httponly=True, secure=False,
                        samesite="lax", max_age=ACCESS_MIN * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False,
                        samesite="lax", max_age=REFRESH_DAYS * 86400, path="/")


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def serialize_user(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "email": doc["email"],
        "name": doc.get("name", ""),
        "role": doc.get("role", "crew"),
        "created_at": doc.get("created_at", now_utc()).isoformat()
        if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(*roles: str):
    async def checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles and user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user
    return checker


# ----------------------------- Models ----------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    role: Literal["admin", "foreman", "crew"] = "crew"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


# Bracing
class BracingIn(BaseModel):
    wall_height_ft: float = Field(gt=0, le=20)
    wall_length_ft: float = Field(gt=0, le=500)
    wind_exposure: Literal["B", "C", "D"] = "B"  # ASCE 7
    pour_rate_ft_hr: float = Field(gt=0, le=15)
    concrete_temp_f: float = Field(ge=30, le=110)
    concrete_slump_in: float = Field(ge=2, le=10)
    core_thickness_in: float = Field(ge=4, le=14)
    safety_factor: float = Field(default=2.0, ge=1.5, le=3.0)


# Estimator
class EstimatorIn(BaseModel):
    wall_height_ft: float = Field(gt=0, le=20)
    wall_length_ft: float = Field(gt=0, le=2000)
    core_thickness_in: float = Field(ge=4, le=14)
    openings_sqft: float = Field(ge=0, default=0)
    rebar_spacing_in: float = Field(ge=8, le=24, default=16)
    rebar_size: Literal["#3", "#4", "#5", "#6"] = "#4"
    block_face_sqft: float = Field(default=5.33, ge=4, le=8)


# Equipment
class EquipmentIn(BaseModel):
    name: str
    category: Literal["brace", "waler", "strongback", "alignment", "scaffold", "tool", "other"]
    serial: Optional[str] = None
    condition: Literal["excellent", "good", "fair", "poor", "retired"] = "good"
    location: Optional[str] = None
    daily_rate: float = Field(ge=0, default=0)
    quantity: int = Field(ge=1, default=1)
    notes: Optional[str] = None


# Customer
class CustomerIn(BaseModel):
    name: str
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None


# Rental
class RentalIn(BaseModel):
    customer_id: str
    equipment_id: str
    quantity: int = Field(ge=1, default=1)
    start_date: str  # ISO date
    due_date: str
    deposit: float = Field(ge=0, default=0)
    daily_rate: Optional[float] = None
    notes: Optional[str] = None


class RentalReturnIn(BaseModel):
    return_date: str
    condition_on_return: Literal["excellent", "good", "fair", "poor", "damaged", "lost"] = "good"
    damage_fee: float = Field(ge=0, default=0)
    notes: Optional[str] = None


# Maintenance
class MaintenanceIn(BaseModel):
    equipment_id: str
    service_date: str
    service_type: Literal["inspection", "repair", "cleaning", "replacement", "other"]
    performed_by: Optional[str] = None
    cost: float = Field(ge=0, default=0)
    next_service_date: Optional[str] = None
    notes: Optional[str] = None


# Bookings (tentative / pipeline)
class BookingIn(BaseModel):
    customer_name: str = Field(min_length=1)
    customer_id: Optional[str] = None  # link to existing customer if any
    contact: Optional[str] = None  # phone or email for leads not yet in DB
    equipment_id: str
    quantity: int = Field(ge=1, default=1)
    tentative_start_date: str
    tentative_end_date: str
    is_delivery: bool = False
    delivery_address: Optional[str] = None
    estimated_value: float = Field(ge=0, default=0)
    probability: Literal["hot", "warm", "cold"] = "warm"
    notes: Optional[str] = None


# ----------------------------- Auth Endpoints --------------------------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name.strip(),
        "role": payload.role,
        "created_at": now_utc(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    user_id = str(res.inserted_id)
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return serialize_user(doc)


@api.post("/auth/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    ident = f"{ip}:{email}"

    # brute-force lockout check
    rec = await db.login_attempts.find_one({"identifier": ident})
    if rec and rec.get("failed", 0) >= MAX_FAILED:
        locked_until = rec.get("locked_until")
        if locked_until and locked_until > now_utc():
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$inc": {"failed": 1},
             "$set": {"locked_until": now_utc() + timedelta(minutes=LOCK_MIN)}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": ident})
    user_id = str(user["_id"])
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return serialize_user(user)


@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(rt, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie("access_token", access, httponly=True, secure=False,
                            samesite="lax", max_age=ACCESS_MIN * 60, path="/")
        return {"ok": True}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ----------------------------- Bracing Engine --------------------------
@api.post("/bracing/calculate")
async def bracing_calculate(payload: BracingIn, user: dict = Depends(get_current_user)):
    """
    Bracing calculation using ACI 347 lateral concrete pressure principles
    and standard ICF bracing practice (Fox Blocks / Nudura / BuildBlock guidelines).
    """
    H = payload.wall_height_ft
    L = payload.wall_length_ft
    R = payload.pour_rate_ft_hr
    T = max(payload.concrete_temp_f, 40.0)  # avoid div by zero / cold capping

    # ACI 347 formula for lateral pressure (psf) of plastic concrete:
    # P = Cw * Cc * [150 + 9000*R/T], P <= 150*H, capped at 3000 psf
    Cw = 1.0  # unit weight factor (normal-weight concrete)
    Cc = 1.0  # chemistry factor (Type I cement, no retarders)
    p_aci = Cw * Cc * (150.0 + (9000.0 * R) / T)
    p_hydro = 150.0 * H
    P_max = min(max(p_aci, 600.0), p_hydro, 3000.0)  # psf

    # Resultant lateral load per linear foot (lbs/lf) of wall
    # Triangular pressure distribution -> total resultant = 0.5 * P_max * H
    total_resultant_lf = 0.5 * P_max * H

    # Wind adjustment per ASCE 7 exposure category (multiplier on lateral load)
    wind_mult = {"B": 1.00, "C": 1.15, "D": 1.30}[payload.wind_exposure]
    total_resultant_lf *= wind_mult

    # ICF braces only resist the upper portion of pressure — through-form ties
    # carry the majority (~75-80%) of lateral pressure to the slab and into the
    # opposing form face. Per manufacturer engineering (Fox Blocks, Nudura),
    # brace working load is ~20-25% of total lateral resultant.
    brace_share = 0.22
    load_per_lf = total_resultant_lf * brace_share

    # Manufacturer working brace capacities (typical):
    # Wafer/turnbuckle: 5000 lbs; Strongback (engineered): 7500 lbs.
    brace_type = "strongback" if (H >= 9.5 or payload.wind_exposure == "D" or (H >= 9 and R >= 5)) else "wafer"
    brace_capacity = 7500.0 if brace_type == "strongback" else 5000.0
    allowable = brace_capacity / payload.safety_factor

    # Brace spacing (ft) = allowable per brace / load per linear foot
    spacing_calc = allowable / load_per_lf if load_per_lf > 0 else 8.0
    # Cap recommended max spacing at 6 ft (industry guideline), min 2 ft
    spacing = max(2.0, min(6.0, spacing_calc))

    # Brace count = ceil(L / spacing) + 1 for end braces
    brace_count = math.ceil(L / spacing) + 1

    # Tie-downs: 2 anchors per brace typically (top tie and base plate)
    tiedown_anchors = brace_count * 2
    # Hardware: wedge bolts to slab + lag screws to top plate
    wedge_anchors = brace_count
    lag_screws = brace_count * 4  # top plate connection (typ 4 per brace)

    # Walers (horizontal): every 4ft of height for stiffening, only if H >= 8
    waler_rows = math.floor(H / 4) if H >= 8 else 0
    waler_lf = waler_rows * L

    # Tie pattern: vertical ties every 16" oc both directions through ICF
    tie_pattern = "16\" o.c. both ways (vertical + horizontal) through-form ties"

    # Concrete pressure profile (for chart)
    profile = []
    for i in range(0, int(H * 4) + 1):
        h = i / 4.0  # every 3 inches
        # pressure increases linearly with depth from top, capped at P_max
        depth_from_top = H - h
        p = min(150.0 * depth_from_top, P_max)
        profile.append({"height_ft": round(h, 2), "pressure_psf": round(p, 1)})

    warnings = []
    if R > 7:
        warnings.append("Pour rate above 7 ft/hr exceeds ACI 347 simplified formula range. Reduce pour rate or consult engineer.")
    if T < 50:
        warnings.append("Concrete temperature below 50°F slows set time and increases lateral pressure. Tighten brace spacing.")
    if H > 10:
        warnings.append("Wall height >10 ft. Engineered bracing design strongly recommended.")
    if payload.concrete_slump_in > 6:
        warnings.append("High slump increases lateral pressure. Verify pressure assumptions.")

    result = {
        "input": payload.model_dump(),
        "lateral_pressure_psf": round(P_max, 1),
        "aci_pressure_psf": round(p_aci, 1),
        "hydrostatic_pressure_psf": round(p_hydro, 1),
        "load_per_lf": round(load_per_lf, 1),
        "total_resultant_per_lf": round(total_resultant_lf, 1),
        "brace_share_pct": round(brace_share * 100, 0),
        "wind_multiplier": wind_mult,
        "brace_type": brace_type,
        "brace_capacity_lbs": brace_capacity,
        "allowable_per_brace_lbs": round(allowable, 1),
        "recommended_spacing_ft": round(spacing, 2),
        "spacing_uncapped_ft": round(spacing_calc, 2),
        "brace_count": brace_count,
        "tiedown_anchors": tiedown_anchors,
        "wedge_anchors": wedge_anchors,
        "lag_screws": lag_screws,
        "waler_rows": waler_rows,
        "waler_linear_ft": waler_lf,
        "tie_pattern": tie_pattern,
        "safety_factor": payload.safety_factor,
        "pressure_profile": profile,
        "warnings": warnings,
        "calculated_at": now_utc().isoformat(),
    }

    # Save calculation history
    history = {
        "user_id": str(user["_id"]),
        "user_email": user["email"],
        "type": "bracing",
        "input": payload.model_dump(),
        "result": {k: v for k, v in result.items() if k != "pressure_profile"},
        "created_at": now_utc(),
    }
    await db.calculations.insert_one(history)
    return result


# ----------------------------- Quick Estimator -------------------------
@api.post("/estimator/calculate")
async def estimator_calculate(payload: EstimatorIn, user: dict = Depends(get_current_user)):
    H = payload.wall_height_ft
    L = payload.wall_length_ft
    core_in = payload.core_thickness_in
    wall_area = H * L - payload.openings_sqft
    if wall_area <= 0:
        raise HTTPException(status_code=400, detail="Wall area is zero or negative after openings.")

    # ICF block count (with 5% waste)
    blocks = math.ceil((wall_area / payload.block_face_sqft) * 1.05)

    # Concrete volume (cubic yards) = wall_area * core_thickness/12 / 27
    cy = (wall_area * (core_in / 12.0)) / 27.0
    cy_with_waste = cy * 1.05

    # Rebar (linear feet)
    # Horizontal courses: ceil(H * 12 / spacing) total runs each spans L
    spacing = payload.rebar_spacing_in
    horizontal_runs = math.ceil((H * 12) / spacing) + 1
    horizontal_lf = horizontal_runs * L
    vertical_runs = math.ceil((L * 12) / spacing) + 1
    vertical_lf = vertical_runs * H
    total_rebar_lf = horizontal_lf + vertical_lf
    # Weight lb/ft for #3=0.376 #4=0.668 #5=1.043 #6=1.502
    rebar_weight = {"#3": 0.376, "#4": 0.668, "#5": 1.043, "#6": 1.502}[payload.rebar_size]
    rebar_lbs = total_rebar_lf * rebar_weight
    rebar_tons = rebar_lbs / 2000.0

    bom = [
        {"item": f"ICF blocks ({payload.block_face_sqft} sqft face)", "quantity": blocks, "unit": "ea"},
        {"item": f"Concrete ({core_in}\" core, 5% waste)", "quantity": round(cy_with_waste, 2), "unit": "cy"},
        {"item": f"Rebar {payload.rebar_size} @ {spacing}\" o.c. EW", "quantity": round(total_rebar_lf, 1), "unit": "lf"},
        {"item": f"Rebar {payload.rebar_size} total weight", "quantity": round(rebar_lbs, 1), "unit": "lbs"},
        {"item": "Foam adhesive", "quantity": math.ceil(blocks / 25), "unit": "tubes"},
        {"item": "Rebar ties", "quantity": math.ceil(total_rebar_lf / 8), "unit": "ea"},
        {"item": "Tie wire (16 ga)", "quantity": math.ceil(total_rebar_lf / 200), "unit": "rolls"},
    ]
    result = {
        "input": payload.model_dump(),
        "wall_area_sqft": round(wall_area, 1),
        "block_count": blocks,
        "concrete_cy": round(cy, 2),
        "concrete_cy_with_waste": round(cy_with_waste, 2),
        "rebar_horizontal_lf": round(horizontal_lf, 1),
        "rebar_vertical_lf": round(vertical_lf, 1),
        "rebar_total_lf": round(total_rebar_lf, 1),
        "rebar_total_lbs": round(rebar_lbs, 1),
        "rebar_total_tons": round(rebar_tons, 3),
        "bom": bom,
        "calculated_at": now_utc().isoformat(),
    }
    await db.calculations.insert_one({
        "user_id": str(user["_id"]),
        "user_email": user["email"],
        "type": "estimator",
        "input": payload.model_dump(),
        "result": result,
        "created_at": now_utc(),
    })
    return result


# ----------------------------- Equipment CRUD --------------------------
def serialize_equipment(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "category": doc["category"],
        "serial": doc.get("serial"),
        "condition": doc.get("condition", "good"),
        "location": doc.get("location"),
        "daily_rate": doc.get("daily_rate", 0),
        "quantity": doc.get("quantity", 1),
        "available": doc.get("available", doc.get("quantity", 1)),
        "notes": doc.get("notes"),
        "created_at": doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


@api.get("/equipment")
async def list_equipment(user: dict = Depends(get_current_user)):
    items = await db.equipment.find({}).sort("name", 1).to_list(1000)
    return [serialize_equipment(i) for i in items]


@api.post("/equipment")
async def create_equipment(payload: EquipmentIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["available"] = doc["quantity"]
    doc["created_at"] = now_utc()
    res = await db.equipment.insert_one(doc)
    doc["_id"] = res.inserted_id
    # log initial stock event
    await db.stock_adjustments.insert_one({
        "equipment_id": str(res.inserted_id),
        "delta": doc["quantity"],
        "reason": "Initial stock — added to inventory",
        "user_id": str(user["_id"]),
        "user_email": user["email"],
        "created_at": now_utc(),
    })
    return serialize_equipment(doc)


CSV_HEADERS = ["name", "category", "condition", "location", "daily_rate", "quantity", "serial", "notes"]
VALID_CATEGORIES = {"brace", "waler", "strongback", "alignment", "scaffold", "tool", "other"}
VALID_CONDITIONS = {"excellent", "good", "fair", "poor", "retired"}


@api.get("/equipment/template.csv")
async def csv_template(user: dict = Depends(get_current_user)):
    """Download a CSV template the user can fill out."""
    from fastapi.responses import PlainTextResponse
    sample_rows = [
        CSV_HEADERS,
        ["Wafer Brace - 9ft", "brace", "good", "Yard A", "4.50", "200", "WB-9-001", "Aluminum turnbuckle"],
        ["Strongback Brace - 12ft", "strongback", "good", "Yard A", "7.25", "80", "", "Engineered"],
        ["Waler 8ft Aluminum", "waler", "excellent", "Yard B", "3.00", "150", "", ""],
    ]
    buf = io.StringIO()
    writer = csv.writer(buf)
    for row in sample_rows:
        writer.writerow(row)
    return PlainTextResponse(
        buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="icf-inventory-template.csv"'},
    )


@api.post("/equipment/import")
async def import_equipment_csv(
    file: UploadFile = File(...),
    mode: str = "create",
    user: dict = Depends(get_current_user),
):
    """
    Import equipment from CSV.

    Modes:
      • create  — insert new rows only; skip rows whose serial/name already exists
      • update  — only update existing matched rows (set fields to CSV values); skip unmatched
      • add     — increment quantity of matched rows by CSV `quantity`; create row if no match

    Matching priority: `serial` (exact, when non-empty) → `name` (exact, case-insensitive).
    Expected columns (case-insensitive):
    name, category, condition, location, daily_rate, quantity, serial, notes
    """
    if mode not in {"create", "update", "add"}:
        raise HTTPException(status_code=400, detail="mode must be one of: create, update, add")

    fname = (file.filename or "").lower()
    if not fname.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File is empty")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="No header row found")

    created = []
    updated = []
    skipped = []
    errors = []
    row_index = 1
    for raw_row in reader:
        row_index += 1
        try:
            norm = {(k or "").strip().lower(): (v.strip() if isinstance(v, str) else v)
                    for k, v in raw_row.items() if k}
            name = norm.get("name") or ""
            serial = norm.get("serial") or ""
            if not name and not serial:
                raise ValueError("missing both 'name' and 'serial' — need at least one")

            qty_raw = norm.get("quantity") or norm.get("qty")
            rate_raw = norm.get("daily_rate") or norm.get("rate")

            # find existing match
            existing = None
            if serial:
                existing = await db.equipment.find_one({"serial": serial})
            if not existing and name:
                existing = await db.equipment.find_one({
                    "name": {"$regex": f"^{name}$", "$options": "i"}
                })

            if mode == "create":
                if existing:
                    skipped.append({"row": row_index, "name": name or serial, "reason": "already exists"})
                    continue
                if not name:
                    raise ValueError("'name' is required for create")
                data = _row_to_equipment(norm, name, qty_raw, rate_raw)
                res = await db.equipment.insert_one(data)
                data["_id"] = res.inserted_id
                await _log_stock(res.inserted_id, data["quantity"], f"CSV import — row {row_index}", user)
                created.append(serialize_equipment(data))

            elif mode == "update":
                if not existing:
                    skipped.append({"row": row_index, "name": name or serial, "reason": "no match found"})
                    continue
                # only set fields that are present (non-empty) in the row
                update_doc = {}
                if name:
                    update_doc["name"] = name
                if (norm.get("category") or "").lower() in VALID_CATEGORIES:
                    update_doc["category"] = norm["category"].lower()
                if (norm.get("condition") or "").lower() in VALID_CONDITIONS:
                    update_doc["condition"] = norm["condition"].lower()
                if norm.get("location") is not None and norm.get("location") != "":
                    update_doc["location"] = norm["location"]
                if rate_raw not in (None, ""):
                    update_doc["daily_rate"] = float(rate_raw)
                if serial:
                    update_doc["serial"] = serial
                if norm.get("notes"):
                    update_doc["notes"] = norm["notes"]
                qty_delta = 0
                if qty_raw not in (None, ""):
                    new_qty = int(float(qty_raw))
                    old_qty = existing.get("quantity", 1)
                    qty_delta = new_qty - old_qty
                    update_doc["quantity"] = new_qty
                    new_avail = max(0, existing.get("available", old_qty) + qty_delta)
                    update_doc["available"] = new_avail
                await db.equipment.update_one({"_id": existing["_id"]}, {"$set": update_doc})
                if qty_delta != 0:
                    await _log_stock(existing["_id"], qty_delta, f"CSV update — row {row_index}", user)
                refreshed = {**existing, **update_doc}
                updated.append(serialize_equipment(refreshed))

            else:  # mode == "add"
                if not existing:
                    if not name:
                        raise ValueError("'name' is required to create when no match found")
                    data = _row_to_equipment(norm, name, qty_raw, rate_raw)
                    res = await db.equipment.insert_one(data)
                    data["_id"] = res.inserted_id
                    await _log_stock(res.inserted_id, data["quantity"], f"CSV add — row {row_index} (new SKU)", user)
                    created.append(serialize_equipment(data))
                else:
                    if qty_raw in (None, ""):
                        skipped.append({"row": row_index, "name": name or serial, "reason": "no quantity to add"})
                        continue
                    delta = int(float(qty_raw))
                    new_qty = existing.get("quantity", 0) + delta
                    new_avail = existing.get("available", existing.get("quantity", 0)) + delta
                    if new_qty < 0 or new_avail < 0:
                        raise ValueError(f"adding {delta} would push qty below zero")
                    await db.equipment.update_one(
                        {"_id": existing["_id"]},
                        {"$set": {"quantity": new_qty, "available": new_avail}},
                    )
                    await _log_stock(existing["_id"], delta, f"CSV add — row {row_index}", user)
                    refreshed = {**existing, "quantity": new_qty, "available": new_avail}
                    updated.append(serialize_equipment(refreshed))

        except Exception as e:
            errors.append({
                "row": row_index,
                "error": str(e),
                "name": raw_row.get("name") or raw_row.get("Name", ""),
            })

    return {
        "mode": mode,
        "created_count": len(created),
        "updated_count": len(updated),
        "skipped_count": len(skipped),
        "error_count": len(errors),
        "errors": errors[:50],
        "skipped": skipped[:50],
        "created": created,
        "updated": updated,
    }


def _row_to_equipment(norm: dict, name: str, qty_raw, rate_raw) -> dict:
    cat = (norm.get("category") or "other").lower()
    cond = (norm.get("condition") or "good").lower()
    data = {
        "name": name,
        "category": cat if cat in VALID_CATEGORIES else "other",
        "condition": cond if cond in VALID_CONDITIONS else "good",
        "location": norm.get("location") or None,
        "daily_rate": float(rate_raw or 0),
        "quantity": int(float(qty_raw or 1)),
        "serial": norm.get("serial") or None,
        "notes": norm.get("notes") or None,
    }
    if data["quantity"] < 0:
        raise ValueError("quantity must be >= 0")
    data["available"] = data["quantity"]
    data["created_at"] = now_utc()
    return data


async def _log_stock(equipment_id, delta: int, reason: str, user: dict):
    await db.stock_adjustments.insert_one({
        "equipment_id": str(equipment_id),
        "delta": delta,
        "reason": reason,
        "user_id": str(user["_id"]),
        "user_email": user["email"],
        "created_at": now_utc(),
    })


@api.get("/equipment/{equipment_id}/history")
async def equipment_history(equipment_id: str, user: dict = Depends(get_current_user)):
    items = await db.stock_adjustments.find({"equipment_id": equipment_id}).sort("created_at", -1).to_list(500)
    return [{
        "id": str(i["_id"]),
        "delta": i["delta"],
        "reason": i.get("reason"),
        "user_email": i.get("user_email"),
        "created_at": i["created_at"].isoformat() if isinstance(i["created_at"], datetime) else i["created_at"],
    } for i in items]


@api.patch("/equipment/{equipment_id}")
async def update_equipment(equipment_id: str, payload: EquipmentIn, user: dict = Depends(get_current_user)):
    doc = await db.equipment.find_one({"_id": ObjectId(equipment_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Equipment not found")
    update = payload.model_dump()
    # if quantity changed, adjust availability by same delta
    qty_delta = update["quantity"] - doc.get("quantity", 1)
    new_avail = max(0, doc.get("available", doc.get("quantity", 1)) + qty_delta)
    update["available"] = new_avail
    await db.equipment.update_one({"_id": ObjectId(equipment_id)}, {"$set": update})
    doc.update(update)
    return serialize_equipment(doc)


class StockAdjustIn(BaseModel):
    delta: int  # positive to add stock, negative to remove
    reason: Optional[str] = None


@api.post("/equipment/{equipment_id}/adjust")
async def adjust_stock(equipment_id: str, payload: StockAdjustIn, user: dict = Depends(get_current_user)):
    doc = await db.equipment.find_one({"_id": ObjectId(equipment_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Equipment not found")
    new_qty = doc.get("quantity", 1) + payload.delta
    new_avail = doc.get("available", doc.get("quantity", 1)) + payload.delta
    if new_qty < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot go below zero")
    if new_avail < 0:
        raise HTTPException(status_code=400, detail=f"Cannot remove {-payload.delta} — only {doc.get('available', 0)} not on rent")
    await db.equipment.update_one(
        {"_id": ObjectId(equipment_id)},
        {"$set": {"quantity": new_qty, "available": new_avail}},
    )
    # log the adjustment for audit
    await db.stock_adjustments.insert_one({
        "equipment_id": equipment_id,
        "delta": payload.delta,
        "reason": payload.reason,
        "user_id": str(user["_id"]),
        "user_email": user["email"],
        "created_at": now_utc(),
    })
    doc["quantity"] = new_qty
    doc["available"] = new_avail
    return serialize_equipment(doc)


@api.delete("/equipment/{equipment_id}")
async def delete_equipment(equipment_id: str, user: dict = Depends(require_role("admin", "foreman"))):
    await db.equipment.delete_one({"_id": ObjectId(equipment_id)})
    return {"ok": True}


# ----------------------------- Customers -------------------------------
def serialize_customer(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "company": doc.get("company"),
        "phone": doc.get("phone"),
        "email": doc.get("email"),
        "address": doc.get("address"),
        "created_at": doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


@api.get("/customers")
async def list_customers(user: dict = Depends(get_current_user)):
    items = await db.customers.find({}).sort("name", 1).to_list(1000)
    return [serialize_customer(i) for i in items]


@api.post("/customers")
async def create_customer(payload: CustomerIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["created_at"] = now_utc()
    res = await db.customers.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_customer(doc)


# ----------------------------- Rentals ---------------------------------
def serialize_rental(doc: dict, eq: Optional[dict] = None, cust: Optional[dict] = None) -> dict:
    return {
        "id": str(doc["_id"]),
        "customer_id": doc["customer_id"],
        "customer_name": (cust or {}).get("name") if cust else doc.get("customer_name"),
        "equipment_id": doc["equipment_id"],
        "equipment_name": (eq or {}).get("name") if eq else doc.get("equipment_name"),
        "quantity": doc.get("quantity", 1),
        "start_date": doc["start_date"],
        "due_date": doc["due_date"],
        "return_date": doc.get("return_date"),
        "deposit": doc.get("deposit", 0),
        "daily_rate": doc.get("daily_rate", 0),
        "status": doc.get("status", "active"),
        "condition_on_return": doc.get("condition_on_return"),
        "damage_fee": doc.get("damage_fee", 0),
        "notes": doc.get("notes"),
        "created_at": doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


@api.get("/rentals")
async def list_rentals(status_filter: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if status_filter:
        q["status"] = status_filter
    items = await db.rentals.find(q).sort("start_date", -1).to_list(1000)
    # enrich
    eq_ids = {ObjectId(i["equipment_id"]) for i in items}
    cust_ids = {ObjectId(i["customer_id"]) for i in items}
    eq_map = {str(e["_id"]): e for e in await db.equipment.find({"_id": {"$in": list(eq_ids)}}).to_list(1000)} if eq_ids else {}
    cust_map = {str(c["_id"]): c for c in await db.customers.find({"_id": {"$in": list(cust_ids)}}).to_list(1000)} if cust_ids else {}
    return [serialize_rental(i, eq_map.get(i["equipment_id"]), cust_map.get(i["customer_id"])) for i in items]


@api.post("/rentals")
async def create_rental(payload: RentalIn, user: dict = Depends(get_current_user)):
    eq = await db.equipment.find_one({"_id": ObjectId(payload.equipment_id)})
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")
    cust = await db.customers.find_one({"_id": ObjectId(payload.customer_id)})
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    avail = eq.get("available", eq.get("quantity", 1))
    if payload.quantity > avail:
        raise HTTPException(status_code=400, detail=f"Only {avail} available for {eq['name']}")
    doc = payload.model_dump()
    doc["status"] = "active"
    doc["daily_rate"] = doc.get("daily_rate") or eq.get("daily_rate", 0)
    doc["created_at"] = now_utc()
    doc["created_by"] = str(user["_id"])
    res = await db.rentals.insert_one(doc)
    doc["_id"] = res.inserted_id
    # decrement availability
    await db.equipment.update_one({"_id": eq["_id"]}, {"$inc": {"available": -payload.quantity}})
    return serialize_rental(doc, eq, cust)


@api.post("/rentals/{rental_id}/return")
async def return_rental(rental_id: str, payload: RentalReturnIn, user: dict = Depends(get_current_user)):
    rental = await db.rentals.find_one({"_id": ObjectId(rental_id)})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    if rental.get("status") == "returned":
        raise HTTPException(status_code=400, detail="Rental already returned")
    update = {
        "status": "returned" if payload.condition_on_return != "lost" else "lost",
        "return_date": payload.return_date,
        "condition_on_return": payload.condition_on_return,
        "damage_fee": payload.damage_fee,
        "notes": (rental.get("notes") or "") + ("\nReturn: " + payload.notes if payload.notes else ""),
    }
    await db.rentals.update_one({"_id": rental["_id"]}, {"$set": update})
    # restore available qty (unless lost - keep removed and reduce inventory)
    if payload.condition_on_return == "lost":
        await db.equipment.update_one(
            {"_id": ObjectId(rental["equipment_id"])},
            {"$inc": {"quantity": -rental["quantity"]}},
        )
    else:
        await db.equipment.update_one(
            {"_id": ObjectId(rental["equipment_id"])},
            {"$inc": {"available": rental["quantity"]}},
        )
        if payload.condition_on_return in ("fair", "poor", "damaged"):
            await db.equipment.update_one(
                {"_id": ObjectId(rental["equipment_id"])},
                {"$set": {"condition": "fair" if payload.condition_on_return == "fair" else "poor"}},
            )
    rental.update(update)
    return serialize_rental(rental)


# ----------------------------- Maintenance -----------------------------
def serialize_maint(doc: dict, eq: Optional[dict] = None) -> dict:
    return {
        "id": str(doc["_id"]),
        "equipment_id": doc["equipment_id"],
        "equipment_name": (eq or {}).get("name") if eq else doc.get("equipment_name"),
        "service_date": doc["service_date"],
        "service_type": doc["service_type"],
        "performed_by": doc.get("performed_by"),
        "cost": doc.get("cost", 0),
        "next_service_date": doc.get("next_service_date"),
        "notes": doc.get("notes"),
        "created_at": doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


@api.get("/maintenance")
async def list_maintenance(user: dict = Depends(get_current_user)):
    items = await db.maintenance.find({}).sort("service_date", -1).to_list(1000)
    eq_ids = {ObjectId(i["equipment_id"]) for i in items}
    eq_map = {str(e["_id"]): e for e in await db.equipment.find({"_id": {"$in": list(eq_ids)}}).to_list(1000)} if eq_ids else {}
    return [serialize_maint(i, eq_map.get(i["equipment_id"])) for i in items]


@api.post("/maintenance")
async def create_maintenance(payload: MaintenanceIn, user: dict = Depends(get_current_user)):
    eq = await db.equipment.find_one({"_id": ObjectId(payload.equipment_id)})
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")
    doc = payload.model_dump()
    doc["created_at"] = now_utc()
    res = await db.maintenance.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_maint(doc, eq)


# ----------------------------- Bookings (pipeline) --------------------
def serialize_booking(doc: dict, eq: Optional[dict] = None) -> dict:
    return {
        "id": str(doc["_id"]),
        "customer_name": doc["customer_name"],
        "customer_id": doc.get("customer_id"),
        "contact": doc.get("contact"),
        "equipment_id": doc["equipment_id"],
        "equipment_name": (eq or {}).get("name") if eq else doc.get("equipment_name"),
        "quantity": doc.get("quantity", 1),
        "tentative_start_date": doc["tentative_start_date"],
        "tentative_end_date": doc["tentative_end_date"],
        "is_delivery": doc.get("is_delivery", False),
        "delivery_address": doc.get("delivery_address"),
        "estimated_value": doc.get("estimated_value", 0),
        "probability": doc.get("probability", "warm"),
        "status": doc.get("status", "tentative"),
        "notes": doc.get("notes"),
        "converted_rental_id": doc.get("converted_rental_id"),
        "created_at": doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


@api.get("/bookings")
async def list_bookings(status_filter: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if status_filter:
        q["status"] = status_filter
    items = await db.bookings.find(q).sort("tentative_start_date", 1).to_list(1000)
    eq_ids = {ObjectId(i["equipment_id"]) for i in items if i.get("equipment_id")}
    eq_map = {str(e["_id"]): e for e in await db.equipment.find({"_id": {"$in": list(eq_ids)}}).to_list(1000)} if eq_ids else {}
    return [serialize_booking(i, eq_map.get(i["equipment_id"])) for i in items]


@api.post("/bookings")
async def create_booking(payload: BookingIn, user: dict = Depends(get_current_user)):
    eq = await db.equipment.find_one({"_id": ObjectId(payload.equipment_id)})
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")
    if payload.tentative_end_date < payload.tentative_start_date:
        raise HTTPException(status_code=400, detail="End date must be on or after start date")
    doc = payload.model_dump()
    doc["status"] = "tentative"
    doc["created_at"] = now_utc()
    doc["created_by"] = str(user["_id"])
    res = await db.bookings.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_booking(doc, eq)


@api.patch("/bookings/{booking_id}")
async def update_booking(booking_id: str, payload: BookingIn, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("status") == "confirmed":
        raise HTTPException(status_code=400, detail="Cannot edit a confirmed booking — edit its rental instead")
    update = payload.model_dump()
    await db.bookings.update_one({"_id": booking["_id"]}, {"$set": update})
    booking.update(update)
    eq = await db.equipment.find_one({"_id": ObjectId(booking["equipment_id"])})
    return serialize_booking(booking, eq)


@api.delete("/bookings/{booking_id}")
async def cancel_booking(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("status") == "confirmed":
        raise HTTPException(status_code=400, detail="Booking already confirmed — cancel its rental instead")
    await db.bookings.update_one({"_id": booking["_id"]}, {"$set": {"status": "cancelled"}})
    return {"ok": True}


@api.post("/bookings/{booking_id}/confirm")
async def confirm_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Promote a tentative booking into a real rental. Decrements equipment availability."""
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("status") != "tentative":
        raise HTTPException(status_code=400, detail=f"Booking status is '{booking.get('status')}' — only tentative bookings can be confirmed")

    eq = await db.equipment.find_one({"_id": ObjectId(booking["equipment_id"])})
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment no longer exists")

    qty = booking.get("quantity", 1)
    avail = eq.get("available", eq.get("quantity", 1))
    if qty > avail:
        raise HTTPException(status_code=400, detail=f"Only {avail} available — booking needs {qty}")

    # resolve customer: link existing or create from booking customer_name
    customer_id = booking.get("customer_id")
    if not customer_id:
        existing = await db.customers.find_one({"name": booking["customer_name"]})
        if existing:
            customer_id = str(existing["_id"])
        else:
            cust_doc = {
                "name": booking["customer_name"],
                "phone": booking.get("contact") if booking.get("contact") and "@" not in (booking.get("contact") or "") else None,
                "email": booking.get("contact") if booking.get("contact") and "@" in (booking.get("contact") or "") else None,
                "created_at": now_utc(),
            }
            res_c = await db.customers.insert_one(cust_doc)
            customer_id = str(res_c.inserted_id)

    rental_doc = {
        "customer_id": customer_id,
        "equipment_id": booking["equipment_id"],
        "quantity": qty,
        "start_date": booking["tentative_start_date"],
        "due_date": booking["tentative_end_date"],
        "deposit": 0,
        "daily_rate": eq.get("daily_rate", 0),
        "notes": (booking.get("notes") or "") + f" (Converted from booking #{booking_id})",
        "status": "active",
        "created_at": now_utc(),
        "created_by": str(user["_id"]),
        "from_booking_id": booking_id,
    }
    res = await db.rentals.insert_one(rental_doc)
    rental_doc["_id"] = res.inserted_id

    await db.equipment.update_one({"_id": eq["_id"]}, {"$inc": {"available": -qty}})
    await db.bookings.update_one(
        {"_id": booking["_id"]},
        {"$set": {"status": "confirmed", "converted_rental_id": str(res.inserted_id), "confirmed_at": now_utc()}},
    )

    cust = await db.customers.find_one({"_id": ObjectId(customer_id)})
    return {
        "rental": serialize_rental(rental_doc, eq, cust),
        "booking_id": booking_id,
    }


# ----------------------------- Dashboard -------------------------------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    total_eq = await db.equipment.count_documents({})
    eq_docs = await db.equipment.find({}).to_list(2000)
    total_units = sum(e.get("quantity", 1) for e in eq_docs)
    available_units = sum(e.get("available", e.get("quantity", 1)) for e in eq_docs)
    on_rent = total_units - available_units
    active_rentals = await db.rentals.count_documents({"status": "active"})

    today_iso = now_utc().date().isoformat()
    overdue = await db.rentals.count_documents({"status": "active", "due_date": {"$lt": today_iso}})

    # Due in next 7 days
    soon = (now_utc() + timedelta(days=7)).date().isoformat()
    due_soon = await db.rentals.count_documents({"status": "active", "due_date": {"$gte": today_iso, "$lte": soon}})

    # Maintenance due
    maint_due = await db.maintenance.count_documents({"next_service_date": {"$lte": today_iso}})

    # Bookings pipeline
    tentative_bookings = await db.bookings.count_documents({"status": "tentative"})
    soon_starts = await db.bookings.count_documents({
        "status": "tentative",
        "tentative_start_date": {"$gte": today_iso, "$lte": soon},
    })

    # Recent calculations
    recent_calcs = await db.calculations.find({}).sort("created_at", -1).limit(5).to_list(5)
    recent = [{
        "type": c["type"],
        "user": c.get("user_email", ""),
        "created_at": c["created_at"].isoformat() if isinstance(c["created_at"], datetime) else c["created_at"],
    } for c in recent_calcs]

    # Inventory by category
    cat_breakdown = {}
    for e in eq_docs:
        cat_breakdown[e["category"]] = cat_breakdown.get(e["category"], 0) + e.get("quantity", 1)

    return {
        "total_equipment_skus": total_eq,
        "total_units": total_units,
        "available_units": available_units,
        "on_rent_units": on_rent,
        "active_rentals": active_rentals,
        "overdue_rentals": overdue,
        "due_soon_rentals": due_soon,
        "maintenance_due": maint_due,
        "tentative_bookings": tentative_bookings,
        "bookings_starting_soon": soon_starts,
        "recent_calculations": recent,
        "category_breakdown": [{"category": k, "count": v} for k, v in cat_breakdown.items()],
    }


# ----------------------------- App wiring ------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "*"), "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("icf-hub")


async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@icfhub.com").lower()
    pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "email": email,
            "password_hash": hash_password(pw),
            "name": "Admin",
            "role": "admin",
            "created_at": now_utc(),
        })
        logger.info(f"Seeded admin: {email}")
    elif not verify_password(pw, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(pw)}})
        logger.info("Admin password updated from .env")

    # seed a foreman test user
    fm_email = "foreman@icfhub.com"
    if not await db.users.find_one({"email": fm_email}):
        await db.users.insert_one({
            "email": fm_email,
            "password_hash": hash_password("foreman123"),
            "name": "Mike Foreman",
            "role": "foreman",
            "created_at": now_utc(),
        })


async def seed_demo_inventory():
    if await db.equipment.count_documents({}) > 0:
        return
    samples = [
        {"name": "Wafer Brace - 9ft", "category": "brace", "condition": "good", "location": "Yard A", "daily_rate": 4.50, "quantity": 200},
        {"name": "Strongback Brace - 12ft", "category": "strongback", "condition": "good", "location": "Yard A", "daily_rate": 7.25, "quantity": 80},
        {"name": "Waler 8ft Aluminum", "category": "waler", "condition": "excellent", "location": "Yard B", "daily_rate": 3.00, "quantity": 150},
        {"name": "Turnbuckle Brace 14ft", "category": "brace", "condition": "good", "location": "Yard A", "daily_rate": 6.50, "quantity": 60},
        {"name": "Alignment Tool Set", "category": "alignment", "condition": "good", "location": "Shop", "daily_rate": 12.00, "quantity": 12},
        {"name": "Scaffold Plank 16ft", "category": "scaffold", "condition": "fair", "location": "Yard B", "daily_rate": 2.50, "quantity": 100},
        {"name": "Concrete Vibrator", "category": "tool", "condition": "good", "location": "Shop", "daily_rate": 35.00, "quantity": 5},
    ]
    for s in samples:
        s["available"] = s["quantity"]
        s["created_at"] = now_utc()
    await db.equipment.insert_many(samples)
    # demo customer
    if await db.customers.count_documents({}) == 0:
        await db.customers.insert_many([
            {"name": "Big Sky Concrete", "company": "Big Sky Concrete LLC", "phone": "555-0101", "email": "ops@bigsky.com", "address": "Bozeman, MT", "created_at": now_utc()},
            {"name": "Stonebridge Homes", "company": "Stonebridge Homes Inc.", "phone": "555-0144", "email": "build@stonebridge.com", "address": "Boise, ID", "created_at": now_utc()},
        ])


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.equipment.create_index("name")
    await db.rentals.create_index("status")
    await db.rentals.create_index("due_date")
    await db.maintenance.create_index("next_service_date")
    await db.bookings.create_index("status")
    await db.bookings.create_index("tentative_start_date")
    await seed_admin()
    await seed_demo_inventory()


@app.on_event("shutdown")
async def shutdown():
    client.close()


@api.get("/")
async def root():
    return {"name": "ICF Operations Hub API", "version": "1.0"}
