#!/usr/bin/env python3
"""
ICF Hub Backend Testing Suite
Tests backend APIs after zip import and environment setup
"""

import requests
import json
import uuid
import time
from datetime import datetime

# Backend URL from frontend environment
BACKEND_URL = "http://187.124.66.30:8001"
API_BASE = f"{BACKEND_URL}/api"

class BackendTester:
    def __init__(self):
        self.results = []
        self.session = requests.Session()
        
    def log_result(self, test_name, success, message, details=None):
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        if details:
            result["details"] = details
        self.results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")

    def test_backend_boot(self):
        """Test if backend is running and accessible"""
        try:
            response = self.session.get(f"{API_BASE}/health", timeout=10)
            if response.status_code == 200:
                self.log_result("Backend Boot", True, "Backend health check passed")
                return True
            else:
                self.log_result("Backend Boot", False, f"Health check failed with status {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.log_result("Backend Boot", False, f"Backend unreachable: {str(e)}")
            return False

    def test_stats_endpoint(self):
        """Test public stats endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/stats", timeout=10)
            if response.status_code == 200:
                data = response.json()
                required_keys = ["contractors", "leads", "projects_completed", "energy_savings"]
                if all(key in data for key in required_keys):
                    self.log_result("Stats Endpoint", True, "Stats endpoint working with all required fields")
                    return True
                else:
                    missing = [key for key in required_keys if key not in data]
                    self.log_result("Stats Endpoint", False, f"Missing required fields: {missing}")
                    return False
            else:
                self.log_result("Stats Endpoint", False, f"Stats endpoint returned status {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Stats Endpoint", False, f"Stats endpoint error: {str(e)}")
            return False

    def test_intake_chat(self):
        """Test AI intake chat functionality"""
        try:
            session_id = str(uuid.uuid4())
            chat_data = {
                "message": "Hi, my name is John Doe and I'm building in Austin, TX. Email john@example.com",
                "session_id": session_id
            }
            
            response = self.session.post(f"{API_BASE}/intake/chat", 
                                       json=chat_data, 
                                       timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["response", "session_id", "is_complete"]
                if all(field in data for field in required_fields):
                    if "john" in data["response"].lower() or "austin" in data["response"].lower():
                        self.log_result("Intake Chat", True, "Intake chat working with contextual response")
                        return True
                    else:
                        self.log_result("Intake Chat", False, "AI response lacks context from user message")
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Intake Chat", False, f"Missing response fields: {missing}")
                    return False
            else:
                self.log_result("Intake Chat", False, f"Intake chat failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Intake Chat", False, f"Intake chat error: {str(e)}")
            return False

    def test_chat_completion_flow(self):
        """Test intake completion trigger"""
        try:
            session_id = str(uuid.uuid4())
            
            # First message - contact info
            response1 = self.session.post(f"{API_BASE}/intake/chat", 
                                        json={
                                            "message": "My name is Jane Smith, building in Denver CO, email jane@test.com",
                                            "session_id": session_id
                                        }, timeout=30)
            
            if response1.status_code != 200:
                self.log_result("Chat Completion Flow", False, f"Initial chat failed: {response1.status_code}")
                return False
            
            # Completion message
            response2 = self.session.post(f"{API_BASE}/intake/chat", 
                                        json={
                                            "message": "Please match me with contractors now",
                                            "session_id": session_id
                                        }, timeout=30)
            
            if response2.status_code == 200:
                data = response2.json()
                if data.get("is_complete") and "COMPLETE:" in data.get("response", ""):
                    summary = data.get("summary")
                    if summary and len(summary) > 50:  # Reasonable summary length
                        self.log_result("Chat Completion Flow", True, "Intake completion and summary generation working")
                        return True
                    else:
                        self.log_result("Chat Completion Flow", False, "Completion triggered but summary generation failed")
                        return False
                else:
                    self.log_result("Chat Completion Flow", False, "Completion trigger not working properly")
                    return False
            else:
                self.log_result("Chat Completion Flow", False, f"Completion request failed: {response2.status_code}")
                return False
        except Exception as e:
            self.log_result("Chat Completion Flow", False, f"Completion flow error: {str(e)}")
            return False

    def test_contractor_registration(self):
        """Test contractor registration endpoint"""
        try:
            contractor_data = {
                "company_name": "Test ICF Builders",
                "email": f"test-{uuid.uuid4().hex[:8]}@example.com",
                "password": "testpass123",
                "phone": "555-123-4567",
                "city": "Houston",
                "state": "TX",
                "description": "ICF construction specialists",
                "years_experience": 10,
                "specialties": ["residential", "commercial"]
            }
            
            response = self.session.post(f"{API_BASE}/auth/register", 
                                       json=contractor_data,
                                       timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "contractor" in data:
                    contractor = data["contractor"]
                    if contractor.get("company_name") == contractor_data["company_name"]:
                        self.log_result("Contractor Registration", True, "Registration working with valid token")
                        return True
                    else:
                        self.log_result("Contractor Registration", False, "Registration data mismatch")
                        return False
                else:
                    self.log_result("Contractor Registration", False, "Missing token or contractor data in response")
                    return False
            else:
                error_msg = response.text if response.text else f"Status {response.status_code}"
                self.log_result("Contractor Registration", False, f"Registration failed: {error_msg}")
                return False
        except Exception as e:
            self.log_result("Contractor Registration", False, f"Registration error: {str(e)}")
            return False

    def test_file_upload_endpoint(self):
        """Test file upload functionality"""
        try:
            session_id = str(uuid.uuid4())
            
            # Create a small test file
            test_content = b"Test image content for upload testing"
            files = {'file': ('test_image.jpg', test_content, 'image/jpeg')}
            data = {'session_id': session_id}
            
            response = self.session.post(f"{API_BASE}/intake/upload",
                                       files=files,
                                       data=data,
                                       timeout=20)
            
            if response.status_code == 200:
                result = response.json()
                if "url" in result and "filename" in result:
                    # Verify the file URL is accessible
                    file_url = result["url"]
                    if file_url.startswith(BACKEND_URL):
                        self.log_result("File Upload", True, "File upload working with accessible URL")
                        return True
                    else:
                        self.log_result("File Upload", False, f"Invalid file URL format: {file_url}")
                        return False
                else:
                    self.log_result("File Upload", False, "Missing url or filename in upload response")
                    return False
            else:
                self.log_result("File Upload", False, f"Upload failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result("File Upload", False, f"Upload error: {str(e)}")
            return False

    def test_contractors_list(self):
        """Test contractors listing endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/contractors", timeout=10)
            if response.status_code == 200:
                contractors = response.json()
                if isinstance(contractors, list):
                    self.log_result("Contractors List", True, f"Contractors list working (found {len(contractors)} contractors)")
                    return True
                else:
                    self.log_result("Contractors List", False, "Response is not a list")
                    return False
            else:
                self.log_result("Contractors List", False, f"Contractors endpoint failed: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Contractors List", False, f"Contractors list error: {str(e)}")
            return False

    def test_leads_creation(self):
        """Test lead creation endpoint"""
        try:
            lead_data = {
                "name": "Test Lead",
                "email": "testlead@example.com",
                "phone": "555-987-6543",
                "city": "Miami",
                "state": "FL",
                "project_type": "new_home",
                "project_size": "2000-3000",
                "budget_range": "400k-500k",
                "timeline": "6-12_months",
                "description": "Looking for ICF construction for hurricane resistance"
            }
            
            response = self.session.post(f"{API_BASE}/leads",
                                       json=lead_data,
                                       timeout=15)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("id") and result.get("status") == "new":
                    self.log_result("Leads Creation", True, "Lead creation working with proper ID and status")
                    return True
                else:
                    self.log_result("Leads Creation", False, "Lead created but missing ID or status")
                    return False
            else:
                self.log_result("Leads Creation", False, f"Lead creation failed: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Leads Creation", False, f"Lead creation error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🔧 Starting ICF Hub Backend Testing Suite...")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        tests = [
            self.test_backend_boot,
            self.test_stats_endpoint,
            self.test_intake_chat,
            self.test_chat_completion_flow,
            self.test_contractor_registration,
            self.test_file_upload_endpoint,
            self.test_contractors_list,
            self.test_leads_creation
        ]
        
        total_tests = len(tests)
        passed = 0
        failed = 0
        
        for test_func in tests:
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ CRITICAL: {test_func.__name__} crashed: {str(e)}")
                failed += 1
            
            time.sleep(0.5)  # Brief pause between tests
        
        print("=" * 60)
        print(f"🏁 Testing Complete: {passed} passed, {failed} failed out of {total_tests}")
        
        # Summary of critical issues
        critical_failures = [r for r in self.results if not r["success"] and r["test"] in ["Backend Boot", "Intake Chat", "Chat Completion Flow"]]
        if critical_failures:
            print("\n🚨 CRITICAL ISSUES FOUND:")
            for failure in critical_failures:
                print(f"   - {failure['test']}: {failure['message']}")
        
        return passed, failed

if __name__ == "__main__":
    tester = BackendTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    exit(0 if failed == 0 else 1)