#!/usr/bin/env python3
"""
Backend API Testing for ICF Hub Social Media Connect Features
Testing: Social accounts endpoints, connection status, Content Calendar integration
"""
import requests
import json
import sys
from datetime import datetime, timedelta
import time

class ICFHubAPITester:
    def __init__(self, base_url="https://construct-connect-20.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.contractor_id = None
        self.test_results = []

    def log_test(self, test_name, success, response_status=None, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
        
        result = f"{status} - {test_name}"
        if response_status:
            result += f" (Status: {response_status})"
        if details:
            result += f" - {details}"
        
        print(result)
        self.test_results.append({
            "test_name": test_name,
            "success": success,
            "status_code": response_status,
            "details": details
        })
        return success

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            success = response.status_code == expected_status
            response_data = {}
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}
            
            return success, response.status_code, response_data
        except Exception as e:
            return False, 0, {"error": str(e)}

    def test_auth_setup(self):
        """Register a test contractor for authentication"""
        print("\n🔐 Setting up authentication...")
        timestamp = int(time.time())
        test_email = f"test_{timestamp}@example.com"
        
        success, status, response = self.make_request('POST', '/auth/register', {
            "company_name": f"Test ICF Company {timestamp}",
            "email": test_email,
            "password": "TestPassword123!",
            "phone": "555-0123",
            "city": "Test City",
            "state": "TS",
            "description": "Test ICF contractor",
            "years_experience": 10,
            "specialties": ["residential", "commercial"]
        }, 200)

        if success and 'token' in response:
            self.token = response['token']
            self.contractor_id = response['contractor']['id']
            return self.log_test("Contractor Registration", True, status, f"Token acquired for {test_email}")
        else:
            return self.log_test("Contractor Registration", False, status, f"Failed to get token: {response}")

    def test_schedule_endpoints(self):
        """Test all scheduling-related endpoints"""
        print("\n📅 Testing Schedule Endpoints...")
        
        # Test 1: Create scheduled post
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        post_data = {
            "platform": "facebook",
            "content": "Test ICF post about energy efficiency benefits",
            "hashtags": ["#ICF", "#GreenBuilding", "#EnergyEfficient"],
            "cta": "Contact us for your ICF project quote!",
            "scheduled_date": tomorrow,
            "scheduled_time": "10:00",
            "content_type": "educational"
        }
        
        success, status, response = self.make_request('POST', '/schedule', post_data, 200)
        post_id = response.get('id') if success else None
        self.log_test("POST /api/schedule - Create scheduled post", success, status)
        
        # Test 2: Get scheduled posts
        success, status, response = self.make_request('GET', '/schedule')
        posts_found = len(response) if isinstance(response, list) else 0
        self.log_test("GET /api/schedule - Get scheduled posts", success, status, f"Found {posts_found} posts")
        
        # Test 3: Bulk create posts
        bulk_posts = [
            {
                "platform": "instagram",
                "content": "ICF construction provides superior insulation",
                "hashtags": ["#ICF", "#Construction"],
                "cta": "Learn more about ICF benefits",
                "scheduled_date": tomorrow,
                "scheduled_time": "12:00",
                "content_type": "promotional"
            },
            {
                "platform": "linkedin",
                "content": "Professional ICF construction services",
                "hashtags": ["#ICF", "#Professional"],
                "cta": "Contact our ICF experts",
                "scheduled_date": tomorrow,
                "scheduled_time": "14:00",
                "content_type": "promotional"
            }
        ]
        success, status, response = self.make_request('POST', '/schedule/bulk', bulk_posts, 200)
        bulk_count = len(response) if isinstance(response, list) else 0
        self.log_test("POST /api/schedule/bulk - Bulk create posts", success, status, f"Created {bulk_count} posts")
        
        if post_id:
            # Test 4: Publish scheduled post
            success, status, response = self.make_request('POST', f'/schedule/{post_id}/publish', {}, 200)
            self.log_test("POST /api/schedule/{id}/publish - Publish post", success, status)
            
            # Test 5: Delete scheduled post
            success, status, response = self.make_request('DELETE', f'/schedule/{post_id}', expected_status=200)
            self.log_test("DELETE /api/schedule/{id} - Delete post", success, status)

    def test_notifications_endpoints(self):
        """Test notification system"""
        print("\n🔔 Testing Notifications Endpoints...")
        
        # Test 1: Get notifications
        success, status, response = self.make_request('GET', '/notifications')
        notif_count = len(response) if isinstance(response, list) else 0
        self.log_test("GET /api/notifications - Get notifications", success, status, f"Found {notif_count} notifications")
        
        # Test 2: Get unread count
        success, status, response = self.make_request('GET', '/notifications/unread-count')
        unread_count = response.get('count', 0) if success else 0
        self.log_test("GET /api/notifications/unread-count - Unread count", success, status, f"Unread: {unread_count}")
        
        # Test 3: Create a test lead to trigger notification (leads create notifications for contractors)
        lead_data = {
            "name": "Test Homeowner",
            "email": "homeowner@test.com",
            "phone": "555-9999",
            "city": "Test City",
            "state": "TS",
            "project_type": "new_home",
            "project_size": "2000_3000_sqft",
            "budget_range": "200k_300k",
            "timeline": "6_12_months",
            "description": "Looking for ICF construction for new home with energy efficiency focus"
        }
        success, status, response = self.make_request('POST', '/leads', lead_data, 200)
        self.log_test("POST /api/leads - Create lead (triggers notifications)", success, status)
        
        # Wait a moment for notification to be created
        time.sleep(2)
        
        # Test 4: Get notifications again to see if new notification was created
        success, status, response = self.make_request('GET', '/notifications')
        new_notif_count = len(response) if isinstance(response, list) else 0
        self.log_test("GET /api/notifications - After lead creation", success, status, f"Now {new_notif_count} notifications")
        
        # Test 5: Mark notification as read (if we have notifications)
        if isinstance(response, list) and len(response) > 0:
            notif_id = response[0].get('id')
            if notif_id:
                success, status, resp = self.make_request('PUT', f'/notifications/{notif_id}/read', {})
                self.log_test("PUT /api/notifications/{id}/read - Mark read", success, status)
        
        # Test 6: Mark all notifications as read
        success, status, response = self.make_request('PUT', '/notifications/read-all', {})
        self.log_test("PUT /api/notifications/read-all - Mark all read", success, status)

    def test_analytics_endpoint(self):
        """Test analytics dashboard endpoint"""
        print("\n📊 Testing Analytics Endpoint...")
        
        success, status, response = self.make_request('GET', '/analytics')
        
        if success:
            # Verify analytics data structure
            required_sections = ['leads', 'content', 'campaigns', 'schedule']
            has_all_sections = all(section in response for section in required_sections)
            
            # Check leads section
            leads_valid = (
                'total' in response.get('leads', {}) and
                'by_status' in response.get('leads', {}) and
                'by_date' in response.get('leads', {})
            )
            
            # Check content section
            content_valid = (
                'total_batches' in response.get('content', {}) and
                'total_posts' in response.get('content', {}) and
                'by_platform' in response.get('content', {})
            )
            
            # Check campaigns section
            campaigns_valid = (
                'total' in response.get('campaigns', {}) and
                'by_status' in response.get('campaigns', {})
            )
            
            # Check schedule section
            schedule_valid = (
                'total' in response.get('schedule', {}) and
                'by_status' in response.get('schedule', {}) and
                'by_platform' in response.get('schedule', {})
            )
            
            structure_valid = has_all_sections and leads_valid and content_valid and campaigns_valid and schedule_valid
            
            details = f"Sections: {has_all_sections}, Leads: {response.get('leads', {}).get('total', 0)}, Content: {response.get('content', {}).get('total_posts', 0)}"
            self.log_test("GET /api/analytics - Analytics data structure", structure_valid, status, details)
        else:
            self.log_test("GET /api/analytics - Get analytics", False, status, f"Error: {response}")

    def test_social_accounts_endpoints(self):
        """Test social media account management endpoints"""
        print("\n🔗 Testing Social Accounts Endpoints...")
        
        # Test 1: Get all social accounts (should return all 5 platforms with connected/not-connected status)
        success, status, response = self.make_request('GET', '/social-accounts')
        if success and isinstance(response, list):
            expected_platforms = ['facebook', 'instagram', 'linkedin', 'x', 'tiktok']
            found_platforms = [acc.get('platform') for acc in response]
            has_all_platforms = all(platform in found_platforms for platform in expected_platforms)
            all_have_connected_field = all('connected' in acc for acc in response)
            
            details = f"Found platforms: {found_platforms}, All have connected field: {all_have_connected_field}"
            self.log_test("GET /api/social-accounts - All 5 platforms returned", 
                         has_all_platforms and all_have_connected_field, status, details)
        else:
            self.log_test("GET /api/social-accounts - All 5 platforms returned", False, status, f"Invalid response: {response}")
        
        # Test 2: Connect a social account (Facebook)
        connect_data = {
            "platform": "facebook",
            "account_name": "test_facebook_page",
            "access_token": "fake_token_123",
            "page_id": "123456789"
        }
        success, status, response = self.make_request('POST', '/social-accounts/connect', connect_data)
        facebook_connected = success and response.get('connected') == True
        self.log_test("POST /api/social-accounts/connect - Connect Facebook", facebook_connected, status)
        
        # Test 3: Connect another platform (LinkedIn) 
        connect_data_linkedin = {
            "platform": "linkedin",
            "account_name": "test_linkedin_profile",
            "access_token": "linkedin_fake_token_456"
        }
        success, status, response = self.make_request('POST', '/social-accounts/connect', connect_data_linkedin)
        linkedin_connected = success and response.get('connected') == True
        self.log_test("POST /api/social-accounts/connect - Connect LinkedIn", linkedin_connected, status)
        
        # Test 4: Get connection status (should return only connected platforms)
        success, status, response = self.make_request('GET', '/social-accounts/status')
        if success and isinstance(response, dict):
            connected_platforms = list(response.keys())
            has_facebook = 'facebook' in connected_platforms
            has_linkedin = 'linkedin' in connected_platforms
            details = f"Connected platforms: {connected_platforms}"
            self.log_test("GET /api/social-accounts/status - Only connected platforms", 
                         has_facebook and has_linkedin, status, details)
        else:
            self.log_test("GET /api/social-accounts/status - Only connected platforms", False, status, f"Invalid response: {response}")
        
        # Test 5: Disconnect a platform
        disconnect_data = {"platform": "facebook"}
        success, status, response = self.make_request('POST', '/social-accounts/disconnect', disconnect_data)
        self.log_test("POST /api/social-accounts/disconnect - Disconnect Facebook", success, status)
        
        # Test 6: Verify disconnect worked - get status again
        success, status, response = self.make_request('GET', '/social-accounts/status')
        if success and isinstance(response, dict):
            facebook_gone = 'facebook' not in response
            linkedin_still_there = 'linkedin' in response
            details = f"After disconnect - Connected platforms: {list(response.keys())}"
            self.log_test("Verify disconnect - Facebook removed, LinkedIn kept", 
                         facebook_gone and linkedin_still_there, status, details)
        else:
            self.log_test("Verify disconnect - Facebook removed, LinkedIn kept", False, status)

    def test_content_calendar_integration(self):
        """Test Content Calendar integration with social accounts"""
        print("\n📅 Testing Content Calendar & Social Integration...")
        
        # First ensure we have a connected account for testing
        connect_data = {
            "platform": "instagram",
            "account_name": "test_insta_account",
            "access_token": "insta_fake_token_789"
        }
        success, status, response = self.make_request('POST', '/social-accounts/connect', connect_data)
        
        # Create a scheduled post
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        post_data = {
            "platform": "instagram",
            "content": "Test ICF post for Instagram integration",
            "hashtags": ["#ICF", "#Construction", "#EnergyEfficient"],
            "cta": "Contact us for ICF projects!",
            "scheduled_date": tomorrow,
            "scheduled_time": "11:00",
            "content_type": "promotional"
        }
        
        success, status, response = self.make_request('POST', '/schedule', post_data, 200)
        post_id = response.get('id') if success else None
        self.log_test("Create scheduled post for connected platform", success, status)
        
        if post_id:
            # Publish the post - should show auto-post confirmation for connected platform
            success, status, response = self.make_request('POST', f'/schedule/{post_id}/publish', {}, 200)
            auto_posted = response.get('auto_posted') == True if success else False
            published_status = response.get('status') == 'published' if success else False
            
            details = f"Auto-posted: {auto_posted}, Status: {response.get('status') if success else 'N/A'}"
            self.log_test("Publish post - Connected platform shows auto-post confirmation", 
                         published_status, status, details)
        
        # Test posting to non-connected platform
        post_data_unconnected = {
            "platform": "tiktok",  # Not connected
            "content": "Test ICF post for unconnected platform",
            "hashtags": ["#ICF", "#TikTok"],
            "cta": "Learn about ICF!",
            "scheduled_date": tomorrow,
            "scheduled_time": "13:00",
            "content_type": "educational"
        }
        
        success, status, response = self.make_request('POST', '/schedule', post_data_unconnected, 200)
        unconnected_post_id = response.get('id') if success else None
        
        if unconnected_post_id:
            # Publish to unconnected platform - should still work but not auto-post
            success, status, response = self.make_request('POST', f'/schedule/{unconnected_post_id}/publish', {}, 200)
            auto_posted = response.get('auto_posted') == False if success else None
            published_status = response.get('status') == 'published' if success else False
            
            details = f"Auto-posted: {auto_posted}, Status: {response.get('status') if success else 'N/A'}"
            self.log_test("Publish to unconnected platform - Manual mode", 
                         published_status and auto_posted == False, status, details)

    def test_notifications_for_connections(self):
        """Test that notifications are created when social accounts are connected"""
        print("\n🔔 Testing Social Account Connection Notifications...")
        
        # Get current notification count
        success, status, initial_response = self.make_request('GET', '/notifications')
        initial_count = len(initial_response) if isinstance(initial_response, list) else 0
        
        # Connect a new platform
        connect_data = {
            "platform": "x",
            "account_name": "test_x_account",
            "access_token": "x_fake_token_xyz"
        }
        success, status, response = self.make_request('POST', '/social-accounts/connect', connect_data)
        connection_success = success and response.get('connected') == True
        self.log_test("Connect X account for notification test", connection_success, status)
        
        # Wait a moment for notification to be created
        time.sleep(2)
        
        # Check if notification was created
        success, status, new_response = self.make_request('GET', '/notifications')
        new_count = len(new_response) if isinstance(new_response, list) else 0
        notification_created = new_count > initial_count
        
        # Check if the notification is about account connection
        connection_notification_found = False
        if isinstance(new_response, list) and new_count > 0:
            for notif in new_response[:3]:  # Check recent notifications
                if notif.get('type') == 'account_connected' and 'X' in notif.get('title', ''):
                    connection_notification_found = True
                    break
        
        details = f"Notifications before: {initial_count}, after: {new_count}, Connection notif found: {connection_notification_found}"
        self.log_test("Notification created when social account connected", 
                     notification_created and connection_notification_found, status, details)

    def run_all_tests(self):
        """Run complete test suite"""
        print("🧪 Starting ICF Hub New Features API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication setup
        if not self.test_auth_setup():
            print("❌ Authentication failed - stopping tests")
            return False
        
        # Core social media features tests
        self.test_social_accounts_endpoints()
        self.test_content_calendar_integration()
        self.test_notifications_for_connections()
        
        # Keep basic schedule and analytics tests for integration
        self.test_schedule_endpoints()
        self.test_analytics_endpoint()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📋 TEST SUMMARY")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/max(self.tests_run,1))*100:.1f}%")
        
        # List failures
        failures = [r for r in self.test_results if not r['success']]
        if failures:
            print(f"\n❌ Failed Tests ({len(failures)}):")
            for fail in failures:
                print(f"  - {fail['test_name']}: {fail['details']}")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = ICFHubAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)