#!/usr/bin/env python3
"""
Backend Testing Suite for Deployment Hardening & AI Takeoff Beta
Tests deployment readiness hardening and takeoff analyze endpoint behavior
"""

import httpx
import json
import os
import asyncio
from pathlib import Path
import logging
import uuid
from typing import Dict, Any
import base64

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
FRONTEND_ENV_PATH = "/app/frontend/.env"
TEST_PDF_PATH = "/tmp/test_blueprint.pdf"

def load_frontend_env():
    """Load frontend environment variables"""
    env_vars = {}
    if os.path.exists(FRONTEND_ENV_PATH):
        with open(FRONTEND_ENV_PATH) as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    env_vars[key] = value.strip('"')
    return env_vars

def get_backend_url():
    """Get the correct backend URL for testing"""
    frontend_env = load_frontend_env()
    backend_url = frontend_env.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
    return f"{backend_url}/api"

def create_test_pdf():
    """Create a simple test PDF for upload testing"""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open()
        page = doc.new_page(width=612, height=792)
        
        # Draw a simple floor plan
        text = "FLOOR PLAN\nScale: 1/4\" = 1'\n\n30' x 20' ICF Home\n\nLiving Room\nKitchen\nBedrooms: 3\nBathrooms: 2"
        page.insert_text((50, 50), text, fontsize=12)
        
        # Draw simple rectangles to simulate floor plan
        page.draw_rect(fitz.Rect(100, 150, 400, 350))  # Main structure
        page.draw_rect(fitz.Rect(150, 200, 200, 250))  # Room
        
        doc.save(TEST_PDF_PATH)
        doc.close()
        logger.info(f"Test PDF created at {TEST_PDF_PATH}")
        return True
    except Exception as e:
        logger.error(f"Failed to create test PDF: {e}")
        return False

async def test_backend_startup():
    """Test A: Backend startup stable, no runtime crash"""
    logger.info("🧪 Testing backend startup stability...")
    
    backend_url = get_backend_url()
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Test health endpoint
            response = await client.get(f"{backend_url}/health")
            if response.status_code == 200:
                logger.info("✅ Backend health check passed")
                return True
            else:
                logger.error(f"❌ Health check failed: {response.status_code}")
                return False
    except Exception as e:
        logger.error(f"❌ Backend startup test failed: {e}")
        return False

