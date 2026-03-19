#!/usr/bin/env python3
"""
Backend API Testing - Find Contractor Intake Flow + 5 Free Questions Gate
Testing the sequential conversation flow with proper requirements validation.
"""

import asyncio
import httpx
import uuid
import json
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://gitpull-preview.preview.emergentagent.com/api"

class IntakeChatFlowTest:
    def __init__(self):
        self.session_id = str(uuid.uuid4())
        self.client = httpx.AsyncClient(timeout=30.0)
        self.test_results = {
            "location_step": None,
            "project_stage_step": None,
            "questions_1_to_5": [],
            "question_6_upgrade": None,
            "response_structure": None,
            "debug_responses": False
        }
    
    async def send_chat_message(self, message: str):
        """Send a chat message to the intake endpoint"""
        try:
            response = await self.client.post(
                f"{BACKEND_URL}/intake/chat",
                json={
                    "message": message,
                    "session_id": self.session_id
                },
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Message sent: '{message[:50]}...'")
                print(f"   Response: '{data.get('response', '')[:80]}...'")
                print(f"   Status: answered_questions={data.get('answered_questions', 0)}, remaining={data.get('free_questions_remaining', 0)}, requires_upgrade={data.get('requires_upgrade', False)}")
                return data
            else:
                print(f"❌ HTTP {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Request failed: {e}")
            return None
    
    async def test_step_1_location(self):
        """Test Step 1: First message should be treated as location"""
        print("\n=== STEP 1: Location Collection ===")
        response = await self.send_chat_message("Denver, Colorado")
        
        if response:
            # Should ask for project stage next
            expected_keywords = ["project", "stage", "idea", "design", "permits", "build"]
            response_lower = response.get("response", "").lower()
            
            if any(keyword in response_lower for keyword in expected_keywords):
                self.test_results["location_step"] = "PASS"
                print("✅ PASS: Assistant correctly asked for project stage")
            else:
                self.test_results["location_step"] = "FAIL"
                print("❌ FAIL: Assistant didn't ask for project stage")
                print(f"   Got response: {response.get('response')}")
            
            # Validate response structure
            self.validate_response_structure(response, step="location")
        else:
            self.test_results["location_step"] = "FAIL"
            print("❌ FAIL: No response received")
    
    async def test_step_2_project_stage(self):
        """Test Step 2: Second message should be treated as project stage"""
        print("\n=== STEP 2: Project Stage Collection ===")
        response = await self.send_chat_message("Design phase - I have blueprints ready")
        
        if response:
            # Should confirm and invite questions
            response_lower = response.get("response", "").lower()
            expected_keywords = ["perfect", "help", "questions", "free", "expert", "5"]
            
            if any(keyword in response_lower for keyword in expected_keywords):
                self.test_results["project_stage_step"] = "PASS"
                print("✅ PASS: Assistant confirmed and invited questions")
            else:
                self.test_results["project_stage_step"] = "FAIL"
                print("❌ FAIL: Assistant didn't properly confirm and invite questions")
                print(f"   Got response: {response.get('response')}")
            
            # Validate response structure
            self.validate_response_structure(response, step="project_stage")
        else:
            self.test_results["project_stage_step"] = "FAIL"
            print("❌ FAIL: No response received")
    
    async def test_questions_1_to_5(self):
        """Test Questions 1-5: Should answer normally"""
        print("\n=== STEPS 3-7: Questions 1 through 5 ===")
        
        questions = [
            "What's the typical cost per square foot for ICF construction?",
            "How long does ICF construction take compared to traditional framing?",
            "What permits do I need for ICF construction in Colorado?",
            "What should I look for when choosing an ICF contractor?",
            "What are the energy efficiency benefits of ICF homes?"
        ]
        
        for i, question in enumerate(questions, 1):
            print(f"\n--- Question {i} ---")
            response = await self.send_chat_message(question)
            
            if response:
                # Should provide an answer (not upgrade message)
                requires_upgrade = response.get("requires_upgrade", False)
                answered_questions = response.get("answered_questions", 0)
                remaining = response.get("free_questions_remaining", 0)
                
                if not requires_upgrade and answered_questions == i and remaining == (5 - i):
                    self.test_results["questions_1_to_5"].append(f"Q{i}: PASS")
                    print(f"✅ PASS: Question {i} answered normally")
                else:
                    self.test_results["questions_1_to_5"].append(f"Q{i}: FAIL")
                    print(f"❌ FAIL: Question {i} - unexpected upgrade requirement or counts")
                    print(f"   requires_upgrade={requires_upgrade}, answered={answered_questions}, remaining={remaining}")
                
                # Validate response structure
                self.validate_response_structure(response, step=f"question_{i}")
            else:
                self.test_results["questions_1_to_5"].append(f"Q{i}: FAIL")
                print(f"❌ FAIL: Question {i} - No response received")
    
    async def test_question_6_upgrade(self):
        """Test Question 6: Should trigger upgrade requirement"""
        print("\n=== STEP 8: Question 6 (Upgrade Required) ===")
        
        response = await self.send_chat_message("Can you help me create a construction timeline and budget breakdown?")
        
        if response:
            requires_upgrade = response.get("requires_upgrade", False)
            answered_questions = response.get("answered_questions", 0)
            remaining = response.get("free_questions_remaining", 0)
            response_text = response.get("response", "")
            
            # Should require upgrade, have 5 answered questions, 0 remaining
            if requires_upgrade and answered_questions == 5 and remaining == 0:
                # Check if response mentions upgrade
                if "upgrade" in response_text.lower() and "5 free" in response_text.lower():
                    self.test_results["question_6_upgrade"] = "PASS"
                    print("✅ PASS: Question 6 correctly triggered upgrade requirement")
                else:
                    self.test_results["question_6_upgrade"] = "FAIL"
                    print("❌ FAIL: Question 6 triggered upgrade but wrong message")
                    print(f"   Response: {response_text}")
            else:
                self.test_results["question_6_upgrade"] = "FAIL"
                print("❌ FAIL: Question 6 didn't trigger upgrade correctly")
                print(f"   requires_upgrade={requires_upgrade}, answered={answered_questions}, remaining={remaining}")
            
            # Validate response structure
            self.validate_response_structure(response, step="question_6")
        else:
            self.test_results["question_6_upgrade"] = "FAIL"
            print("❌ FAIL: Question 6 - No response received")
    
    def validate_response_structure(self, response, step):
        """Validate that response contains all required fields"""
        required_fields = ["response", "session_id", "is_complete", "requires_upgrade", "answered_questions", "free_questions_remaining", "summary"]
        
        missing_fields = []
        for field in required_fields:
            if field not in response:
                missing_fields.append(field)
        
        if not missing_fields:
            if self.test_results["response_structure"] is None:
                self.test_results["response_structure"] = "PASS"
                print(f"✅ Response structure valid (checked at {step})")
        else:
            self.test_results["response_structure"] = "FAIL"
            print(f"❌ FAIL: Response structure missing fields: {missing_fields} (at {step})")
    
    async def check_for_debug_responses(self):
        """Check if any debug/placeholder responses remain"""
        # This should already be covered by the individual tests
        # but we'll flag it separately if we see obvious debug text
        pass
    
    async def run_full_test(self):
        """Run the complete intake flow test"""
        print("🚀 STARTING FIND CONTRACTOR INTAKE FLOW TEST")
        print(f"Session ID: {self.session_id}")
        print(f"Backend URL: {BACKEND_URL}")
        
        try:
            await self.test_step_1_location()
            await self.test_step_2_project_stage()
            await self.test_questions_1_to_5()
            await self.test_question_6_upgrade()
            await self.check_for_debug_responses()
            
        except Exception as e:
            print(f"❌ Test execution failed: {e}")
        
        finally:
            await self.client.aclose()
        
        self.print_final_results()
    
    def print_final_results(self):
        """Print comprehensive test results"""
        print("\n" + "="*70)
        print("📋 FIND CONTRACTOR INTAKE FLOW - TEST RESULTS")
        print("="*70)
        
        print(f"Session ID: {self.session_id}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        
        results = []
        
        # Location step
        if self.test_results["location_step"] == "PASS":
            print("✅ Step 1 - Location Collection: PASS")
            results.append("✅ Location → Project Stage")
        else:
            print("❌ Step 1 - Location Collection: FAIL")
            results.append("❌ Location → Project Stage")
        
        # Project stage step
        if self.test_results["project_stage_step"] == "PASS":
            print("✅ Step 2 - Project Stage Collection: PASS")
            results.append("✅ Project Stage → Questions Invitation")
        else:
            print("❌ Step 2 - Project Stage Collection: FAIL")
            results.append("❌ Project Stage → Questions Invitation")
        
        # Questions 1-5
        passed_questions = len([q for q in self.test_results["questions_1_to_5"] if "PASS" in q])
        print(f"✅ Questions 1-5: {passed_questions}/5 passed")
        for q_result in self.test_results["questions_1_to_5"]:
            if "PASS" in q_result:
                print(f"  ✅ {q_result}")
            else:
                print(f"  ❌ {q_result}")
        results.append(f"{'✅' if passed_questions == 5 else '❌'} Questions 1-5 ({passed_questions}/5)")
        
        # Question 6 upgrade
        if self.test_results["question_6_upgrade"] == "PASS":
            print("✅ Question 6 - Upgrade Trigger: PASS")
            results.append("✅ Question 6 → Upgrade Required")
        else:
            print("❌ Question 6 - Upgrade Trigger: FAIL")
            results.append("❌ Question 6 → Upgrade Required")
        
        # Response structure
        if self.test_results["response_structure"] == "PASS":
            print("✅ Response Structure: PASS")
            results.append("✅ All required fields present")
        else:
            print("❌ Response Structure: FAIL")
            results.append("❌ Missing required fields")
        
        # Overall result
        print("\n" + "-"*70)
        total_tests = 8  # location, project_stage, 5 questions, upgrade trigger
        passed_tests = sum([
            1 if self.test_results["location_step"] == "PASS" else 0,
            1 if self.test_results["project_stage_step"] == "PASS" else 0,
            passed_questions,
            1 if self.test_results["question_6_upgrade"] == "PASS" else 0
        ])
        
        if passed_tests == total_tests and self.test_results["response_structure"] == "PASS":
            print("🎉 OVERALL RESULT: ALL TESTS PASSED")
            print("✅ Find Contractor Intake Flow is working correctly")
        else:
            print("🚨 OVERALL RESULT: SOME TESTS FAILED")
            print(f"   Passed: {passed_tests}/{total_tests} core tests")
            if self.test_results["response_structure"] != "PASS":
                print("   ❌ Response structure issues detected")
        
        print("\n📝 SUMMARY FOR test_result.md:")
        print("   " + " | ".join(results))
        print("="*70)

async def main():
    """Main test execution"""
    test = IntakeChatFlowTest()
    await test.run_full_test()

if __name__ == "__main__":
    asyncio.run(main())