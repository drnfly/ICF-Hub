#!/usr/bin/env python3

import requests
import json
import os
import base64
from pathlib import Path

def load_backend_url():
    """Load backend URL from frontend .env file"""
    frontend_env_path = Path("/app/frontend/.env")
    if frontend_env_path.exists():
        with open(frontend_env_path, 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    return "http://localhost:8001"

def test_takeoff_overlay_image_fix():
    """Test the latest takeoff backend fix for preview_image_data_url"""
    backend_url = load_backend_url()
    
    print(f"🔍 Testing takeoff overlay image fix against: {backend_url}")
    print("=" * 60)
    
    # Test with the specific PDF file mentioned in review request
    test_pdf_path = "/tmp/3.pdf"
    if not os.path.exists(test_pdf_path):
        print(f"❌ ERROR: Test PDF not found at {test_pdf_path}")
        return False
    
    url = f"{backend_url}/api/takeoff/analyze"
    
    try:
        with open(test_pdf_path, 'rb') as pdf_file:
            files = {'file': ('3.pdf', pdf_file, 'application/pdf')}
            data = {'format': 'pdf'}
            
            print(f"📤 Uploading {test_pdf_path} to /api/takeoff/analyze...")
            response = requests.post(url, files=files, data=data, timeout=60)
            
        print(f"📊 HTTP Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ API call failed with status {response.status_code}")
            print(f"📝 Response: {response.text}")
            return False
        
        try:
            result = response.json()
        except json.JSONDecodeError:
            print("❌ Response is not valid JSON")
            print(f"📝 Raw response: {response.text}")
            return False
        
        print("✅ API call successful! Analyzing response...")
        print()
        
        # Test 1: Check if preview_image_data_url is present and starts with correct prefix
        print("🔸 TEST 1: preview_image_data_url format validation")
        preview_data_url = result.get('preview_image_data_url')
        if not preview_data_url:
            print("❌ FAIL: preview_image_data_url field is missing")
            return False
        
        if not preview_data_url.startswith('data:image/png;base64,'):
            print(f"❌ FAIL: preview_image_data_url does not start with 'data:image/png;base64,'")
            print(f"   Actual prefix: {preview_data_url[:50]}...")
            return False
        
        print("✅ PASS: preview_image_data_url has correct format")
        
        # Test 2: Check if preview_image_data_url is non-empty and large enough
        print("🔸 TEST 2: preview_image_data_url size validation")
        base64_data = preview_data_url.replace('data:image/png;base64,', '')
        
        if not base64_data:
            print("❌ FAIL: preview_image_data_url base64 data is empty")
            return False
        
        try:
            decoded_data = base64.b64decode(base64_data)
            data_size = len(decoded_data)
            
            # Check if data is large enough to be a renderable image (at least 1KB)
            if data_size < 1024:
                print(f"❌ FAIL: preview_image_data_url data too small ({data_size} bytes), likely not renderable")
                return False
            
            print(f"✅ PASS: preview_image_data_url contains {data_size:,} bytes of image data")
            
        except Exception as e:
            print(f"❌ FAIL: Cannot decode base64 data: {e}")
            return False
        
        # Test 3: Check if other required fields are still present
        print("🔸 TEST 3: Required fields validation")
        required_fields = ['summary', 'walls', 'source_pages_used']
        missing_fields = []
        
        for field in required_fields:
            if field not in result:
                missing_fields.append(field)
        
        if missing_fields:
            print(f"❌ FAIL: Missing required fields: {missing_fields}")
            return False
        
        # Validate summary structure
        summary = result.get('summary', {})
        summary_required = ['total_linear_feet', 'net_wall_sqft', 'opening_count', 'ceiling_height_ft']
        missing_summary_fields = [f for f in summary_required if f not in summary]
        
        if missing_summary_fields:
            print(f"❌ FAIL: Missing summary fields: {missing_summary_fields}")
            return False
        
        print("✅ PASS: All required fields present")
        
        # Test 4: No backend errors (already validated by successful 200 response)
        print("🔸 TEST 4: Backend error validation")
        print("✅ PASS: No backend errors (status 200)")
        
        # Display key metrics for verification
        print()
        print("📊 RESPONSE SUMMARY:")
        print(f"   • Total Linear Feet: {summary.get('total_linear_feet', 'N/A')}")
        print(f"   • Net Wall Sqft: {summary.get('net_wall_sqft', 'N/A')}")
        print(f"   • Opening Count: {summary.get('opening_count', 'N/A')}")
        print(f"   • Ceiling Height: {summary.get('ceiling_height_ft', 'N/A')} ft")
        print(f"   • Number of Walls: {len(result.get('walls', []))}")
        print(f"   • Source Pages Used: {result.get('source_pages_used', 'N/A')}")
        print(f"   • Preview Image Data: {len(base64_data):,} base64 chars")
        
        # Also check if preview_image_url is still present (should be)
        if 'preview_image_url' in result:
            print(f"   • Preview Image URL: {result['preview_image_url']}")
        
        print()
        print("🎉 ALL TESTS PASSED! Overlay image fix working correctly.")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_takeoff_overlay_image_fix()
    exit(0 if success else 1)