#!/usr/bin/env python3
"""
Backend Testing for ICF Workforce Help Portal APIs
Tests all worker registration, admin approval, contractor search/shortlist/invite, and job board flows
"""

import requests
import json
import uuid
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://gitpull-preview.preview.emergentagent.com/api"

class ICFWorkforcePortalTester:
    def __init__(self):
        self.contractor_token = None
        self.contractor_id = None
        self.worker_id = None
        self.job_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status}: {test_name} - {details}")
        print(f"{status}: {test_name} - {details}")
        
    def setup_contractor_auth(self):
        """Setup contractor authentication for testing"""
        try:
            # Register a test contractor
            contractor_data = {
                "company_name": "Test ICF Contractor LLC",
                "email": f"contractor_{uuid.uuid4().hex[:8]}@testdomain.com",
                "password": "TestPass123!",
                "phone": "555-0123",
                "city": "Denver",
                "state": "CO",
                "description": "ICF construction specialist",
                "years_experience": 10,
                "specialties": ["ICF Construction", "Residential"]
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/register", json=contractor_data)
            if response.status_code == 200:
                data = response.json()
                self.contractor_token = data.get("token")
                self.contractor_id = data.get("contractor", {}).get("id")
                self.log_result("Contractor Registration Setup", True, f"Token: {self.contractor_token[:20]}...")
                return True
            else:
                self.log_result("Contractor Registration Setup", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Contractor Registration Setup", False, f"Exception: {str(e)}")
            return False
    
    def test_worker_registration(self):
        """Test 1: Worker registration (public) - POST /api/workers/register"""
        try:
            worker_data = {
                "name": "John ICF Worker",
                "email": f"worker_{uuid.uuid4().hex[:8]}@testdomain.com",
                "phone": "555-0456",
                "city": "Colorado Springs",
                "state": "CO",
                "years_icf_experience": 5,
                "pay_rate_min": 25.0,
                "pay_rate_max": 35.0,
                "preferred_roles": ["ICF Installer", "Concrete Finisher"],
                "certifications": "OSHA 10, ICF Certified",
                "equipment": "Hand tools, safety gear",
                "availability": "Full-time",
                "travel_radius_miles": 50,
                "notes": "Experienced ICF worker looking for opportunities"
            }
            
            response = requests.post(f"{BACKEND_URL}/workers/register", json=worker_data)
            
            if response.status_code == 200:
                data = response.json()
                self.worker_id = data.get("id")
                
                # Verify required fields
                if (data.get("approved") == False and 
                    data.get("status") == "pending_approval" and
                    data.get("name") == worker_data["name"] and
                    data.get("email") == worker_data["email"]):
                    self.log_result("Worker Registration", True, f"Worker ID: {self.worker_id}, Status: pending_approval")
                    return True
                else:
                    self.log_result("Worker Registration", False, f"Invalid response data: approved={data.get('approved')}, status={data.get('status')}")
                    return False
            else:
                self.log_result("Worker Registration", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Worker Registration", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_workers_list(self):
        """Test 2a: Admin get workers - GET /api/admin/workers"""
        try:
            response = requests.get(f"{BACKEND_URL}/admin/workers")
            
            if response.status_code == 200:
                workers = response.json()
                if isinstance(workers, list):
                    # Find our test worker
                    test_worker = None
                    for worker in workers:
                        if worker.get("id") == self.worker_id:
                            test_worker = worker
                            break
                    
                    if test_worker:
                        self.log_result("Admin Workers List", True, f"Found {len(workers)} workers, including test worker")
                        return True
                    else:
                        self.log_result("Admin Workers List", False, f"Test worker {self.worker_id} not found in list")
                        return False
                else:
                    self.log_result("Admin Workers List", False, f"Response not a list: {type(workers)}")
                    return False
            else:
                self.log_result("Admin Workers List", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Admin Workers List", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_worker_approval(self):
        """Test 2b: Admin approve worker - POST /api/admin/workers/{worker_id}/approve"""
        try:
            approval_data = {"approved": True}
            response = requests.post(f"{BACKEND_URL}/admin/workers/{self.worker_id}/approve", json=approval_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") == True:
                    self.log_result("Admin Worker Approval", True, f"Worker {self.worker_id} approved successfully")
                    return True
                else:
                    self.log_result("Admin Worker Approval", False, f"Success flag not true: {data}")
                    return False
            else:
                self.log_result("Admin Worker Approval", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Admin Worker Approval", False, f"Exception: {str(e)}")
            return False
    
    def test_contractor_worker_search(self):
        """Test 3a: Contractor worker search - GET /api/workers (requires contractor auth)"""
        try:
            headers = {"Authorization": f"Bearer {self.contractor_token}"}
            response = requests.get(f"{BACKEND_URL}/workers", headers=headers)
            
            if response.status_code == 200:
                workers = response.json()
                if isinstance(workers, list):
                    # Should only return approved workers
                    approved_workers = [w for w in workers if w.get("approved") == True]
                    if len(approved_workers) == len(workers):
                        # Find our test worker
                        test_worker = None
                        for worker in workers:
                            if worker.get("id") == self.worker_id:
                                test_worker = worker
                                break
                        
                        if test_worker:
                            self.log_result("Contractor Worker Search", True, f"Found {len(workers)} approved workers, including test worker")
                            return True
                        else:
                            self.log_result("Contractor Worker Search", False, f"Test worker {self.worker_id} not found in approved list")
                            return False
                    else:
                        self.log_result("Contractor Worker Search", False, f"Non-approved workers returned: {len(workers) - len(approved_workers)}")
                        return False
                else:
                    self.log_result("Contractor Worker Search", False, f"Response not a list: {type(workers)}")
                    return False
            else:
                self.log_result("Contractor Worker Search", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Contractor Worker Search", False, f"Exception: {str(e)}")
            return False
    
    def test_contractor_save_worker(self):
        """Test 3b: Contractor save worker - POST /api/workers/{worker_id}/save"""
        try:
            headers = {"Authorization": f"Bearer {self.contractor_token}"}
            response = requests.post(f"{BACKEND_URL}/workers/{self.worker_id}/save", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") == True:
                    self.log_result("Contractor Save Worker", True, f"Worker {self.worker_id} saved successfully")
                    return True
                else:
                    self.log_result("Contractor Save Worker", False, f"Success flag not true: {data}")
                    return False
            else:
                self.log_result("Contractor Save Worker", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Contractor Save Worker", False, f"Exception: {str(e)}")
            return False
    
    def test_contractor_get_saved_workers(self):
        """Test 3c: Contractor get saved workers - GET /api/workers/saved"""
        try:
            headers = {"Authorization": f"Bearer {self.contractor_token}"}
            response = requests.get(f"{BACKEND_URL}/workers/saved", headers=headers)
            
            if response.status_code == 200:
                workers = response.json()
                if isinstance(workers, list):
                    # Find our saved worker
                    test_worker = None
                    for worker in workers:
                        if worker.get("id") == self.worker_id:
                            test_worker = worker
                            break
                    
                    if test_worker:
                        self.log_result("Contractor Get Saved Workers", True, f"Found {len(workers)} saved workers, including test worker")
                        return True
                    else:
                        self.log_result("Contractor Get Saved Workers", False, f"Test worker {self.worker_id} not found in saved list")
                        return False
                else:
                    self.log_result("Contractor Get Saved Workers", False, f"Response not a list: {type(workers)}")
                    return False
            else:
                self.log_result("Contractor Get Saved Workers", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Contractor Get Saved Workers", False, f"Exception: {str(e)}")
            return False
    
    def test_contractor_invite_worker(self):
        """Test 3d: Contractor invite worker - POST /api/workers/{worker_id}/invite"""
        try:
            headers = {"Authorization": f"Bearer {self.contractor_token}"}
            invite_data = {
                "project_title": "ICF Home Construction - Denver",
                "message": "We have an ICF project starting next month and would like to invite you to join our team.",
                "pay_offer": 30.0
            }
            
            response = requests.post(f"{BACKEND_URL}/workers/{self.worker_id}/invite", json=invite_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("worker_id") == self.worker_id and 
                    data.get("contractor_id") == self.contractor_id and
                    data.get("project_title") == invite_data["project_title"] and
                    data.get("status") == "sent"):
                    self.log_result("Contractor Invite Worker", True, f"Invite sent successfully, ID: {data.get('id')}")
                    return True
                else:
                    self.log_result("Contractor Invite Worker", False, f"Invalid invite data: {data}")
                    return False
            else:
                self.log_result("Contractor Invite Worker", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Contractor Invite Worker", False, f"Exception: {str(e)}")
            return False
    
    def test_contractor_get_invites(self):
        """Test 3e: Contractor get invites - GET /api/workers/invites"""
        try:
            headers = {"Authorization": f"Bearer {self.contractor_token}"}
            response = requests.get(f"{BACKEND_URL}/workers/invites", headers=headers)
            
            if response.status_code == 200:
                invites = response.json()
                if isinstance(invites, list):
                    # Find our test invite
                    test_invite = None
                    for invite in invites:
                        if invite.get("worker_id") == self.worker_id and invite.get("contractor_id") == self.contractor_id:
                            test_invite = invite
                            break
                    
                    if test_invite:
                        self.log_result("Contractor Get Invites", True, f"Found {len(invites)} invites, including test invite")
                        return True
                    else:
                        self.log_result("Contractor Get Invites", False, f"Test invite not found in list")
                        return False
                else:
                    self.log_result("Contractor Get Invites", False, f"Response not a list: {type(invites)}")
                    return False
            else:
                self.log_result("Contractor Get Invites", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Contractor Get Invites", False, f"Exception: {str(e)}")
            return False
    
    def test_contractor_create_job(self):
        """Test 4a: Contractor create job - POST /api/jobs"""
        try:
            headers = {"Authorization": f"Bearer {self.contractor_token}"}
            job_data = {
                "title": "ICF Wall Installation - Residential Project",
                "location": "Boulder, CO",
                "stage": "Foundation Complete",
                "pay_rate": "$28-32/hour",
                "description": "Looking for experienced ICF installers for a 2,500 sq ft residential project. Must have 3+ years ICF experience.",
                "required_experience_years": 3,
                "skills": ["ICF Installation", "Concrete Work", "Blueprint Reading"]
            }
            
            response = requests.post(f"{BACKEND_URL}/jobs", json=job_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.job_id = data.get("id")
                
                if (data.get("approved") == False and 
                    data.get("status") == "pending_approval" and
                    data.get("contractor_id") == self.contractor_id and
                    data.get("title") == job_data["title"]):
                    self.log_result("Contractor Create Job", True, f"Job ID: {self.job_id}, Status: pending_approval")
                    return True
                else:
                    self.log_result("Contractor Create Job", False, f"Invalid job data: approved={data.get('approved')}, status={data.get('status')}")
                    return False
            else:
                self.log_result("Contractor Create Job", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Contractor Create Job", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_jobs_list(self):
        """Test 4b: Admin get jobs - GET /api/admin/jobs"""
        try:
            response = requests.get(f"{BACKEND_URL}/admin/jobs")
            
            if response.status_code == 200:
                jobs = response.json()
                if isinstance(jobs, list):
                    # Find our test job
                    test_job = None
                    for job in jobs:
                        if job.get("id") == self.job_id:
                            test_job = job
                            break
                    
                    if test_job:
                        self.log_result("Admin Jobs List", True, f"Found {len(jobs)} jobs, including test job")
                        return True
                    else:
                        self.log_result("Admin Jobs List", False, f"Test job {self.job_id} not found in list")
                        return False
                else:
                    self.log_result("Admin Jobs List", False, f"Response not a list: {type(jobs)}")
                    return False
            else:
                self.log_result("Admin Jobs List", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Admin Jobs List", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_job_approval(self):
        """Test 4c: Admin approve job - POST /api/admin/jobs/{job_id}/approve"""
        try:
            approval_data = {"approved": True}
            response = requests.post(f"{BACKEND_URL}/admin/jobs/{self.job_id}/approve", json=approval_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") == True:
                    self.log_result("Admin Job Approval", True, f"Job {self.job_id} approved successfully")
                    return True
                else:
                    self.log_result("Admin Job Approval", False, f"Success flag not true: {data}")
                    return False
            else:
                self.log_result("Admin Job Approval", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Admin Job Approval", False, f"Exception: {str(e)}")
            return False
    
    def test_public_jobs_list(self):
        """Test 4d: Public get approved jobs - GET /api/jobs"""
        try:
            response = requests.get(f"{BACKEND_URL}/jobs")
            
            if response.status_code == 200:
                jobs = response.json()
                if isinstance(jobs, list):
                    # Should only return approved jobs
                    approved_jobs = [j for j in jobs if j.get("approved") == True]
                    if len(approved_jobs) == len(jobs):
                        # Find our test job
                        test_job = None
                        for job in jobs:
                            if job.get("id") == self.job_id:
                                test_job = job
                                break
                        
                        if test_job:
                            self.log_result("Public Jobs List", True, f"Found {len(jobs)} approved jobs, including test job")
                            return True
                        else:
                            self.log_result("Public Jobs List", False, f"Test job {self.job_id} not found in approved list")
                            return False
                    else:
                        self.log_result("Public Jobs List", False, f"Non-approved jobs returned: {len(jobs) - len(approved_jobs)}")
                        return False
                else:
                    self.log_result("Public Jobs List", False, f"Response not a list: {type(jobs)}")
                    return False
            else:
                self.log_result("Public Jobs List", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Public Jobs List", False, f"Exception: {str(e)}")
            return False
    
    def test_public_job_application(self):
        """Test 4e: Public apply to job - POST /api/jobs/{job_id}/apply"""
        try:
            application_data = {
                "worker_name": "Mike ICF Applicant",
                "email": f"applicant_{uuid.uuid4().hex[:8]}@testdomain.com",
                "phone": "555-0789",
                "experience_years": 4,
                "notes": "I have 4 years of ICF experience and am available to start immediately."
            }
            
            response = requests.post(f"{BACKEND_URL}/jobs/{self.job_id}/apply", json=application_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") == True and data.get("application_id"):
                    self.log_result("Public Job Application", True, f"Application submitted successfully, ID: {data.get('application_id')}")
                    return True
                else:
                    self.log_result("Public Job Application", False, f"Invalid application response: {data}")
                    return False
            else:
                self.log_result("Public Job Application", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Public Job Application", False, f"Exception: {str(e)}")
            return False
    
    def test_contractor_job_applications(self):
        """Test 4f: Contractor get job applications - GET /api/jobs/{job_id}/applications"""
        try:
            headers = {"Authorization": f"Bearer {self.contractor_token}"}
            response = requests.get(f"{BACKEND_URL}/jobs/{self.job_id}/applications", headers=headers)
            
            if response.status_code == 200:
                applications = response.json()
                if isinstance(applications, list):
                    if len(applications) > 0:
                        # Check if our test application is there
                        test_application = applications[0]  # Should be our recent application
                        if (test_application.get("job_id") == self.job_id and
                            test_application.get("status") == "applied"):
                            self.log_result("Contractor Job Applications", True, f"Found {len(applications)} applications for job")
                            return True
                        else:
                            self.log_result("Contractor Job Applications", False, f"Invalid application data: {test_application}")
                            return False
                    else:
                        self.log_result("Contractor Job Applications", False, "No applications found for job")
                        return False
                else:
                    self.log_result("Contractor Job Applications", False, f"Response not a list: {type(applications)}")
                    return False
            else:
                self.log_result("Contractor Job Applications", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Contractor Job Applications", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all ICF Workforce Help Portal API tests"""
        print("🚀 Starting ICF Workforce Help Portal Backend API Testing")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 80)
        
        # Setup
        if not self.setup_contractor_auth():
            print("❌ CRITICAL: Contractor auth setup failed - cannot continue with tests")
            return False
        
        # Test flows in order
        tests = [
            # 1. Worker registration flow
            ("Worker Registration (Public)", self.test_worker_registration),
            
            # 2. Admin approval flow
            ("Admin Workers List", self.test_admin_workers_list),
            ("Admin Worker Approval", self.test_admin_worker_approval),
            
            # 3. Contractor worker search/shortlist/invite flow
            ("Contractor Worker Search", self.test_contractor_worker_search),
            ("Contractor Save Worker", self.test_contractor_save_worker),
            ("Contractor Get Saved Workers", self.test_contractor_get_saved_workers),
            ("Contractor Invite Worker", self.test_contractor_invite_worker),
            ("Contractor Get Invites", self.test_contractor_get_invites),
            
            # 4. Job board flow
            ("Contractor Create Job", self.test_contractor_create_job),
            ("Admin Jobs List", self.test_admin_jobs_list),
            ("Admin Job Approval", self.test_admin_job_approval),
            ("Public Jobs List", self.test_public_jobs_list),
            ("Public Job Application", self.test_public_job_application),
            ("Contractor Job Applications", self.test_contractor_job_applications)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n🧪 Running: {test_name}")
            if test_func():
                passed += 1
            else:
                print(f"⚠️  Test failed: {test_name}")
        
        print("\n" + "=" * 80)
        print(f"📊 TEST SUMMARY: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED - ICF Workforce Help Portal APIs are working correctly!")
            return True
        else:
            print(f"❌ {total - passed} tests failed - see details above")
            return False

if __name__ == "__main__":
    tester = ICFWorkforcePortalTester()
    success = tester.run_all_tests()
    
    print("\n" + "=" * 80)
    print("📋 DETAILED TEST RESULTS:")
    for result in tester.test_results:
        print(result)
    
    exit(0 if success else 1)