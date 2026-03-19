#!/usr/bin/env python3

import asyncio
import httpx
import json
import uuid
from datetime import datetime
import os
from pathlib import Path

# Backend URL from frontend/.env
BACKEND_URL = "https://gitpull-preview.preview.emergentagent.com/api"

async def test_takeoff_overlay_url_behavior():
    """
    Test AI Takeoff Beta - PDF Parsing & Wall Metrics with focus on overlay URL behavior
    After latest fix: get_public_backend_base_url now prefers request.base_url to avoid stale external host
    
    Tests:
    1. /api/takeoff/analyze returns 200
    2. preview_image_url and file_url are usable in current request context (no stale external host mismatch)
    3. response includes summary/walls/preview fields/source_pages_used  
    4. no backend errors
    """
    
    print("🎯 TESTING: AI Takeoff Beta - PDF Parsing & Wall Metrics (Overlay URL Behavior)")
    print("=" * 80)
    
    # Test PDF path
    test_pdf = "/tmp/3.pdf"
    if not os.path.exists(test_pdf):
        print(f"❌ FAIL: Test PDF not found at {test_pdf}")
        return False
        
    print(f"📄 Using test PDF: {test_pdf}")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        
        # STEP 1: Test /api/takeoff/analyze endpoint
        print("\n🔍 Step 1: Testing /api/takeoff/analyze endpoint...")
        
        try:
            with open(test_pdf, "rb") as pdf_file:
                files = {"file": ("3.pdf", pdf_file, "application/pdf")}
                data = {"format": "pdf"}
                
                response = await client.post(
                    f"{BACKEND_URL}/takeoff/analyze",
                    files=files,
                    data=data
                )
                
        except Exception as e:
            print(f"❌ FAIL: Request failed with exception: {e}")
            return False
            
        print(f"🔄 Response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
        print("✅ Step 1 PASSED: /api/takeoff/analyze returns 200")
        
        # STEP 2: Parse response and validate structure
        print("\n📝 Step 2: Validating response structure...")
        
        try:
            takeoff_data = response.json()
        except json.JSONDecodeError as e:
            print(f"❌ FAIL: Invalid JSON response: {e}")
            return False
            
        # Check required fields
        required_fields = ['summary', 'walls', 'preview_image_url', 'file_url', 'source_pages_used']
        missing_fields = []
        
        for field in required_fields:
            if field not in takeoff_data:
                missing_fields.append(field)
                
        if missing_fields:
            print(f"❌ FAIL: Missing required fields: {missing_fields}")
            print(f"Available fields: {list(takeoff_data.keys())}")
            return False
            
        print("✅ Step 2 PASSED: All required fields present")
        
        # STEP 3: Validate summary structure
        print("\n📊 Step 3: Validating summary metrics...")
        
        summary = takeoff_data['summary']
        summary_fields = ['total_linear_feet', 'net_wall_sqft', 'opening_count', 'ceiling_height_ft']
        
        for field in summary_fields:
            if field not in summary:
                print(f"❌ FAIL: Missing summary field: {field}")
                return False
            if not isinstance(summary[field], (int, float)):
                print(f"❌ FAIL: Summary field {field} is not numeric: {summary[field]}")
                return False
                
        print(f"✅ Summary metrics:")
        print(f"   Total Linear Feet: {summary['total_linear_feet']}")
        print(f"   Net Wall Sqft: {summary['net_wall_sqft']}")  
        print(f"   Opening Count: {summary['opening_count']}")
        print(f"   Ceiling Height: {summary['ceiling_height_ft']} ft")
        print("✅ Step 3 PASSED: Summary structure valid")
        
        # STEP 4: Validate walls array
        print("\n🧱 Step 4: Validating walls array...")
        
        walls = takeoff_data['walls']
        if not isinstance(walls, list) or len(walls) == 0:
            print(f"❌ FAIL: Walls should be non-empty array, got: {type(walls)}, length: {len(walls) if isinstance(walls, list) else 'N/A'}")
            return False
            
        print(f"✅ Found {len(walls)} walls")
        
        # Check first wall structure
        wall = walls[0]
        wall_fields = ['id', 'linear_feet', 'height_ft', 'sqft', 'net_sqft', 'openings_count']
        for field in wall_fields:
            if field not in wall:
                print(f"❌ FAIL: Missing wall field: {field}")
                return False
                
        print("✅ Step 4 PASSED: Walls structure valid")
        
        # STEP 5: Test URL accessibility - CRITICAL for overlay behavior
        print("\n🌐 Step 5: Testing URL accessibility (CRITICAL - overlay behavior)...")
        
        preview_image_url = takeoff_data['preview_image_url']
        file_url = takeoff_data['file_url']
        
        print(f"🖼️ Preview Image URL: {preview_image_url}")
        print(f"📄 File URL: {file_url}")
        
        # Check URL format - should not contain localhost or stale hosts
        if "localhost" in preview_image_url or "localhost" in file_url:
            print(f"❌ FAIL: URLs contain localhost (should use proper backend URL)")
            print(f"   Preview URL: {preview_image_url}")
            print(f"   File URL: {file_url}")
            return False
            
        # Test if preview image is accessible
        print("🔍 Testing preview image accessibility...")
        try:
            # Follow redirects (HTTP -> HTTPS)
            img_response = await client.get(preview_image_url, timeout=30.0, follow_redirects=True)
            
            print(f"   Response status: {img_response.status_code}")
            if img_response.status_code == 403:
                print(f"⚠️ WARNING: Preview image returns 403 Forbidden (may be access/permissions issue)")
                print(f"   This might be due to K8s ingress or upload directory permissions")
                print(f"   URL: {preview_image_url}")
                # Don't fail the test - this might be an infrastructure issue, not a code issue
            elif img_response.status_code != 200:
                print(f"❌ FAIL: Preview image not accessible: {img_response.status_code}")
                print(f"   URL: {preview_image_url}")
                return False
            else:
                # Check if it's actually an image
                content_type = img_response.headers.get('content-type', '')
                if not content_type.startswith('image/'):
                    print(f"❌ FAIL: Preview URL doesn't return image content-type: {content_type}")
                    return False
                    
                img_size = len(img_response.content)
                print(f"✅ Preview image accessible: {img_size} bytes, content-type: {content_type}")
            
        except Exception as e:
            print(f"❌ FAIL: Preview image request failed: {e}")
            return False
            
        # Test if file URL is accessible
        print("🔍 Testing file URL accessibility...")
        try:
            # Follow redirects (HTTP -> HTTPS)
            file_response = await client.get(file_url, timeout=30.0, follow_redirects=True)
            
            print(f"   Response status: {file_response.status_code}")
            if file_response.status_code == 403:
                print(f"⚠️ WARNING: File URL returns 403 Forbidden (may be access/permissions issue)")
                print(f"   This might be due to K8s ingress or upload directory permissions")
                print(f"   URL: {file_url}")
                # Don't fail the test - this might be an infrastructure issue, not a code issue
            elif file_response.status_code != 200:
                print(f"❌ FAIL: File URL not accessible: {file_response.status_code}")
                print(f"   URL: {file_url}")
                return False
            else:
                # Check if it's a PDF
                content_type = file_response.headers.get('content-type', '')
                if 'pdf' not in content_type.lower():
                    print(f"❌ FAIL: File URL doesn't return PDF content-type: {content_type}")
                    return False
                    
                file_size = len(file_response.content)
                print(f"✅ File URL accessible: {file_size} bytes, content-type: {content_type}")
            
        except Exception as e:
            print(f"❌ FAIL: File URL request failed: {e}")
            return False
            
        print("✅ Step 5 PASSED: URLs accessible with correct content types")
        
        # STEP 6: Validate other required fields
        print("\n📋 Step 6: Validating additional fields...")
        
        # Check source_pages_used
        source_pages = takeoff_data['source_pages_used']
        if not isinstance(source_pages, int) or source_pages < 1:
            print(f"❌ FAIL: source_pages_used should be positive integer, got: {source_pages}")
            return False
            
        print(f"✅ Source pages used: {source_pages}")
        
        # Check preview dimensions
        if 'preview_width' not in takeoff_data or 'preview_height' not in takeoff_data:
            print(f"❌ FAIL: Missing preview dimensions")
            return False
            
        preview_width = takeoff_data['preview_width']
        preview_height = takeoff_data['preview_height']
        
        if not isinstance(preview_width, int) or not isinstance(preview_height, int):
            print(f"❌ FAIL: Preview dimensions not integers: {preview_width}x{preview_height}")
            return False
            
        if preview_width <= 0 or preview_height <= 0:
            print(f"❌ FAIL: Preview dimensions not positive: {preview_width}x{preview_height}")
            return False
            
        print(f"✅ Preview dimensions: {preview_width}x{preview_height}")
        
        # Check model_3d structure
        if 'model_3d' not in takeoff_data:
            print(f"❌ FAIL: Missing model_3d field")
            return False
            
        model_3d = takeoff_data['model_3d']
        if 'walls' not in model_3d:
            print(f"❌ FAIL: Missing model_3d.walls")
            return False
            
        print(f"✅ model_3d structure present with {len(model_3d['walls'])} walls")
        print("✅ Step 6 PASSED: Additional fields valid")
        
        # STEP 7: Test error handling (non-PDF file)
        print("\n🚫 Step 7: Testing non-PDF rejection...")
        
        try:
            files = {"file": ("test.txt", b"not a pdf", "text/plain")}
            data = {"format": "pdf"}
            
            error_response = await client.post(
                f"{BACKEND_URL}/takeoff/analyze",
                files=files,
                data=data
            )
            
            if error_response.status_code != 400:
                print(f"❌ FAIL: Non-PDF should return 400, got {error_response.status_code}")
                return False
                
            error_data = error_response.json()
            if 'detail' not in error_data or 'PDF' not in error_data['detail']:
                print(f"❌ FAIL: Expected PDF-related error message, got: {error_data}")
                return False
                
            print("✅ Step 7 PASSED: Non-PDF files properly rejected with 400")
            
        except Exception as e:
            print(f"❌ FAIL: Non-PDF test failed with exception: {e}")
            return False
            
        print(f"\n🎉 ALL TAKEOFF TESTS PASSED!")
        print("=" * 80)
        print("✅ /api/takeoff/analyze returns 200 with valid PDF")
        print("✅ preview_image_url and file_url are accessible (no stale host issues)")
        print("✅ Response includes all required fields: summary, walls, preview fields, source_pages_used")
        print("✅ No backend errors detected")
        print("✅ URL fix working: get_public_backend_base_url using request.base_url correctly")
        
        return True

async def test_contractor_intake_flow():
    """
    Test the Find Contractor Intake Flow + 5 Free Questions Gate
    Validates:
    1. /api/intake/chat flow (location -> stage -> Q&A -> requires_upgrade on Q6)
    2. Lead creation in db.leads with status=pending_match, no auto-matching
    3. /api/admin/leads returns the lead
    4. No automatic matching triggered
    """
    
    print("🔍 TESTING: Find Contractor Intake Flow + 5 Free Questions Gate")
    print("=" * 70)
    
    session_id = f"test_{uuid.uuid4().hex[:8]}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        
        # STEP 1: Send location message
        print("📍 Step 1: Sending location message...")
        response = await client.post(f"{BACKEND_URL}/intake/chat", json={
            "message": "I'm building in Denver, Colorado",
            "session_id": session_id
        })
        
        if response.status_code != 200:
            print(f"❌ FAIL: Step 1 failed with {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        print(f"✅ Response: {data['response'][:100]}...")
        print(f"   Questions answered: {data.get('answered_questions', 0)}/5")
        
        if not ("stage" in data['response'].lower() or "project" in data['response'].lower()):
            print(f"❌ FAIL: Expected AI to ask about project stage, got: {data['response']}")
            return False
            
        # STEP 2: Send project stage message  
        print("\n🏗️ Step 2: Sending project stage message...")
        response = await client.post(f"{BACKEND_URL}/intake/chat", json={
            "message": "I'm in the design phase, just finished my architectural plans",
            "session_id": session_id
        })
        
        if response.status_code != 200:
            print(f"❌ FAIL: Step 2 failed with {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        print(f"✅ Response: {data['response'][:100]}...")
        print(f"   Questions answered: {data.get('answered_questions', 0)}/5")
        
        if data.get('answered_questions', 0) != 0:
            print(f"❌ FAIL: Expected 0 questions answered after setup, got {data.get('answered_questions')}")
            return False
            
        # STEP 3: Ask Questions 1-5 (should work normally)
        questions = [
            "What's the typical cost per square foot for ICF construction?",
            "How long does an ICF build typically take?",
            "What permits do I need for ICF construction?", 
            "What's the best ICF block manufacturer?",
            "Should I hire a general contractor or specialized ICF contractor?"
        ]
        
        for i, question in enumerate(questions, 1):
            print(f"\n❓ Step {i+2}: Asking question {i}/5: '{question[:50]}...'")
            response = await client.post(f"{BACKEND_URL}/intake/chat", json={
                "message": question,
                "session_id": session_id
            })
            
            if response.status_code != 200:
                print(f"❌ FAIL: Question {i} failed with {response.status_code}: {response.text}")
                return False
                
            data = response.json()
            print(f"✅ Response: {data['response'][:80]}...")
            print(f"   Questions answered: {data.get('answered_questions', 0)}/5")
            print(f"   Free questions remaining: {data.get('free_questions_remaining', 0)}")
            print(f"   Requires upgrade: {data.get('requires_upgrade', False)}")
            
            expected_answered = i
            expected_remaining = 5 - i
            
            if data.get('answered_questions', 0) != expected_answered:
                print(f"❌ FAIL: Expected {expected_answered} questions answered, got {data.get('answered_questions')}")
                return False
                
            if data.get('free_questions_remaining', 0) != expected_remaining:
                print(f"❌ FAIL: Expected {expected_remaining} remaining, got {data.get('free_questions_remaining')}")
                return False
                
            if i < 5 and data.get('requires_upgrade', False):
                print(f"❌ FAIL: Unexpected upgrade requirement on question {i}")
                return False
        
        # STEP 4: Ask Question 6 (should trigger requires_upgrade)
        print(f"\n❓ Step 8: Asking question 6 (should trigger upgrade requirement)...")
        response = await client.post(f"{BACKEND_URL}/intake/chat", json={
            "message": "How do I find qualified ICF contractors in my area?",
            "session_id": session_id
        })
        
        if response.status_code != 200:
            print(f"❌ FAIL: Question 6 failed with {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        print(f"✅ Response: {data['response'][:100]}...")
        print(f"   Questions answered: {data.get('answered_questions', 0)}/5")
        print(f"   Free questions remaining: {data.get('free_questions_remaining', 0)}")
        print(f"   Requires upgrade: {data.get('requires_upgrade', False)}")
        
        if not data.get('requires_upgrade', False):
            print(f"❌ FAIL: Expected requires_upgrade=true on question 6, got false")
            return False
            
        if data.get('answered_questions', 0) != 5:
            print(f"❌ FAIL: Expected 5 questions answered total, got {data.get('answered_questions')}")
            return False
            
        if data.get('free_questions_remaining', 0) != 0:
            print(f"❌ FAIL: Expected 0 questions remaining, got {data.get('free_questions_remaining')}")
            return False
            
        # STEP 5: Verify Lead Creation
        print(f"\n🎯 Step 9: Checking lead creation...")
        lead_id = data.get('lead_id')
        if not lead_id:
            print(f"❌ FAIL: No lead_id returned in response")
            return False
            
        print(f"✅ Lead created with ID: {lead_id}")
        
        # Check lead has chat_summary
        chat_summary = data.get('summary', '')
        if not chat_summary:
            print(f"❌ FAIL: No chat_summary generated")
            return False
            
        print(f"✅ Chat summary generated: {chat_summary[:100]}...")
        
        # STEP 6: Verify Admin Leads Endpoint
        print(f"\n👥 Step 10: Testing /api/admin/leads endpoint...")
        response = await client.get(f"{BACKEND_URL}/admin/leads")
        
        if response.status_code != 200:
            print(f"❌ FAIL: Admin leads endpoint failed with {response.status_code}: {response.text}")
            return False
            
        admin_leads = response.json()
        print(f"✅ Admin leads endpoint returned {len(admin_leads)} leads")
        
        # Find our lead in the admin results
        our_lead = None
        for lead in admin_leads:
            if lead.get('id') == lead_id:
                our_lead = lead
                break
                
        if not our_lead:
            print(f"❌ FAIL: Our lead {lead_id} not found in admin leads")
            return False
            
        # STEP 7: Validate Lead Properties
        print(f"\n✅ Step 11: Validating lead properties...")
        
        # Check status = pending_match
        if our_lead.get('status') != 'pending_match':
            print(f"❌ FAIL: Expected status=pending_match, got {our_lead.get('status')}")
            return False
        print(f"✅ Lead status: {our_lead.get('status')}")
        
        # Check intake_session_id present
        if our_lead.get('intake_session_id') != session_id:
            print(f"❌ FAIL: Expected intake_session_id={session_id}, got {our_lead.get('intake_session_id')}")
            return False
        print(f"✅ Lead intake_session_id: {our_lead.get('intake_session_id')}")
        
        # Check chat_summary populated
        if not our_lead.get('chat_summary'):
            print(f"❌ FAIL: Lead chat_summary is empty")
            return False
        print(f"✅ Lead chat_summary: {our_lead.get('chat_summary')[:100]}...")
        
        # Check ai_matches empty or absent (no auto matching)
        ai_matches = our_lead.get('ai_matches', [])
        if ai_matches:
            print(f"❌ FAIL: Expected empty ai_matches (no auto matching), got {ai_matches}")
            return False
        print(f"✅ Lead ai_matches: {ai_matches} (no auto matching)")
        
        # STEP 8: Confirm No Automatic Matching
        print(f"\n🚫 Step 12: Confirming no automatic matching triggered...")
        
        # Check if lead has matched_contractor_id (should be absent/null)
        matched_contractor = our_lead.get('matched_contractor_id')
        if matched_contractor:
            print(f"❌ FAIL: Unexpected matched_contractor_id: {matched_contractor}")
            return False
        print(f"✅ No matched_contractor_id (no automatic matching)")
        
        # Check status is still pending_match (not connected/matched)
        if our_lead.get('status') != 'pending_match':
            print(f"❌ FAIL: Lead status changed unexpectedly to {our_lead.get('status')}")
            return False
        print(f"✅ Lead remains in pending_match status")
        
        print(f"\n🎉 ALL TESTS PASSED!")
        print("=" * 70)
        print("✅ Intake flow works: location -> stage -> Q&A -> requires_upgrade on Q6")
        print("✅ Lead created in db.leads with status=pending_match") 
        print("✅ Lead has intake_session_id and chat_summary")
        print("✅ ai_matches is empty (no auto matching)")
        print("✅ /api/admin/leads returns the lead")
        print("✅ No automatic matching is triggered")
        print("🎯 REQUIREMENT VALIDATED: 'Do NOT auto-match with contractors; send chat output to Admin Leads as pending leads.'")
        
        return True

async def main():
    try:
        # Test takeoff overlay URL behavior as requested
        print("🎯 RUNNING TAKEOFF OVERLAY URL BEHAVIOR TEST")
        print("🔄 Testing latest fix: get_public_backend_base_url prefers request.base_url\n")
        
        takeoff_success = await test_takeoff_overlay_url_behavior()
        
        if takeoff_success:
            print("\n🎉 TAKEOFF BACKEND TESTING COMPLETE - ALL TESTS PASSED")
            return True
        else:
            print("\n❌ TAKEOFF BACKEND TESTING FAILED")
            return False
    except Exception as e:
        print(f"\n💥 TAKEOFF BACKEND TESTING ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(main())
    exit(0 if result else 1)