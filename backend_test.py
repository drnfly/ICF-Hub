#!/usr/bin/env python3
"""
Backend Testing Suite for AI Takeoff Beta Feature
Tests PDF parsing, wall metrics, and authentication requirements
"""

import requests
import json
import os
import uuid
from pathlib import Path
import time

# Test against local runtime target as specified in review request
BACKEND_URL = 'http://localhost:8001'
API_BASE = f"{BACKEND_URL}/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'

def log(message, color=None):
    if color:
        print(f"{color}{message}{Colors.ENDC}")
    else:
        print(message)

def test_health_check():
    """Test basic backend health check"""
    log("\n=== Testing Backend Health Check ===", Colors.BLUE)
    try:
        response = requests.get(f"{API_BASE}/health", timeout=10)
        if response.status_code == 200:
            log("✅ Health check passed", Colors.GREEN)
            return True
        else:
            log(f"❌ Health check failed: {response.status_code}", Colors.RED)
            return False
    except Exception as e:
        log(f"❌ Health check failed: {e}", Colors.RED)
        return False

def get_contractor_auth_token():
    """Get an authentication token for testing"""
    log("\n=== Getting Contractor Authentication Token ===", Colors.BLUE)
    
    # First try to login with existing test user
    login_data = {
        "email": "test.contractor@example.com",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/login", json=login_data, timeout=10)
        if response.status_code == 200:
            token = response.json()["token"]
            log("✅ Login successful", Colors.GREEN)
            return token
    except:
        pass
    
    # If login fails, register new contractor
    log("Login failed, registering new test contractor...", Colors.YELLOW)
    register_data = {
        "company_name": "Test Takeoff Contractor",
        "email": "test.contractor@example.com",
        "password": "testpass123",
        "phone": "555-0123",
        "city": "Test City",
        "state": "CO",
        "description": "ICF Takeoff Testing",
        "years_experience": 5,
        "specialties": ["ICF Construction"]
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/register", json=register_data, timeout=10)
        if response.status_code == 200:
            token = response.json()["token"]
            log("✅ Registration successful", Colors.GREEN)
            return token
        else:
            log(f"❌ Registration failed: {response.text}", Colors.RED)
            return None
    except Exception as e:
        log(f"❌ Registration error: {e}", Colors.RED)
        return None

def test_takeoff_auth_required():
    """Test that takeoff endpoint requires contractor authentication"""
    log("\n=== Testing Takeoff Authentication Requirements ===", Colors.BLUE)
    
    # Create a dummy PDF file for testing
    test_pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n178\n%%EOF"
    
    files = {
        'file': ('test_plan.pdf', test_pdf_content, 'application/pdf')
    }
    data = {
        'format': 'pdf',
        'wall_height': '10'
    }
    
    # Test 1: No authorization header
    log("Testing without authorization header...")
    try:
        response = requests.post(f"{API_BASE}/takeoff/analyze", files=files, data=data, timeout=30)
        if response.status_code == 401:
            log("✅ Correctly rejected unauthenticated request", Colors.GREEN)
            auth_test_1 = True
        else:
            log(f"❌ Expected 401, got {response.status_code}: {response.text}", Colors.RED)
            auth_test_1 = False
    except Exception as e:
        log(f"❌ Request failed: {e}", Colors.RED)
        auth_test_1 = False
    
    # Test 2: Invalid authorization header
    log("Testing with invalid authorization header...")
    try:
        headers = {'Authorization': 'Bearer invalid-token'}
        response = requests.post(f"{API_BASE}/takeoff/analyze", files=files, data=data, headers=headers, timeout=30)
        if response.status_code == 401:
            log("✅ Correctly rejected invalid token", Colors.GREEN)
            auth_test_2 = True
        else:
            log(f"❌ Expected 401, got {response.status_code}: {response.text}", Colors.RED)
            auth_test_2 = False
    except Exception as e:
        log(f"❌ Request failed: {e}", Colors.RED)
        auth_test_2 = False
    
    return auth_test_1 and auth_test_2

def test_takeoff_pdf_validation(auth_token):
    """Test that takeoff endpoint only accepts PDF files"""
    log("\n=== Testing PDF File Validation ===", Colors.BLUE)
    
    headers = {'Authorization': f'Bearer {auth_token}'}
    
    # Test 1: Non-PDF file should be rejected
    log("Testing rejection of non-PDF file...")
    non_pdf_content = b"This is not a PDF file"
    files = {
        'file': ('test.txt', non_pdf_content, 'text/plain')
    }
    data = {
        'format': 'pdf',
        'wall_height': '10'
    }
    
    try:
        response = requests.post(f"{API_BASE}/takeoff/analyze", files=files, data=data, headers=headers, timeout=30)
        if response.status_code == 400 and "PDF" in response.text:
            log("✅ Correctly rejected non-PDF file", Colors.GREEN)
            pdf_test_1 = True
        else:
            log(f"❌ Expected 400 with PDF error, got {response.status_code}: {response.text}", Colors.RED)
            pdf_test_1 = False
    except Exception as e:
        log(f"❌ Request failed: {e}", Colors.RED)
        pdf_test_1 = False
    
    # Test 2: File with PDF extension but wrong content
    log("Testing file with .pdf extension but non-PDF content...")
    files = {
        'file': ('fake.pdf', non_pdf_content, 'application/pdf')
    }
    
    try:
        response = requests.post(f"{API_BASE}/takeoff/analyze", files=files, data=data, headers=headers, timeout=30)
        if response.status_code == 400:
            log("✅ Correctly rejected fake PDF file", Colors.GREEN) 
            pdf_test_2 = True
        else:
            log(f"❌ Expected 400, got {response.status_code}: {response.text}", Colors.RED)
            pdf_test_2 = False
    except Exception as e:
        log(f"❌ Request failed: {e}", Colors.RED)
        pdf_test_2 = False
    
    return pdf_test_1 and pdf_test_2

def test_takeoff_pdf_analysis(auth_token):
    """Test PDF analysis and response structure"""
    log("\n=== Testing PDF Analysis and Response Structure ===", Colors.BLUE)
    
    headers = {'Authorization': f'Bearer {auth_token}'}
    
    # Create a more complete test PDF
    test_pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Floor Plan) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
0000000179 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
262
%%EOF"""
    
    files = {
        'file': ('floor_plan.pdf', test_pdf_content, 'application/pdf')
    }
    data = {
        'format': 'pdf',
        'wall_height': '10'
    }
    
    log("Analyzing PDF with takeoff endpoint...")
    try:
        response = requests.post(f"{API_BASE}/takeoff/analyze", files=files, data=data, headers=headers, timeout=60)
        
        if response.status_code != 200:
            log(f"❌ Analysis failed: {response.status_code} - {response.text}", Colors.RED)
            return False
        
        result = response.json()
        log("✅ PDF analysis completed successfully", Colors.GREEN)
        
        # Validate required response structure
        required_fields = [
            'summary',
            'walls', 
            'model_3d',
            'file_url',
            'filename',
            'contractor_id'
        ]
        
        missing_fields = []
        for field in required_fields:
            if field not in result:
                missing_fields.append(field)
        
        if missing_fields:
            log(f"❌ Missing required fields: {missing_fields}", Colors.RED)
            return False
        
        # Validate summary structure
        required_summary_fields = [
            'total_linear_feet',
            'net_wall_sqft', 
            'opening_count',
            'ceiling_height_ft'
        ]
        
        summary = result.get('summary', {})
        missing_summary_fields = []
        for field in required_summary_fields:
            if field not in summary:
                missing_summary_fields.append(field)
        
        if missing_summary_fields:
            log(f"❌ Missing summary fields: {missing_summary_fields}", Colors.RED)
            return False
        
        log("✅ All required response fields present", Colors.GREEN)
        
        # Check if walls array exists
        walls = result.get('walls', [])
        if not isinstance(walls, list):
            log("❌ 'walls' should be an array", Colors.RED)
            return False
        
        log(f"✅ Found {len(walls)} wall(s) in analysis", Colors.GREEN)
        
        # Check model_3d structure
        model_3d = result.get('model_3d', {})
        if 'walls' not in model_3d:
            log("❌ 'model_3d.walls' missing", Colors.RED)
            return False
        
        model_walls = model_3d.get('walls', [])
        log(f"✅ Found {len(model_walls)} 3D model wall(s)", Colors.GREEN)
        
        # Print sample response structure for verification
        log("\n--- Sample Response Structure ---", Colors.YELLOW)
        print(f"Summary total_linear_feet: {summary.get('total_linear_feet')}")
        print(f"Summary net_wall_sqft: {summary.get('net_wall_sqft')}")
        print(f"Summary opening_count: {summary.get('opening_count')}")
        print(f"Summary ceiling_height_ft: {summary.get('ceiling_height_ft')}")
        print(f"Walls count: {len(walls)}")
        print(f"Model 3D walls count: {len(model_walls)}")
        print(f"Contractor ID: {result.get('contractor_id')}")
        
        return True
        
    except Exception as e:
        log(f"❌ Analysis failed with exception: {e}", Colors.RED)
        return False

def test_ai_service_integration():
    """Test that AI service is properly configured"""
    log("\n=== Testing AI Service Integration ===", Colors.BLUE)
    
    # Check debug endpoint that shows AI service status
    try:
        response = requests.get(f"{API_BASE}/debug/env", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('emergent_llm_key_loaded'):
                log("✅ AI service key is loaded", Colors.GREEN)
                log(f"Key length: {data.get('emergent_llm_key_length')}", Colors.YELLOW)
                return True
            else:
                log("❌ AI service key not loaded", Colors.RED)
                return False
        else:
            log(f"❌ Debug endpoint failed: {response.status_code}", Colors.RED)
            return False
    except Exception as e:
        log(f"❌ Debug request failed: {e}", Colors.RED)
        return False

def main():
    """Run all takeoff backend tests"""
    log("=" * 60, Colors.BLUE)
    log("AI TAKEOFF BETA - BACKEND TESTING SUITE", Colors.BLUE) 
    log("=" * 60, Colors.BLUE)
    
    test_results = {}
    
    # Test 1: Backend Health
    test_results['health'] = test_health_check()
    
    # Test 2: AI Service Integration
    test_results['ai_service'] = test_ai_service_integration()
    
    # Test 3: Get Authentication
    auth_token = get_contractor_auth_token()
    test_results['auth_token'] = bool(auth_token)
    
    if not auth_token:
        log("\n❌ Cannot proceed with takeoff tests - no auth token", Colors.RED)
        return
    
    # Test 4: Authentication Requirements
    test_results['auth_required'] = test_takeoff_auth_required()
    
    # Test 5: PDF Validation
    test_results['pdf_validation'] = test_takeoff_pdf_validation(auth_token)
    
    # Test 6: PDF Analysis (Main feature test)
    test_results['pdf_analysis'] = test_takeoff_pdf_analysis(auth_token)
    
    # Summary
    log("\n" + "=" * 60, Colors.BLUE)
    log("TEST SUMMARY", Colors.BLUE)
    log("=" * 60, Colors.BLUE)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        color = Colors.GREEN if result else Colors.RED
        log(f"{test_name.replace('_', ' ').title()}: {status}", color)
        if result:
            passed += 1
    
    log(f"\nOverall: {passed}/{total} tests passed", Colors.YELLOW)
    
    if passed == total:
        log("🎉 ALL TESTS PASSED - Takeoff feature is working!", Colors.GREEN)
        return True
    else:
        log("⚠️  Some tests failed - see details above", Colors.RED)
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)