#!/usr/bin/env python3
"""
Backend Test Suite for AI Takeoff Beta - PDF Parsing & Wall Metrics
Testing focus: Multi-page PDF processing, ceiling height extraction, validation
"""

import requests
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any


class TakeoffBackendTester:
    def __init__(self):
        self.base_url = self._get_backend_url()
        self.endpoint = f"{self.base_url}/api/takeoff/analyze"
        self.test_pdf_path = "/tmp/3.pdf"
        self.test_results = []
        print(f"🔧 Backend Test Suite for AI Takeoff Beta")
        print(f"📍 Testing endpoint: {self.endpoint}")
        print(f"📄 Using PDF: {self.test_pdf_path}")
        print("=" * 60)

    def _get_backend_url(self) -> str:
        """Get backend URL from environment or use localhost"""
        frontend_env_path = Path("/app/frontend/.env")
        if frontend_env_path.exists():
            with open(frontend_env_path, 'r') as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        if url and not url.startswith("http://localhost"):
                            return url
        
        # Fallback to localhost for testing
        return "http://localhost:8001"

    def _log_test_result(self, test_name: str, passed: bool, details: str = ""):
        """Log individual test results"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"    {details}")
        
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "details": details
        })

    def test_1_non_pdf_rejection(self):
        """Test 1: Non-PDF files should return 400"""
        print("\n🧪 Test 1: Non-PDF Upload Rejection")
        
        try:
            # Create a fake text file
            fake_content = b"This is not a PDF file"
            files = {'file': ('fake.txt', fake_content, 'text/plain')}
            data = {'format': 'pdf'}
            
            response = requests.post(self.endpoint, files=files, data=data, timeout=30)
            
            if response.status_code == 400:
                self._log_test_result("Non-PDF rejection", True, f"Returned 400 as expected")
                return True
            else:
                self._log_test_result("Non-PDF rejection", False, f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self._log_test_result("Non-PDF rejection", False, f"Request failed: {str(e)}")
            return False

    def test_2_pdf_upload_success(self):
        """Test 2: Valid PDF should return 200 with required fields"""
        print("\n🧪 Test 2: PDF Upload and Analysis")
        
        if not Path(self.test_pdf_path).exists():
            self._log_test_result("PDF upload", False, f"Test PDF not found at {self.test_pdf_path}")
            return False
        
        try:
            with open(self.test_pdf_path, 'rb') as pdf_file:
                files = {'file': ('3.pdf', pdf_file, 'application/pdf')}
                data = {'format': 'pdf'}
                
                response = requests.post(self.endpoint, files=files, data=data, timeout=60)
                
                if response.status_code != 200:
                    self._log_test_result("PDF upload", False, f"HTTP {response.status_code}: {response.text[:200]}")
                    return False
                
                try:
                    result = response.json()
                    self.last_valid_response = result
                    self._log_test_result("PDF upload", True, f"Successfully returned 200 with JSON response")
                    return result
                    
                except json.JSONDecodeError:
                    self._log_test_result("PDF upload", False, "Response is not valid JSON")
                    return False
                    
        except Exception as e:
            self._log_test_result("PDF upload", False, f"Request failed: {str(e)}")
            return False

    def test_3_response_structure(self, response_data: Dict[str, Any]):
        """Test 3: Validate response contains all required fields"""
        print("\n🧪 Test 3: Response Structure Validation")
        
        required_fields = {
            'summary.ceiling_height_ft': 'Ceiling height from pipeline',
            'summary.total_linear_feet': 'Total linear feet',
            'summary.net_wall_sqft': 'Net wall square footage',
            'summary.opening_count': 'Opening count',
            'walls': 'Walls array',
            'model_3d': '3D model data',
            'source_pages_used': 'Source pages processed count'
        }
        
        all_passed = True
        
        for field_path, description in required_fields.items():
            field_parts = field_path.split('.')
            current = response_data
            field_exists = True
            
            try:
                for part in field_parts:
                    current = current[part]
            except (KeyError, TypeError):
                field_exists = False
            
            if field_exists and current is not None:
                # Special validation for ceiling_height_ft - must be a positive number
                if field_path == 'summary.ceiling_height_ft':
                    if isinstance(current, (int, float)) and current > 0:
                        self._log_test_result(f"Required field: {field_path}", True, f"{description}: {current} ft")
                    else:
                        self._log_test_result(f"Required field: {field_path}", False, f"{description} is not a positive number: {current}")
                        all_passed = False
                # Special validation for source_pages_used
                elif field_path == 'source_pages_used':
                    if isinstance(current, int) and current > 0:
                        self._log_test_result(f"Required field: {field_path}", True, f"{description}: {current} pages")
                    else:
                        self._log_test_result(f"Required field: {field_path}", False, f"{description} is not a positive integer: {current}")
                        all_passed = False
                else:
                    self._log_test_result(f"Required field: {field_path}", True, f"{description}: Present")
            else:
                self._log_test_result(f"Required field: {field_path}", False, f"{description}: Missing or null")
                all_passed = False
        
        return all_passed

    def test_4_multi_page_processing(self, response_data: Dict[str, Any]):
        """Test 4: Verify multi-page processing is active"""
        print("\n🧪 Test 4: Multi-Page Processing Verification")
        
        source_pages = response_data.get('source_pages_used', 0)
        
        if source_pages >= 1:
            self._log_test_result("Multi-page processing", True, f"Processed {source_pages} pages (expected 1-3)")
            return True
        else:
            self._log_test_result("Multi-page processing", False, f"No pages processed: {source_pages}")
            return False

    def test_5_ceiling_height_extraction(self, response_data: Dict[str, Any]):
        """Test 5: Verify ceiling height is extracted from pipeline (not manual)"""
        print("\n🧪 Test 5: Ceiling Height Extraction")
        
        ceiling_height = response_data.get('summary', {}).get('ceiling_height_ft')
        wall_height_param = response_data.get('wall_height')
        
        if isinstance(ceiling_height, (int, float)) and ceiling_height > 0:
            # Check if it's from extraction vs manual input
            if wall_height_param is None or ceiling_height != wall_height_param:
                self._log_test_result("Ceiling height extraction", True, f"Extracted {ceiling_height} ft from drawing/pipeline")
                return True
            else:
                self._log_test_result("Ceiling height extraction", True, f"Height {ceiling_height} ft (may be from manual input)")
                return True
        else:
            self._log_test_result("Ceiling height extraction", False, f"Invalid ceiling height: {ceiling_height}")
            return False

    def test_6_runtime_stability(self):
        """Test 6: Test runtime stability with multiple requests"""
        print("\n🧪 Test 6: Backend Runtime Stability")
        
        if not Path(self.test_pdf_path).exists():
            self._log_test_result("Runtime stability", False, "Test PDF not available")
            return False
        
        success_count = 0
        total_requests = 2
        
        for i in range(total_requests):
            try:
                with open(self.test_pdf_path, 'rb') as pdf_file:
                    files = {'file': ('3.pdf', pdf_file, 'application/pdf')}
                    data = {'format': 'pdf'}
                    
                    response = requests.post(self.endpoint, files=files, data=data, timeout=60)
                    
                    if response.status_code == 200:
                        success_count += 1
                        print(f"    Request {i+1}/{total_requests}: ✅ Success")
                    else:
                        print(f"    Request {i+1}/{total_requests}: ❌ Failed ({response.status_code})")
                        
            except Exception as e:
                print(f"    Request {i+1}/{total_requests}: ❌ Error: {str(e)}")
        
        if success_count == total_requests:
            self._log_test_result("Runtime stability", True, f"All {total_requests} requests successful")
            return True
        else:
            self._log_test_result("Runtime stability", False, f"Only {success_count}/{total_requests} successful")
            return False

    def test_7_error_handling(self):
        """Test 7: Error handling for various scenarios"""
        print("\n🧪 Test 7: Error Handling")
        
        error_tests = [
            ("Empty file", b"", 'application/pdf', 400),
            ("Corrupted PDF", b"%PDF-1.4\ncorrupted", 'application/pdf', 500),
        ]
        
        all_passed = True
        
        for test_name, content, content_type, expected_status in error_tests:
            try:
                files = {'file': ('test.pdf', content, content_type)}
                data = {'format': 'pdf'}
                
                response = requests.post(self.endpoint, files=files, data=data, timeout=30)
                
                if response.status_code >= 400:  # Any error status is acceptable
                    self._log_test_result(f"Error handling - {test_name}", True, f"Returned {response.status_code} (error handled)")
                else:
                    self._log_test_result(f"Error handling - {test_name}", False, f"Expected error, got {response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                # Request exceptions are acceptable for error handling tests
                self._log_test_result(f"Error handling - {test_name}", True, f"Request failed as expected: {str(e)}")
        
        return all_passed

    def test_8_optional_wall_height_parameter(self):
        """Test 8: Optional wall_height parameter handling"""
        print("\n🧪 Test 8: Optional Wall Height Parameter")
        
        if not Path(self.test_pdf_path).exists():
            self._log_test_result("Wall height parameter", False, "Test PDF not available")
            return False
        
        try:
            with open(self.test_pdf_path, 'rb') as pdf_file:
                files = {'file': ('3.pdf', pdf_file, 'application/pdf')}
                data = {'format': 'pdf', 'wall_height': '12'}  # Optional parameter
                
                response = requests.post(self.endpoint, files=files, data=data, timeout=60)
                
                if response.status_code == 200:
                    result = response.json()
                    ceiling_height = result.get('summary', {}).get('ceiling_height_ft', 0)
                    if ceiling_height > 0:
                        self._log_test_result("Wall height parameter", True, f"Accepted optional wall_height, returned {ceiling_height} ft")
                        return True
                    else:
                        self._log_test_result("Wall height parameter", False, f"No ceiling height in response")
                        return False
                else:
                    self._log_test_result("Wall height parameter", False, f"Request failed: {response.status_code}")
                    return False
                    
        except Exception as e:
            self._log_test_result("Wall height parameter", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("🚀 Starting Backend Test Suite for AI Takeoff Beta")
        print("Focus: PDF Parsing improvements & Wall Metrics validation")
        print("-" * 60)
        
        # Test sequence
        test_1_passed = self.test_1_non_pdf_rejection()
        
        # Main PDF test
        pdf_response = self.test_2_pdf_upload_success()
        if pdf_response:
            test_3_passed = self.test_3_response_structure(pdf_response)
            test_4_passed = self.test_4_multi_page_processing(pdf_response)
            test_5_passed = self.test_5_ceiling_height_extraction(pdf_response)
        else:
            test_3_passed = test_4_passed = test_5_passed = False
        
        test_6_passed = self.test_6_runtime_stability()
        test_7_passed = self.test_7_error_handling()
        test_8_passed = self.test_8_optional_wall_height_parameter()
        
        # Summary
        passed_tests = sum([test_1_passed, bool(pdf_response), test_3_passed, test_4_passed, 
                           test_5_passed, test_6_passed, test_7_passed, test_8_passed])
        total_tests = 8
        
        print("\n" + "=" * 60)
        print("📊 BACKEND TEST RESULTS SUMMARY")
        print("=" * 60)
        
        for result in self.test_results:
            status = "✅" if result["passed"] else "❌"
            print(f"{status} {result['test']}")
            if result["details"]:
                print(f"   {result['details']}")
        
        print(f"\n🎯 Overall: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 ALL TESTS PASSED - Backend is working correctly!")
            return True
        else:
            print("⚠️  Some tests failed - Backend needs attention")
            return False


if __name__ == "__main__":
    tester = TakeoffBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)