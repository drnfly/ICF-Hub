#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class ICFHubAPITester:
    def __init__(self, base_url="https://construct-connect-20.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.contractor_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)
        if self.token and 'Authorization' not in default_headers:
            default_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.content:
                    try:
                        result = response.json()
                        print(f"   Response keys: {list(result.keys()) if isinstance(result, dict) else 'Non-dict response'}")
                        return True, result
                    except:
                        return True, response.text
                return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_stats(self):
        """Test stats endpoint"""
        return self.run_test("Get Stats", "GET", "stats", 200)

    def test_contractor_register(self):
        """Test contractor registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        register_data = {
            "company_name": f"Test ICF Co {timestamp}",
            "email": f"test{timestamp}@icftest.com",
            "password": "TestPass123!",
            "phone": "(555) 123-4567",
            "city": "Austin",
            "state": "TX",
            "description": "Professional ICF contractor specializing in residential construction.",
            "years_experience": 10,
            "specialties": ["Residential", "Commercial", "Foundations"]
        }
        
        success, response = self.run_test(
            "Contractor Registration", 
            "POST", 
            "auth/register", 
            200, 
            register_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.contractor_id = response.get('contractor', {}).get('id')
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_contractor_login(self):
        """Test contractor login with existing credentials"""
        # Use the same credentials from registration for login test
        timestamp = datetime.now().strftime("%H%M%S")
        login_data = {
            "email": f"test{timestamp}@icftest.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "Contractor Login", 
            "POST", 
            "auth/login", 
            200, 
            login_data
        )
        return success

    def test_get_contractors(self):
        """Test get contractors list"""
        return self.run_test("Get Contractors List", "GET", "contractors", 200)

    def test_create_lead(self):
        """Test creating a lead"""
        timestamp = datetime.now().strftime("%H%M%S")
        lead_data = {
            "name": f"John Doe {timestamp}",
            "email": f"johndoe{timestamp}@example.com",
            "phone": "(555) 987-6543",
            "city": "Dallas",
            "state": "TX",
            "project_type": "new_home",
            "project_size": "2500_4000",
            "budget_range": "400k_700k",
            "timeline": "3_6_months",
            "description": "Looking to build a new ICF home with modern design and energy efficiency features."
        }
        
        success, response = self.run_test(
            "Create Lead", 
            "POST", 
            "leads", 
            200, 
            lead_data
        )
        
        if success and 'id' in response:
            self.lead_id = response['id']
            return True
        return False

    def test_get_leads(self):
        """Test getting leads (requires auth)"""
        if not self.token:
            print("⚠️  Skipping Get Leads - No auth token")
            return False
        
        return self.run_test("Get Leads", "GET", "leads", 200)

    def test_contractor_profile(self):
        """Test getting contractor profile (requires auth)"""
        if not self.token:
            print("⚠️  Skipping Contractor Profile - No auth token")
            return False
        
        return self.run_test("Get Contractor Profile", "GET", "contractors/me/profile", 200)

    def test_chat_functionality(self):
        """Test AI chat functionality"""
        import uuid
        session_id = f"test_{uuid.uuid4().hex[:8]}"
        
        chat_data = {
            "message": "What are the main benefits of ICF construction?",
            "session_id": session_id
        }
        
        success, response = self.run_test(
            "AI Chat Functionality", 
            "POST", 
            "chat", 
            200, 
            chat_data
        )
        
        if success and 'response' in response:
            print(f"   AI Response preview: {response['response'][:100]}...")
            return True
        return False

    def test_contact_submission(self):
        """Test contact form submission"""
        timestamp = datetime.now().strftime("%H%M%S")
        contact_data = {
            "name": f"Jane Smith {timestamp}",
            "email": f"jane{timestamp}@example.com",
            "message": "I'm interested in learning more about ICF construction options."
        }
        
        return self.run_test(
            "Contact Form Submission", 
            "POST", 
            "contact", 
            200, 
            contact_data
        )

    # ======== NEW AI AGENT FEATURE TESTS ========
    
    def test_content_generator(self):
        """Test AI Content Generator endpoint"""
        if not self.token:
            print("⚠️  Skipping Content Generator - No auth token")
            return False
        
        content_data = {
            "platform": "facebook",
            "content_type": "educational", 
            "topic": "ICF hurricane resistance",
            "tone": "professional",
            "count": 2
        }
        
        success, response = self.run_test(
            "AI Content Generation", 
            "POST", 
            "content/generate", 
            200, 
            content_data
        )
        
        if success and 'items' in response:
            print(f"   Generated {len(response['items'])} content items")
            # Store content ID for later tests
            self.content_id = response.get('id')
            return True
        return False

    def test_get_content_history(self):
        """Test getting content history"""
        if not self.token:
            print("⚠️  Skipping Content History - No auth token")
            return False
        
        return self.run_test("Get Content History", "GET", "content", 200)

    def test_create_campaign(self):
        """Test creating a marketing campaign"""
        if not self.token:
            print("⚠️  Skipping Create Campaign - No auth token")
            return False
        
        campaign_data = {
            "name": "Spring ICF Test Campaign",
            "goal": "leads",
            "platforms": ["facebook", "instagram"],
            "target_audience": "Texas homeowners planning new builds",
            "duration_days": 14,
            "description": "Focus on energy efficiency and hurricane resistance"
        }
        
        success, response = self.run_test(
            "Create Campaign", 
            "POST", 
            "campaigns", 
            200, 
            campaign_data
        )
        
        if success and 'id' in response:
            self.campaign_id = response['id']
            print(f"   Campaign ID: {self.campaign_id}")
            return True
        return False

    def test_get_campaigns(self):
        """Test getting campaigns list"""
        if not self.token:
            print("⚠️  Skipping Get Campaigns - No auth token")
            return False
        
        return self.run_test("Get Campaigns", "GET", "campaigns", 200)

    def test_generate_campaign_content(self):
        """Test AI campaign content generation"""
        if not self.token or not hasattr(self, 'campaign_id'):
            print("⚠️  Skipping Campaign Content Generation - No auth token or campaign")
            return False
        
        success, response = self.run_test(
            "Generate Campaign Content", 
            "POST", 
            f"campaigns/{self.campaign_id}/generate", 
            200, 
            {}
        )
        
        if success and 'ai_content' in response:
            content = response['ai_content']
            if 'content_calendar' in content:
                print(f"   Generated {len(content['content_calendar'])} calendar posts")
            return True
        return False

    def test_lead_scoring(self):
        """Test AI lead scoring"""
        if not self.token or not hasattr(self, 'lead_id'):
            print("⚠️  Skipping Lead Scoring - No auth token or lead")
            return False
        
        success, response = self.run_test(
            "AI Lead Scoring", 
            "POST", 
            f"leads/{self.lead_id}/score", 
            200, 
            {}
        )
        
        if success and 'ai_score' in response:
            score = response['ai_score']
            print(f"   Lead scored: {score.get('score', 'N/A')} (Grade: {score.get('grade', 'N/A')})")
            return True
        return False

def main():
    print("🏗️  ICF Hub Backend API Testing")
    print("=" * 50)
    
    tester = ICFHubAPITester()
    
    # Core functionality tests
    print("\n📊 TESTING CORE ENDPOINTS")
    tester.test_health()
    tester.test_stats()
    
    # Authentication tests
    print("\n🔐 TESTING AUTHENTICATION")
    tester.test_contractor_register()
    # Note: Login test would need existing credentials or we'd need to modify the approach
    
    # Data tests
    print("\n📋 TESTING DATA ENDPOINTS")
    tester.test_get_contractors()
    tester.test_create_lead()
    tester.test_get_leads()
    tester.test_contractor_profile()
    
    # Advanced features
    print("\n🤖 TESTING AI FEATURES")
    tester.test_chat_functionality()
    
    # Contact form
    print("\n📞 TESTING CONTACT FEATURES")
    tester.test_contact_submission()
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    print(f"✅ Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"❌ Tests failed: {len(tester.failed_tests)}")
    
    if tester.failed_tests:
        print("\n❌ FAILED TESTS:")
        for failure in tester.failed_tests:
            print(f"  • {failure}")
    
    # Return success/failure code
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())