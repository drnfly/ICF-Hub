#!/usr/bin/env python3
"""
Backend Testing Script for AI Takeoff Beta - PDF Parsing & Wall Metrics
Focus: Latest overlay-related takeoff changes with preview fields
"""

import asyncio
import json
import sys
import logging
from pathlib import Path
import aiofiles
import httpx
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Get backend URL from environment
BACKEND_BASE_URL = "http://localhost:8001"

class TakeoffTester:
    def __init__(self):
        self.backend_url = BACKEND_BASE_URL
        self.test_results = []
        self.pdf_file_path = "/tmp/3.pdf"
        
    def log_test_result(self, test_name: str, status: bool, details: str = ""):
        """Log test results for tracking"""
        result = {
            "test": test_name,
            "status": "✅ PASS" if status else "❌ FAIL", 
            "details": details
        }
        self.test_results.append(result)
        logger.info(f"{result['status']}: {test_name} - {details}")

    async def test_pdf_exists(self) -> bool:
        """Test 1: Verify /tmp/3.pdf exists for testing"""
        try:
            if Path(self.pdf_file_path).exists():
                file_size = Path(self.pdf_file_path).stat().st_size
                self.log_test_result("PDF Test File Exists", True, f"File size: {file_size} bytes")
                return True
            else:
                self.log_test_result("PDF Test File Exists", False, "/tmp/3.pdf not found")
                return False
        except Exception as e:
            self.log_test_result("PDF Test File Exists", False, f"Error: {e}")
            return False

    async def test_non_pdf_rejection(self) -> bool:
        """Test 2: Non-PDF files should return 400"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Create a fake non-PDF file
                files = {"file": ("test.txt", b"This is not a PDF", "text/plain")}
                data = {"format": "pdf"}
                
                response = await client.post(
                    f"{self.backend_url}/api/takeoff/analyze",
                    files=files,
                    data=data
                )
                
                if response.status_code == 400:
                    self.log_test_result("Non-PDF Rejection", True, f"Correctly returned 400: {response.json().get('detail', '')}")
                    return True
                else:
                    self.log_test_result("Non-PDF Rejection", False, f"Expected 400, got {response.status_code}")
                    return False
                    
        except Exception as e:
            self.log_test_result("Non-PDF Rejection", False, f"Request failed: {e}")
            return False

    async def test_pdf_analysis_with_overlay_features(self) -> bool:
        """Test 3: PDF analysis with new overlay preview fields"""
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                # Test with /tmp/3.pdf
                async with aiofiles.open(self.pdf_file_path, 'rb') as f:
                    pdf_content = await f.read()
                
                files = {"file": ("3.pdf", pdf_content, "application/pdf")}
                data = {"format": "pdf"}  # No wall_height to test optional parameter
                
                response = await client.post(
                    f"{self.backend_url}/api/takeoff/analyze",
                    files=files,
                    data=data
                )
                
                if response.status_code != 200:
                    self.log_test_result("PDF Analysis - Response Code", False, f"Expected 200, got {response.status_code}: {response.text}")
                    return False
                
                self.log_test_result("PDF Analysis - Response Code", True, "200 OK")
                
                # Parse response
                result = response.json()
                
                # Test preview fields (NEW OVERLAY FEATURES)
                preview_tests = []
                
                if "preview_image_url" in result:
                    preview_tests.append("preview_image_url present")
                    if result["preview_image_url"] and "/uploads/" in result["preview_image_url"]:
                        preview_tests.append("preview_image_url is valid upload path")
                    else:
                        preview_tests.append("❌ preview_image_url format issue")
                else:
                    preview_tests.append("❌ preview_image_url missing")
                
                if "preview_width" in result and isinstance(result["preview_width"], (int, float)) and result["preview_width"] > 0:
                    preview_tests.append("preview_width present and valid")
                else:
                    preview_tests.append("❌ preview_width missing or invalid")
                
                if "preview_height" in result and isinstance(result["preview_height"], (int, float)) and result["preview_height"] > 0:
                    preview_tests.append("preview_height present and valid")
                else:
                    preview_tests.append("❌ preview_height missing or invalid")
                
                self.log_test_result("Preview Fields (Overlay Features)", 
                                   all("❌" not in test for test in preview_tests), 
                                   f"Tests: {', '.join(preview_tests)}")
                
                # Test required response structure
                structure_tests = []
                
                if "summary" in result:
                    summary = result["summary"]
                    required_summary_fields = ["total_linear_feet", "net_wall_sqft", "opening_count", "ceiling_height_ft"]
                    for field in required_summary_fields:
                        if field in summary:
                            structure_tests.append(f"summary.{field} present")
                        else:
                            structure_tests.append(f"❌ summary.{field} missing")
                else:
                    structure_tests.append("❌ summary object missing")
                
                if "walls" in result and isinstance(result["walls"], list):
                    structure_tests.append(f"walls array present ({len(result['walls'])} walls)")
                else:
                    structure_tests.append("❌ walls array missing")
                
                if "model_3d" in result and isinstance(result["model_3d"], dict):
                    structure_tests.append("model_3d object present")
                    if "walls" in result["model_3d"]:
                        structure_tests.append("model_3d.walls present")
                    else:
                        structure_tests.append("❌ model_3d.walls missing")
                else:
                    structure_tests.append("❌ model_3d object missing")
                
                if "source_pages_used" in result:
                    structure_tests.append(f"source_pages_used present ({result['source_pages_used']})")
                else:
                    structure_tests.append("❌ source_pages_used missing")
                
                self.log_test_result("Required Response Structure", 
                                   all("❌" not in test for test in structure_tests),
                                   f"Tests: {', '.join(structure_tests)}")
                
                # Test ceiling height extraction (should be extracted from analysis, not required in input)
                if "summary" in result and "ceiling_height_ft" in result["summary"]:
                    ceiling_height = result["summary"]["ceiling_height_ft"]
                    if isinstance(ceiling_height, (int, float)) and ceiling_height > 0:
                        self.log_test_result("Ceiling Height Extraction", True, 
                                           f"Extracted ceiling height: {ceiling_height} ft")
                    else:
                        self.log_test_result("Ceiling Height Extraction", False, 
                                           f"Invalid ceiling height: {ceiling_height}")
                else:
                    self.log_test_result("Ceiling Height Extraction", False, 
                                       "ceiling_height_ft not in response")
                
                # Log sample of actual response for debugging
                logger.info(f"Sample response data - Summary: {result.get('summary', {})}")
                logger.info(f"Preview fields - URL: {result.get('preview_image_url', 'N/A')}, Dimensions: {result.get('preview_width', 'N/A')}x{result.get('preview_height', 'N/A')}")
                
                return all("❌" not in test for test in preview_tests + structure_tests)
                
        except Exception as e:
            self.log_test_result("PDF Analysis - Request", False, f"Request failed: {e}")
            return False

    async def test_optional_wall_height_parameter(self) -> bool:
        """Test 4: wall_height parameter should be optional"""
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with aiofiles.open(self.pdf_file_path, 'rb') as f:
                    pdf_content = await f.read()
                
                # Test 1: Without wall_height parameter
                files1 = {"file": ("3.pdf", pdf_content, "application/pdf")}
                data1 = {"format": "pdf"}  # No wall_height
                
                response1 = await client.post(
                    f"{self.backend_url}/api/takeoff/analyze",
                    files=files1,
                    data=data1
                )
                
                # Test 2: With wall_height parameter
                files2 = {"file": ("3.pdf", pdf_content, "application/pdf")}
                data2 = {"format": "pdf", "wall_height": "12.0"}  # With wall_height
                
                response2 = await client.post(
                    f"{self.backend_url}/api/takeoff/analyze",
                    files=files2,
                    data=data2
                )
                
                test1_pass = response1.status_code == 200
                test2_pass = response2.status_code == 200
                
                if test1_pass and test2_pass:
                    result1 = response1.json()
                    result2 = response2.json()
                    
                    ceiling1 = result1.get("summary", {}).get("ceiling_height_ft", 0)
                    ceiling2 = result2.get("summary", {}).get("ceiling_height_ft", 0)
                    
                    self.log_test_result("Optional wall_height Parameter", True, 
                                       f"Without param: {ceiling1}ft, With param: {ceiling2}ft")
                    return True
                else:
                    self.log_test_result("Optional wall_height Parameter", False, 
                                       f"Response codes: no-param={response1.status_code}, with-param={response2.status_code}")
                    return False
                    
        except Exception as e:
            self.log_test_result("Optional wall_height Parameter", False, f"Test failed: {e}")
            return False

    async def test_preview_image_accessibility(self) -> bool:
        """Test 5: Preview image URL should be accessible"""
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                # First, get a valid response with preview URL
                async with aiofiles.open(self.pdf_file_path, 'rb') as f:
                    pdf_content = await f.read()
                
                files = {"file": ("3.pdf", pdf_content, "application/pdf")}
                data = {"format": "pdf"}
                
                response = await client.post(
                    f"{self.backend_url}/api/takeoff/analyze",
                    files=files,
                    data=data
                )
                
                if response.status_code != 200:
                    self.log_test_result("Preview Image Accessibility", False, 
                                       f"Failed to get analysis response: {response.status_code}")
                    return False
                
                result = response.json()
                preview_url = result.get("preview_image_url")
                
                if not preview_url:
                    self.log_test_result("Preview Image Accessibility", False, 
                                       "No preview_image_url in response")
                    return False
                
                # Test if the preview image is accessible
                # Convert relative URL to full URL if needed
                if preview_url.startswith("/"):
                    full_url = f"{self.backend_url}{preview_url}"
                else:
                    full_url = preview_url
                
                image_response = await client.get(full_url)
                
                if image_response.status_code == 200:
                    content_type = image_response.headers.get("content-type", "")
                    content_length = len(image_response.content)
                    
                    if "image" in content_type and content_length > 0:
                        self.log_test_result("Preview Image Accessibility", True, 
                                           f"Image accessible: {content_type}, {content_length} bytes")
                        return True
                    else:
                        self.log_test_result("Preview Image Accessibility", False, 
                                           f"Invalid image: {content_type}, {content_length} bytes")
                        return False
                else:
                    self.log_test_result("Preview Image Accessibility", False, 
                                       f"Image URL returned {image_response.status_code}: {full_url}")
                    return False
                    
        except Exception as e:
            self.log_test_result("Preview Image Accessibility", False, f"Test failed: {e}")
            return False

    async def check_backend_logs_for_errors(self) -> bool:
        """Test 6: Check backend logs for runtime errors"""
        try:
            # Check supervisor backend logs
            import subprocess
            
            result = subprocess.run(
                ["tail", "-n", "50", "/var/log/supervisor/backend.err.log"],
                capture_output=True,
                text=True
            )
            
            error_log = result.stdout
            
            # Look for critical errors
            critical_errors = ["NameError", "AttributeError", "ImportError", "SyntaxError", 
                             "Exception", "Error:", "Traceback"]
            
            found_errors = []
            for error_type in critical_errors:
                if error_type in error_log:
                    found_errors.append(error_type)
            
            if found_errors:
                self.log_test_result("Backend Runtime Errors", False, 
                                   f"Found errors in logs: {', '.join(found_errors)}")
                logger.warning(f"Backend log excerpt:\n{error_log[-500:]}")  # Last 500 chars
                return False
            else:
                self.log_test_result("Backend Runtime Errors", True, 
                                   "No critical errors found in backend logs")
                return True
                
        except Exception as e:
            self.log_test_result("Backend Runtime Errors", False, f"Log check failed: {e}")
            return False

    async def run_all_tests(self):
        """Run all takeoff overlay-related tests"""
        logger.info("🚀 Starting AI Takeoff Beta - PDF Parsing & Wall Metrics Testing")
        logger.info("Focus: Overlay-related takeoff changes with preview fields")
        
        tests = [
            self.test_pdf_exists,
            self.test_non_pdf_rejection,
            self.test_pdf_analysis_with_overlay_features,
            self.test_optional_wall_height_parameter,
            self.test_preview_image_accessibility,
            self.check_backend_logs_for_errors
        ]
        
        results = []
        for test in tests:
            try:
                result = await test()
                results.append(result)
            except Exception as e:
                logger.error(f"Test {test.__name__} failed with exception: {e}")
                results.append(False)
        
        # Summary
        passed = sum(results)
        total = len(results)
        
        logger.info(f"\n{'='*60}")
        logger.info(f"AI TAKEOFF BETA - OVERLAY TESTING COMPLETE")
        logger.info(f"{'='*60}")
        logger.info(f"RESULTS: {passed}/{total} tests passed")
        
        for result in self.test_results:
            logger.info(f"{result['status']}: {result['test']} - {result['details']}")
        
        if passed == total:
            logger.info("🎉 ALL TESTS PASSED - OVERLAY FEATURES WORKING CORRECTLY!")
            return True
        else:
            logger.warning(f"⚠️  {total - passed} TESTS FAILED - ISSUES DETECTED")
            return False

async def main():
    tester = TakeoffTester()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())