#!/usr/bin/env python3
"""
Backend API Test Suite for ICF Hub
Focus: Backend Boot After Zip Import validation

Tests:
1. Backend health and stability
2. AI chat/intake endpoints (no more 503 "AI service not configured")
3. Upload URL configuration (no localhost fallback)
4. Core API functionality
"""

import asyncio
import httpx
import json
import os
import uuid
from pathlib import Path

# Get backend URL from frontend env
FRONTEND_ENV = Path("/app/frontend/.env")
BACKEND_URL = "http://187.124.66.30:8001"

if FRONTEND_ENV.exists():
    with open(FRONTEND_ENV) as f:
        for line in f:
            if line.strip().startswith("REACT_APP_BACKEND_URL="):
                BACKEND_URL = line.strip().split("=", 1)[1].strip('"')
                break

API_BASE = f"{BACKEND_URL}/api"

class TestResults:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.critical_failures = []

    def log_pass(self, test_name, details=""):
        print(f"✅ PASS: {test_name}")
        if details:
            print(f"   {details}")
        self.passed.append((test_name, details))

    def log_fail(self, test_name, error, is_critical=False):
        status = "❌ CRITICAL" if is_critical else "❌ FAIL"
        print(f"{status}: {test_name}")
        print(f"   Error: {error}")
        if is_critical:
            self.critical_failures.append((test_name, error))
        else:
            self.failed.append((test_name, error))

    def summary(self):
        total = len(self.passed) + len(self.failed) + len(self.critical_failures)
        print(f"\n{'='*50}")
        print(f"TEST SUMMARY: {len(self.passed)}/{total} passed")
        print(f"Critical failures: {len(self.critical_failures)}")
        print(f"Non-critical failures: {len(self.failed)}")
        
        if self.critical_failures:
            print(f"\n🔥 CRITICAL ISSUES:")
            for test, error in self.critical_failures:
                print(f"   - {test}: {error}")
        
        if self.failed:
            print(f"\n⚠️ MINOR ISSUES:")
            for test, error in self.failed:
                print(f"   - {test}: {error}")

results = TestResults()

