#!/usr/bin/env python3
"""
Backend testing for AI Takeoff Beta - PDF Parsing & Wall Metrics
Testing updated pipeline that uses up to first 3 PDF pages + extracted text + dimension inference fallback.
"""

import asyncio
import requests
import os
import sys
from pathlib import Path
import json

# Test configuration
BACKEND_URL = os.getenv("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API_BASE = f"{BACKEND_URL}/api"

# Test files
TEST_PDF_FILES = [
    "/app/frontend/public/uploads/c6557a6df925493eb8c5a09871558061_3.pdf",  # User mentioned 3.pdf
    "/app/frontend/public/uploads/be524297d58e4f74a3ecf6742cbde30f_3.pdf",   # Another 3.pdf
    "/app/frontend/public/uploads/6f292dd4aa614a4ab35c5136c86f8cd5_test_blueprint.pdf"  # Test blueprint
]

class TakeoffBackendTest:
    def __init__(self):
        self.results = []
        self.failures = []
        self.pdf_file = None
        
    def log_result(self, test_name: str, status: str, details: str = ""):
        result = {"test": test_name, "status": status, "details": details}
        self.results.append(result)
        print(f"[{status}] {test_name}: {details}")
        
    def log_failure(self, test_name: str, details: str):
        self.failures.append(f"{test_name}: {details}")
        self.log_result(test_name, "FAIL", details)
        
    def log_success(self, test_name: str, details: str = ""):
        self.log_result(test_name, "PASS", details)

    def find_test_pdf(self):
        """Find a suitable PDF file for testing"""
        for pdf_path in TEST_PDF_FILES:
            if Path(pdf_path).exists():
                self.pdf_file = pdf_path
                self.log_success("PDF File Discovery", f"Using {pdf_path}")
                return True
        
        self.log_failure("PDF File Discovery", "No test PDF files found")
        return False

    def test_unauthenticated_request(self):
        """Test that unauthenticated requests are handled appropriately (should work in public mode)"""
        try:
            with open(self.pdf_file, 'rb') as f:
                files = {'file': (f'test_{Path(self.pdf_file).name}', f, 'application/pdf')}
                data = {'format': 'pdf', 'wall_height': '10'}
                
                response = requests.post(
                    f"{API_BASE}/takeoff/analyze",
                    files=files,
                    data=data,
                    timeout=60
                )
                
                if response.status_code == 200:
                    self.log_success("Unauthenticated Access", "Public access working (200 OK)")
                    return response.json()
                elif response.status_code == 401:
                    self.log_failure("Unauthenticated Access", "401 Unauthorized - public access not working")
                else:
                    self.log_failure("Unauthenticated Access", f"Unexpected status: {response.status_code}")
                    
        except Exception as e:
            self.log_failure("Unauthenticated Access", f"Request failed: {str(e)}")
        return None

    def test_non_pdf_rejection(self):
        """Test that non-PDF files are properly rejected"""
        try:
            # Create a fake text file
            fake_file = ("fake.txt", b"This is not a PDF", "text/plain")
            files = {'file': fake_file}
            data = {'format': 'pdf', 'wall_height': '10'}
            
            response = requests.post(
                f"{API_BASE}/takeoff/analyze",
                files=files,
                data=data,
                timeout=30
            )
            
            if response.status_code == 400:
                self.log_success("Non-PDF Rejection", "400 error for non-PDF file")
            else:
                self.log_failure("Non-PDF Rejection", f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_failure("Non-PDF Rejection", f"Request failed: {str(e)}")

    def test_invalid_wall_height(self):
        """Test invalid wall height parameter"""
        try:
            with open(self.pdf_file, 'rb') as f:
                files = {'file': (f'test_{Path(self.pdf_file).name}', f, 'application/pdf')}
                data = {'format': 'pdf', 'wall_height': 'invalid'}
                
                response = requests.post(
                    f"{API_BASE}/takeoff/analyze",
                    files=files,
                    data=data,
                    timeout=30
                )
                
                if response.status_code == 400:
                    self.log_success("Invalid Wall Height", "400 error for invalid wall height")
                else:
                    self.log_failure("Invalid Wall Height", f"Expected 400, got {response.status_code}")
                    
        except Exception as e:
            self.log_failure("Invalid Wall Height", f"Request failed: {str(e)}")

    def validate_response_structure(self, response_data: dict, test_name: str):
        """Validate the structure of a successful takeoff response"""
        required_fields = [
            'summary', 'walls', 'model_3d', 'source_pages_used'
        ]
        
        missing_fields = []
        for field in required_fields:
            if field not in response_data:
                missing_fields.append(field)
        
        if missing_fields:
            self.log_failure(f"{test_name} - Response Structure", f"Missing fields: {missing_fields}")
            return False
            
        # Check summary structure
        summary = response_data.get('summary', {})
        summary_fields = ['total_linear_feet', 'net_wall_sqft', 'opening_count', 'ceiling_height_ft']
        missing_summary = [f for f in summary_fields if f not in summary]
        
        if missing_summary:
            self.log_failure(f"{test_name} - Summary Structure", f"Missing summary fields: {missing_summary}")
            return False
            
        # Check walls array
        walls = response_data.get('walls', [])
        if not isinstance(walls, list):
            self.log_failure(f"{test_name} - Walls Structure", "Walls should be an array")
            return False
            
        # Check model_3d structure
        model_3d = response_data.get('model_3d', {})
        if 'walls' not in model_3d:
            self.log_failure(f"{test_name} - Model3D Structure", "model_3d missing walls array")
            return False
            
        # Check source_pages_used
        source_pages = response_data.get('source_pages_used', 0)
        if not isinstance(source_pages, int) or source_pages <= 0:
            self.log_failure(f"{test_name} - Source Pages", f"source_pages_used should be positive integer, got {source_pages}")
            return False
            
        self.log_success(f"{test_name} - Response Structure", "All required fields present")
        return True

    def analyze_output_quality(self, response_data: dict, test_name: str):
        """Analyze if output appears to be meaningful vs generic fallback"""
        summary = response_data.get('summary', {})
        walls = response_data.get('walls', [])
        analysis_notes = response_data.get('analysis', '')
        
        # Check for generic fallback patterns
        total_linear_feet = summary.get('total_linear_feet', 0)
        wall_count = len(walls)
        
        # Generic fallback typically has 4 walls with 100 total linear feet (30+20+30+20)
        is_likely_fallback = (
            wall_count == 4 and 
            total_linear_feet == 100.0 and
            'fallback' in analysis_notes.lower()
        )
        
        if is_likely_fallback:
            self.log_result(f"{test_name} - Output Quality", "WARNING", 
                          "Output appears to be generic fallback layout")
        else:
            # Check if we have meaningful dimensions
            unique_lengths = set()
            for wall in walls:
                if 'linear_feet' in wall:
                    unique_lengths.add(wall['linear_feet'])
                    
            if len(unique_lengths) > 2:
                self.log_success(f"{test_name} - Output Quality", 
                               f"Appears to be custom analysis - {wall_count} walls, {len(unique_lengths)} unique lengths")
            else:
                self.log_result(f"{test_name} - Output Quality", "INFO", 
                               f"Simple layout detected - {wall_count} walls")

    def test_backend_stability(self):
        """Test backend stability with multiple requests"""
        try:
            stable_requests = 0
            total_requests = 3
            
            for i in range(total_requests):
                with open(self.pdf_file, 'rb') as f:
                    files = {'file': (f'test_{i}_{Path(self.pdf_file).name}', f, 'application/pdf')}
                    data = {'format': 'pdf', 'wall_height': '10'}
                    
                    response = requests.post(
                        f"{API_BASE}/takeoff/analyze",
                        files=files,
                        data=data,
                        timeout=60
                    )
                    
                    if response.status_code == 200:
                        stable_requests += 1
                    
            if stable_requests == total_requests:
                self.log_success("Backend Stability", f"All {total_requests} requests successful")
            else:
                self.log_failure("Backend Stability", 
                               f"Only {stable_requests}/{total_requests} requests successful")
                               
        except Exception as e:
            self.log_failure("Backend Stability", f"Stability test failed: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("AI TAKEOFF BETA - BACKEND TESTING")
        print("Testing updated PDF parsing pipeline with multi-page + text extraction")
        print("=" * 60)
        
        # Step 1: Find test PDF
        if not self.find_test_pdf():
            return False
            
        # Step 2: Test API endpoints
        print("\n--- API Endpoint Tests ---")
        
        # Test non-PDF rejection
        self.test_non_pdf_rejection()
        
        # Test invalid parameters
        self.test_invalid_wall_height()
        
        # Test main functionality
        response_data = self.test_unauthenticated_request()
        
        if response_data:
            print("\n--- Response Validation ---")
            # Validate response structure
            if self.validate_response_structure(response_data, "Main Test"):
                # Analyze output quality
                self.analyze_output_quality(response_data, "Main Test")
                
                # Print key metrics for manual review
                summary = response_data.get('summary', {})
                print(f"\nKey Metrics from Response:")
                print(f"  Total Linear Feet: {summary.get('total_linear_feet', 'N/A')}")
                print(f"  Net Wall Sqft: {summary.get('net_wall_sqft', 'N/A')}")
                print(f"  Opening Count: {summary.get('opening_count', 'N/A')}")
                print(f"  Ceiling Height: {summary.get('ceiling_height_ft', 'N/A')}")
                print(f"  Wall Count: {len(response_data.get('walls', []))}")
                print(f"  Source Pages Used: {response_data.get('source_pages_used', 'N/A')}")
                print(f"  Analysis Notes: {response_data.get('analysis', 'N/A')[:100]}...")
        
        # Step 3: Test backend stability
        print("\n--- Stability Tests ---")
        self.test_backend_stability()
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r['status'] == 'PASS'])
        failed_tests = len([r for r in self.results if r['status'] == 'FAIL'])
        warnings = len([r for r in self.results if r['status'] == 'WARNING'])
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Warnings: {warnings}")
        
        if self.failures:
            print("\nFAILURES:")
            for failure in self.failures:
                print(f"  ❌ {failure}")
        else:
            print("\n✅ All critical tests passed!")
            
        return failed_tests == 0

if __name__ == "__main__":
    tester = TakeoffBackendTest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)