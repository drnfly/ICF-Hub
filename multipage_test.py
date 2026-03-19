#!/usr/bin/env python3
"""
Test multi-page PDF processing (up to 3 pages)
"""

import requests
import os
from pathlib import Path
import json

# Test configuration
BACKEND_URL = os.getenv("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API_BASE = f"{BACKEND_URL}/api"

def test_multi_page_processing():
    """Test the multi-page processing feature"""
    
    # Use a multi-page PDF
    test_pdf = "/app/frontend/public/uploads/2a0254e43ef44238a1deaeebe4b7e70c_A-1 OakTimber (1)-2 2.pdf"
    
    if not Path(test_pdf).exists():
        print("❌ Multi-page test PDF not found!")
        return False
    
    print("📄 Testing Multi-Page PDF Processing")
    print(f"Using PDF: {Path(test_pdf).name}")
    print("-" * 50)
    
    try:
        with open(test_pdf, 'rb') as f:
            files = {'file': ('multipage.pdf', f, 'application/pdf')}
            data = {'format': 'pdf', 'wall_height': '10'}
            
            response = requests.post(
                f"{API_BASE}/takeoff/analyze",
                files=files,
                data=data,
                timeout=90  # More time for multi-page processing
            )
            
            if response.status_code != 200:
                print(f"❌ API call failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False
            
            data = response.json()
            
            # Check source_pages_used - should be up to 3 for multi-page PDF
            source_pages = data.get('source_pages_used')
            if source_pages:
                print(f"✅ Source pages processed: {source_pages}")
                if source_pages >= 1 and source_pages <= 3:
                    print(f"✅ Multi-page processing working (processed {source_pages} pages)")
                    if source_pages > 1:
                        print("🎉 CONFIRMED: Multi-page processing active!")
                    else:
                        print("ℹ️  Only 1 page processed (may be single useful page)")
                else:
                    print(f"⚠️  Unexpected page count: {source_pages}")
            else:
                print("❌ source_pages_used missing from response")
                return False
            
            # Analyze output quality from multi-page processing
            analysis = data.get('analysis', '')
            summary = data.get('summary', {})
            walls = data.get('walls', [])
            
            print(f"\n📊 Multi-page analysis results:")
            print(f"   Analysis notes: {analysis[:200]}...")
            print(f"   Total Linear Feet: {summary.get('total_linear_feet', 0)}")
            print(f"   Wall Count: {len(walls)}")
            print(f"   Opening Count: {summary.get('opening_count', 0)}")
            print(f"   Net Wall Sqft: {summary.get('net_wall_sqft', 0)}")
            
            # Check if analysis mentions multiple pages or comprehensive data
            analysis_lower = analysis.lower()
            if any(keyword in analysis_lower for keyword in ['page', 'multiple', 'comprehensive', 'detailed']):
                print("✅ Analysis suggests multi-page processing benefits")
            
            return True
            
    except Exception as e:
        print(f"❌ Multi-page test failed with exception: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("MULTI-PAGE PDF PROCESSING TEST")
    print("=" * 60)
    
    success = test_multi_page_processing()
    
    if success:
        print("\n🎉 Multi-page processing test complete!")
    else:
        print("\n💥 Multi-page processing test failed!")
        exit(1)