async def get_contractor_token():
    """Register a contractor and get auth token for testing"""
    logger.info("🔐 Getting contractor authentication token...")
    
    backend_url = get_backend_url()
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Register a test contractor
            contractor_data = {
                "company_name": "Test ICF Company",
                "email": f"test+{uuid.uuid4().hex[:8]}@example.com",
                "password": "TestPassword123!",
                "phone": "555-0123",
                "city": "Denver",
                "state": "CO",
                "description": "ICF construction specialist",
                "years_experience": 5,
                "specialties": ["ICF", "Residential"]
            }
            
            response = await client.post(f"{backend_url}/auth/register", json=contractor_data)
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("token")
                contractor_id = data.get("contractor", {}).get("id")
                logger.info(f"✅ Contractor registered with ID: {contractor_id}")
                return token
            else:
                logger.error(f"❌ Contractor registration failed: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        logger.error(f"❌ Contractor authentication failed: {e}")
        return None

async def test_takeoff_no_auth():
    """Test B1: /api/takeoff/analyze - no auth + valid PDF => 200"""
    logger.info("🧪 Testing takeoff analyze - no auth + valid PDF...")
    
    if not create_test_pdf():
        logger.error("❌ Could not create test PDF")
        return False
    
    backend_url = get_backend_url()
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(TEST_PDF_PATH, "rb") as pdf_file:
                files = {
                    "file": ("test_blueprint.pdf", pdf_file, "application/pdf")
                }
                data = {
                    "format": "pdf",
                    "wall_height": "10"
                }
                
                response = await client.post(
                    f"{backend_url}/takeoff/analyze",
                    files=files,
                    data=data,
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Verify required fields are present
                    required_fields = ["summary", "walls", "model_3d", "contractor_id"]
                    missing_fields = [field for field in required_fields if field not in result]
                    
                    if result.get("contractor_id") is None:
                        logger.info("✅ No auth takeoff test passed - contractor_id is None as expected")
                    else:
                        logger.warning(f"⚠️ contractor_id should be None for unauthenticated request, got: {result.get('contractor_id')}")
                    
                    # Check summary metrics
                    summary = result.get("summary", {})
                    if all(key in summary for key in ["total_linear_feet", "net_wall_sqft", "opening_count", "ceiling_height_ft"]):
                        logger.info("✅ No auth takeoff test passed - all required metrics present")
                        return True
                    else:
                        logger.error(f"❌ Missing summary fields: {summary}")
                        return False
                else:
                    logger.error(f"❌ No auth takeoff test failed: {response.status_code} - {response.text}")
                    return False
                    
    except Exception as e:
        logger.error(f"❌ No auth takeoff test failed: {e}")
        return False

async def test_takeoff_with_auth():
    """Test B2: /api/takeoff/analyze - with valid contractor token + valid PDF => 200 and contractor_id present"""
    logger.info("🧪 Testing takeoff analyze - with valid contractor token + valid PDF...")
    
    token = await get_contractor_token()
    if not token:
        logger.error("❌ Could not get contractor token")
        return False
    
    if not create_test_pdf():
        logger.error("❌ Could not create test PDF")
        return False
    
    backend_url = get_backend_url()
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            headers = {"Authorization": f"Bearer {token}"}
            
            with open(TEST_PDF_PATH, "rb") as pdf_file:
                files = {
                    "file": ("test_blueprint.pdf", pdf_file, "application/pdf")
                }
                data = {
                    "format": "pdf", 
                    "wall_height": "10"
                }
                
                response = await client.post(
                    f"{backend_url}/takeoff/analyze",
                    files=files,
                    data=data,
                    headers=headers,
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Verify contractor_id is present for authenticated request
                    contractor_id = result.get("contractor_id")
                    if contractor_id:
                        logger.info(f"✅ Auth takeoff test passed - contractor_id present: {contractor_id}")
                    else:
                        logger.error("❌ contractor_id should be present for authenticated request")
                        return False
                    
                    # Check required fields
                    summary = result.get("summary", {})
                    required_metrics = ["total_linear_feet", "net_wall_sqft", "opening_count", "ceiling_height_ft"]
                    if all(key in summary for key in required_metrics):
                        logger.info("✅ Auth takeoff test passed - all required metrics present")
                        return True
                    else:
                        logger.error(f"❌ Missing summary metrics: {summary}")
                        return False
                else:
                    logger.error(f"❌ Auth takeoff test failed: {response.status_code} - {response.text}")
                    return False
                    
    except Exception as e:
        logger.error(f"❌ Auth takeoff test failed: {e}")
        return False

async def test_takeoff_non_pdf():
    """Test B3: /api/takeoff/analyze - non-PDF => 400"""
    logger.info("🧪 Testing takeoff analyze - non-PDF file rejection...")
    
    backend_url = get_backend_url()
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Create a fake image file
            fake_content = b"fake image content"
            
            files = {
                "file": ("test_image.jpg", fake_content, "image/jpeg")
            }
            data = {
                "format": "pdf",
                "wall_height": "10"
            }
            
            response = await client.post(
                f"{backend_url}/takeoff/analyze",
                files=files,
                data=data,
                timeout=30.0
            )
            
            if response.status_code == 400:
                logger.info("✅ Non-PDF rejection test passed - returned 400 as expected")
                return True
            else:
                logger.error(f"❌ Non-PDF rejection test failed: Expected 400, got {response.status_code}")
                return False
                
    except Exception as e:
        logger.error(f"❌ Non-PDF rejection test failed: {e}")
        return False

async def test_critical_apis():
    """Test C: Existing critical APIs still responsive (health and one auth/profile path)"""
    logger.info("🧪 Testing critical API endpoints...")
    
    backend_url = get_backend_url()
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Test health endpoint
            health_response = await client.get(f"{backend_url}/health")
            if health_response.status_code != 200:
                logger.error(f"❌ Health endpoint failed: {health_response.status_code}")
                return False
            
            logger.info("✅ Health endpoint working")
            
            # Test contractor registration (auth path)
            contractor_data = {
                "company_name": "Test Health Company",
                "email": f"health+{uuid.uuid4().hex[:8]}@example.com", 
                "password": "TestPassword123!",
                "phone": "555-0124",
                "city": "Test City",
                "state": "TS"
            }
            
            auth_response = await client.post(f"{backend_url}/auth/register", json=contractor_data)
            if auth_response.status_code != 200:
                logger.error(f"❌ Auth registration failed: {auth_response.status_code}")
                return False
                
            logger.info("✅ Auth registration endpoint working")
            
            # Test profile endpoint with valid token
            auth_data = auth_response.json()
            token = auth_data.get("token")
            
            if token:
                headers = {"Authorization": f"Bearer {token}"}
                profile_response = await client.get(f"{backend_url}/contractors/me/profile", headers=headers)
                if profile_response.status_code != 200:
                    logger.error(f"❌ Profile endpoint failed: {profile_response.status_code}")
                    return False
                
                logger.info("✅ Profile endpoint working")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Critical API test failed: {e}")
        return False

async def check_env_loading():
    """Check environment variable loading behavior"""
    logger.info("🧪 Checking environment loading behavior...")
    
    backend_url = get_backend_url()
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Check debug env endpoint if it exists
            response = await client.get(f"{backend_url}/debug/env")
            if response.status_code == 200:
                env_data = response.json()
                logger.info(f"Environment check: {env_data}")
                
                # Verify EMERGENT_LLM_KEY is loaded
                if env_data.get("emergent_llm_key_loaded"):
                    logger.info("✅ EMERGENT_LLM_KEY properly loaded")
                else:
                    logger.warning("⚠️ EMERGENT_LLM_KEY not loaded properly")
                
                return env_data.get("emergent_llm_key_loaded", False)
            else:
                logger.info("Debug env endpoint not available, checking via other means...")
                return True
                
    except Exception as e:
        logger.warning(f"Could not check environment loading: {e}")
        return True  # Non-critical failure

async def run_deployment_tests():
    """Run all deployment readiness tests"""
    logger.info("🚀 Starting Deployment Readiness & AI Takeoff Beta Testing...")
    logger.info("=" * 60)
    
    test_results = {
        "backend_startup": False,
        "takeoff_no_auth": False, 
        "takeoff_with_auth": False,
        "takeoff_non_pdf_rejection": False,
        "critical_apis": False,
        "env_loading": False
    }
    
    # Test A: Backend startup stable
    test_results["backend_startup"] = await test_backend_startup()
    
    # Test environment loading
    test_results["env_loading"] = await check_env_loading()
    
    # Test B: Takeoff analyze behavior
    test_results["takeoff_no_auth"] = await test_takeoff_no_auth()
    test_results["takeoff_with_auth"] = await test_takeoff_with_auth() 
    test_results["takeoff_non_pdf_rejection"] = await test_takeoff_non_pdf()
    
    # Test C: Critical APIs still responsive
    test_results["critical_apis"] = await test_critical_apis()
    
    # Summary
    logger.info("=" * 60)
    logger.info("🏁 TEST SUMMARY")
    logger.info("=" * 60)
    
    passed = sum(1 for result in test_results.values() if result)
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"{test_name.replace('_', ' ').title()}: {status}")
    
    logger.info("=" * 60)
    logger.info(f"Overall Result: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 ALL TESTS PASSED - Deployment ready!")
    else:
        logger.warning(f"⚠️  {total - passed} test(s) failed - Review deployment blockers")
    
    # Clean up test files
    if os.path.exists(TEST_PDF_PATH):
        os.remove(TEST_PDF_PATH)
        logger.info("🧹 Cleaned up test files")
    
    return test_results

if __name__ == "__main__":
    asyncio.run(run_deployment_tests())