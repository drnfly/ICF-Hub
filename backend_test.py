#!/usr/bin/env python3

import asyncio
import httpx
import json
import uuid
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://gitpull-preview.preview.emergentagent.com/api"

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
        success = await test_contractor_intake_flow()
        if success:
            print("\n🎉 BACKEND TESTING COMPLETE - ALL REQUIREMENTS VALIDATED")
            return True
        else:
            print("\n❌ BACKEND TESTING FAILED - REQUIREMENTS NOT MET")
            return False
    except Exception as e:
        print(f"\n💥 BACKEND TESTING ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(main())
    exit(0 if result else 1)