async def test_backend_health():
    """Test basic backend connectivity and health"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_BASE}/health", timeout=10)
            if response.status_code == 200:
                results.log_pass("Backend Health Check", f"Status: {response.status_code}")
                return True
            else:
                results.log_fail("Backend Health Check", f"Status: {response.status_code}", is_critical=True)
                return False
    except Exception as e:
        results.log_fail("Backend Health Check", str(e), is_critical=True)
        return False

async def test_ai_intake_chat():
    """Test AI intake chat system - should no longer return 503"""
    try:
        session_id = str(uuid.uuid4())
        chat_data = {
            "message": "Hello, my name is John Smith from Denver, CO. Email: john@test.com",
            "session_id": session_id
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{API_BASE}/intake/chat", json=chat_data, timeout=30)
            
            if response.status_code == 503:
                results.log_fail("AI Intake Chat", "Still returning 503 'AI service not configured'", is_critical=True)
                return False
            elif response.status_code == 500 and "AI service not configured" in response.text:
                results.log_fail("AI Intake Chat", "AI service not configured error", is_critical=True)
                return False
            elif response.status_code == 200:
                data = response.json()
                if "response" in data:
                    results.log_pass("AI Intake Chat", f"AI responded: {data['response'][:100]}...")
                    return True
                else:
                    results.log_fail("AI Intake Chat", "Invalid response format")
                    return False
            else:
                results.log_fail("AI Intake Chat", f"Status: {response.status_code}, Body: {response.text}")
                return False
                
    except Exception as e:
        results.log_fail("AI Intake Chat", str(e), is_critical=True)
        return False

async def test_regular_chat():
    """Test regular chat endpoint - should no longer return 503"""
    try:
        session_id = str(uuid.uuid4())
        chat_data = {
            "message": "What are the benefits of ICF construction?",
            "session_id": session_id
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{API_BASE}/chat", json=chat_data, timeout=30)
            
            if response.status_code == 503:
                results.log_fail("Regular Chat", "Still returning 503 'AI service not configured'", is_critical=True)
                return False
            elif response.status_code == 500 and "AI service not configured" in response.text:
                results.log_fail("Regular Chat", "AI service not configured error", is_critical=True)
                return False
            elif response.status_code == 200:
                data = response.json()
                if "response" in data:
                    results.log_pass("Regular Chat", f"AI responded: {data['response'][:100]}...")
                    return True
                else:
                    results.log_fail("Regular Chat", "Invalid response format")
                    return False
            else:
                results.log_fail("Regular Chat", f"Status: {response.status_code}, Body: {response.text}")
                return False
                
    except Exception as e:
        results.log_fail("Regular Chat", str(e), is_critical=True)
        return False

async def test_file_upload_urls():
    """Test file upload URL configuration - should not return localhost URLs"""
    try:
        # Create a minimal test file
        test_file_content = b"test image content"
        files = {"file": ("test.png", test_file_content, "image/png")}
        form_data = {"session_id": str(uuid.uuid4())}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{API_BASE}/intake/upload", files=files, data=form_data, timeout=20)
            
            if response.status_code == 200:
                data = response.json()
                file_url = data.get("url", "")
                
                if "localhost" in file_url:
                    results.log_fail("File Upload URL", f"Still using localhost: {file_url}", is_critical=True)
                    return False
                elif BACKEND_URL.replace("http://", "").replace("https://", "") in file_url:
                    results.log_pass("File Upload URL", f"Correctly using configured URL: {file_url}")
                    return True
                else:
                    results.log_fail("File Upload URL", f"Unexpected URL format: {file_url}")
                    return False
            else:
                results.log_fail("File Upload URL", f"Upload failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        results.log_fail("File Upload URL", str(e))
        return False

async def test_takeoff_upload_urls():
    """Test takeoff upload URL configuration"""
    try:
        # Create a minimal test file
        test_file_content = b"test blueprint content"
        files = {"file": ("blueprint.png", test_file_content, "image/png")}
        form_data = {"format": "imperial", "wall_height": "8"}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{API_BASE}/takeoff/analyze", files=files, data=form_data, timeout=20)
            
            if response.status_code == 200:
                data = response.json()
                file_url = data.get("file_url", "")
                
                if "localhost" in file_url:
                    results.log_fail("Takeoff Upload URL", f"Still using localhost: {file_url}")
                    return False
                elif BACKEND_URL.replace("http://", "").replace("https://", "") in file_url:
                    results.log_pass("Takeoff Upload URL", f"Correctly using configured URL: {file_url}")
                    return True
                else:
                    results.log_fail("Takeoff Upload URL", f"Unexpected URL format: {file_url}")
                    return False
            else:
                results.log_fail("Takeoff Upload URL", f"Upload failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        results.log_fail("Takeoff Upload URL", str(e))
        return False

async def test_contractor_auth():
    """Test contractor registration and login"""
    try:
        # Test registration
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        reg_data = {
            "company_name": "Test ICF Company",
            "email": email,
            "password": "testpass123",
            "phone": "555-0123",
            "city": "Denver",
            "state": "CO"
        }
        
        async with httpx.AsyncClient() as client:
            reg_response = await client.post(f"{API_BASE}/auth/register", json=reg_data, timeout=10)
            
            if reg_response.status_code == 200:
                reg_result = reg_response.json()
                token = reg_result.get("token")
                
                if token:
                    # Test login
                    login_data = {"email": email, "password": "testpass123"}
                    login_response = await client.post(f"{API_BASE}/auth/login", json=login_data, timeout=10)
                    
                    if login_response.status_code == 200:
                        results.log_pass("Contractor Auth", "Registration and login working")
                        return True
                    else:
                        results.log_fail("Contractor Auth", f"Login failed: {login_response.status_code}")
                        return False
                else:
                    results.log_fail("Contractor Auth", "No token in registration response")
                    return False
            else:
                results.log_fail("Contractor Auth", f"Registration failed: {reg_response.status_code}")
                return False
                
    except Exception as e:
        results.log_fail("Contractor Auth", str(e))
        return False

async def test_leads_creation():
    """Test leads creation endpoint"""
    try:
        lead_data = {
            "name": "Jane Doe",
            "email": "jane@example.com", 
            "phone": "555-0456",
            "city": "Boulder",
            "state": "CO",
            "project_type": "new_home",
            "project_size": "2000_2500_sqft",
            "budget_range": "400k_500k",
            "timeline": "6_months",
            "description": "Looking to build ICF home"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{API_BASE}/leads", json=lead_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data:
                    results.log_pass("Leads Creation", f"Created lead with ID: {data['id']}")
                    return True
                else:
                    results.log_fail("Leads Creation", "No ID in response")
                    return False
            else:
                results.log_fail("Leads Creation", f"Status: {response.status_code}")
                return False
                
    except Exception as e:
        results.log_fail("Leads Creation", str(e))
        return False

async def test_stats_endpoint():
    """Test stats endpoint"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_BASE}/stats", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "contractors" in data and "leads" in data:
                    results.log_pass("Stats Endpoint", f"Returns: {data}")
                    return True
                else:
                    results.log_fail("Stats Endpoint", "Missing expected fields")
                    return False
            else:
                results.log_fail("Stats Endpoint", f"Status: {response.status_code}")
                return False
                
    except Exception as e:
        results.log_fail("Stats Endpoint", str(e))
        return False

async def test_content_generation():
    """Test AI content generation - depends on AI service"""
    try:
        # First create a contractor account
        email = f"content_test_{uuid.uuid4().hex[:8]}@example.com"
        reg_data = {
            "company_name": "Content Test Company",
            "email": email,
            "password": "testpass123"
        }
        
        async with httpx.AsyncClient() as client:
            reg_response = await client.post(f"{API_BASE}/auth/register", json=reg_data, timeout=10)
            
            if reg_response.status_code == 200:
                token = reg_response.json().get("token")
                headers = {"Authorization": f"Bearer {token}"}
                
                content_data = {
                    "platform": "facebook",
                    "content_type": "educational",
                    "topic": "ICF benefits",
                    "tone": "professional",
                    "count": 1
                }
                
                content_response = await client.post(f"{API_BASE}/content/generate", json=content_data, headers=headers, timeout=30)
                
                if content_response.status_code == 503:
                    results.log_fail("Content Generation", "AI service not configured", is_critical=True)
                    return False
                elif content_response.status_code == 200:
                    results.log_pass("Content Generation", "AI content generation working")
                    return True
                else:
                    results.log_fail("Content Generation", f"Status: {content_response.status_code}")
                    return False
            else:
                results.log_fail("Content Generation", "Could not create test contractor")
                return False
                
    except Exception as e:
        results.log_fail("Content Generation", str(e))
        return False

async def main():
    print(f"🧪 BACKEND TEST SUITE")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    print("="*50)
    
    # Critical tests (related to the fix focus)
    print("\n🔥 CRITICAL TESTS (Fix Validation)")
    await test_backend_health()
    await test_ai_intake_chat()
    await test_regular_chat()
    await test_file_upload_urls()
    await test_takeoff_upload_urls()
    
    # Core API tests
    print("\n⚙️ CORE API TESTS")
    await test_contractor_auth()
    await test_leads_creation()
    await test_stats_endpoint()
    await test_content_generation()
    
    # Final summary
    results.summary()
    
    # Exit with proper code
    if results.critical_failures:
        print(f"\n❌ CRITICAL FAILURES DETECTED - Backend has blockers")
        return False
    else:
        print(f"\n✅ ALL CRITICAL TESTS PASSED - Backend is stable")
        return True

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)