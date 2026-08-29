import io
from PIL import Image
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status


from accounts.models import Ward, UserProfile, Staff
from waste.models import WastePickupRequest, WastePickupImage, WasteCollection, WasteComplaint
from waste.serializers import WastePickupRequestSerializer, WasteComplaintSerializer
from waste.priority_detector import determine_complaint_priority


def create_test_image():
    file = io.BytesIO()
    image = Image.new("RGB", (100, 100), color=(73, 109, 137))
    image.save(file, "jpeg")
    file.seek(0)
    return SimpleUploadedFile("test_completion.jpg", file.read(), content_type="image/jpeg")


class WasteCollectionWorkflowTests(TestCase):

    def setUp(self):
        # 1. Create Ward
        self.ward = Ward.objects.create(ward_name="Ward 1", location="Downtown")

        # 2. Create Citizen User
        self.citizen_user = User.objects.create_user(
            username="citizen1",
            email="citizen1@example.com",
            password="Password123!"
        )
        self.citizen_profile = UserProfile.objects.create(
            user=self.citizen_user,
            name="John Citizen",
            phone="9876543210",
            ward=self.ward,
            role="CITIZEN"
        )

        # 3. Create Staff User 1
        self.staff_user1 = User.objects.create_user(
            username="staff1",
            email="staff1@example.com",
            password="Password123!"
        )
        self.staff_profile1 = UserProfile.objects.create(
            user=self.staff_user1,
            name="Staff Member One",
            phone="9876543211",
            ward=self.ward,
            role="STAFF"
        )
        self.staff1 = Staff.objects.create(
            user=self.staff_user1,
            phone="9876543211",
            designation="STAFF",
            date_of_joining="2024-01-01"
        )

        # 4. Create Staff User 2
        self.staff_user2 = User.objects.create_user(
            username="staff2",
            email="staff2@example.com",
            password="Password123!"
        )
        self.staff_profile2 = UserProfile.objects.create(
            user=self.staff_user2,
            name="Staff Member Two",
            phone="9876543212",
            ward=self.ward,
            role="STAFF"
        )
        self.staff2 = Staff.objects.create(
            user=self.staff_user2,
            phone="9876543212",
            designation="STAFF",
            date_of_joining="2024-01-01"
        )

        # 5. Create Pickup Request assigned to Staff 1
        self.pickup_request = WastePickupRequest.objects.create(
            user=self.citizen_user,
            location_name="123 Main Street",
            latitude=12.9715987,
            longitude=77.5945627,
            status="ASSIGNED",
            assigned_staff=self.staff1
        )

        self.client = APIClient()

    def test_unauthenticated_staff_update_blocked(self):
        response = self.client.post(
            f"/api/waste/staff/task-update/{self.pickup_request.id}/",
            {"status": "PENDING"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unassigned_staff_cannot_update_other_staff_task(self):
        self.client.force_authenticate(user=self.staff_user2)
        response = self.client.post(
            f"/api/waste/staff/task-update/{self.pickup_request.id}/",
            {"status": "PENDING"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_update_task_to_pending(self):
        self.client.force_authenticate(user=self.staff_user1)
        response = self.client.post(
            f"/api/waste/staff/task-update/{self.pickup_request.id}/",
            {"status": "PENDING"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pickup_request.refresh_from_db()
        self.assertEqual(self.pickup_request.status, "PENDING")
        self.assertFalse(WasteCollection.objects.filter(pickup_request=self.pickup_request).exists())

    def test_staff_completed_validation_requires_image_and_weight(self):
        self.client.force_authenticate(user=self.staff_user1)
        # Missing both
        response = self.client.post(
            f"/api/waste/staff/task-update/{self.pickup_request.id}/",
            {"status": "COMPLETED"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Negative weight
        test_img = create_test_image()
        response = self.client.post(
            f"/api/waste/staff/task-update/{self.pickup_request.id}/",
            {
                "status": "COMPLETED",
                "completion_image": test_img,
                "estimated_weight": "-5.5"
            },
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_can_complete_task_with_image_and_weight_and_get_qr(self):
        self.client.force_authenticate(user=self.staff_user1)
        test_img = create_test_image()

        response = self.client.post(
            f"/api/waste/staff/task-update/{self.pickup_request.id}/",
            {
                "status": "COMPLETED",
                "completion_image": test_img,
                "estimated_weight": "8.5"
            },
            format="multipart"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pickup_request.refresh_from_db()
        self.assertEqual(self.pickup_request.status, "COMPLETED")

        # Verify WasteCollection record was created
        collection = WasteCollection.objects.get(pickup_request=self.pickup_request)
        self.assertEqual(collection.staff, self.staff1)
        self.assertEqual(float(collection.estimated_weight), 8.5)
        self.assertIsNotNone(collection.completed_at)

        # Verify response returns payment QR info
        self.assertIn("payment_qr", response.data)
        payment_qr = response.data["payment_qr"]
        self.assertIsNotNone(payment_qr)
        self.assertIn("qr_string", payment_qr)
        self.assertIn("amount", payment_qr)

    def test_duplicate_completed_submissions_do_not_create_duplicate_records(self):
        self.client.force_authenticate(user=self.staff_user1)
        test_img1 = create_test_image()
        test_img2 = create_test_image()

        # First completion
        self.client.post(
            f"/api/waste/staff/task-update/{self.pickup_request.id}/",
            {
                "status": "COMPLETED",
                "completion_image": test_img1,
                "estimated_weight": "5.0"
            },
            format="multipart"
        )

        # Second completion (re-submission / update)
        self.client.post(
            f"/api/waste/staff/task-update/{self.pickup_request.id}/",
            {
                "status": "COMPLETED",
                "completion_image": test_img2,
                "estimated_weight": "6.0"
            },
            format="multipart"
        )

        # Verify exactly one WasteCollection record exists
        self.assertEqual(WasteCollection.objects.filter(pickup_request=self.pickup_request).count(), 1)
        collection = WasteCollection.objects.get(pickup_request=self.pickup_request)
        self.assertEqual(float(collection.estimated_weight), 6.0)

    def test_dashboard_stats_endpoint(self):
        # 1. Newly created citizen request (unassigned, status=PENDING, staff_marked_pending=False)
        # Should NOT be counted in pending_count
        WastePickupRequest.objects.create(
            user=self.citizen_user,
            location_name="456 Elm Street",
            latitude=12.971,
            longitude=77.594,
            status="PENDING",
            staff_marked_pending=False
        )

        # 2. Staff-assigned request explicitly marked as PENDING by staff
        # SHOULD be counted in pending_count
        WastePickupRequest.objects.create(
            user=self.citizen_user,
            location_name="100 Pine Street",
            latitude=12.9715,
            longitude=77.5945,
            status="PENDING",
            assigned_staff=self.staff2,
            staff_marked_pending=True
        )

        # 3. Completed request
        comp_req = WastePickupRequest.objects.create(
            user=self.citizen_user,
            location_name="789 Oak Avenue",
            latitude=12.972,
            longitude=77.595,
            status="COMPLETED",
            assigned_staff=self.staff1,
            staff_marked_pending=False
        )
        WasteCollection.objects.create(
            pickup_request=comp_req,
            staff=self.staff1,
            completion_image=create_test_image(),
            estimated_weight=4.0
        )

        response = self.client.get("/api/waste/dashboard-stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stats = response.data.get("stats", {})
        # Only 1 staff-marked pending task (not the newly created citizen request)
        self.assertEqual(stats.get("pending_count"), 1)
        self.assertEqual(stats.get("completed_count"), 1)
        self.assertEqual(stats.get("assigned_count"), 1)  # self.pickup_request in setUp is ASSIGNED
        self.assertEqual(stats.get("total_requests"), 4)

    def test_assign_pickup_by_numeric_id(self):
        req = WastePickupRequest.objects.create(
            user=self.citizen_user,
            location_name="200 Main Street",
            latitude=12.971,
            longitude=77.594,
            status="PENDING"
        )
        response = self.client.post(
            "/api/waste/assign-pickup/",
            {"request_id": req.id, "staff_id": self.staff1.staff_id}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        req.refresh_from_db()
        self.assertEqual(req.status, "ASSIGNED")
        self.assertEqual(req.assigned_staff, self.staff1)
        self.assertFalse(req.staff_marked_pending)

    def test_assign_pickup_by_username(self):
        req = WastePickupRequest.objects.create(
            user=self.citizen_user,
            location_name="300 Main Street",
            latitude=12.971,
            longitude=77.594,
            status="PENDING"
        )
        # Pass username string "staff1" instead of numeric ID
        response = self.client.post(
            "/api/waste/assign-pickup/",
            {"request_id": req.id, "staff_id": "staff1"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        req.refresh_from_db()
        self.assertEqual(req.status, "ASSIGNED")
        self.assertEqual(req.assigned_staff, self.staff1)

    def test_staff_my_tasks_endpoint_and_isolation(self):
        # self.pickup_request is assigned to staff1
        # Staff 1 logs in and calls my-tasks
        self.client.force_authenticate(user=self.staff_user1)
        response1 = self.client.get("/api/waste/staff/my-tasks/")
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        tasks1 = response1.data.get("tasks", [])
        self.assertTrue(any(t["request_id"] == self.pickup_request.id for t in tasks1))

        # Staff 2 logs in and calls my-tasks
        self.client.force_authenticate(user=self.staff_user2)
        response2 = self.client.get("/api/waste/staff/my-tasks/")
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        tasks2 = response2.data.get("tasks", [])
        self.assertFalse(any(t["request_id"] == self.pickup_request.id for t in tasks2))

    def test_unauthenticated_user_cannot_access_history(self):
        response = self.client.get("/api/waste/user/pickup-history/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_can_view_own_completed_pickup_history(self):
        # 1. Complete the pickup request for citizen_user
        self.pickup_request.status = "COMPLETED"
        self.pickup_request.save()

        WastePickupImage.objects.create(
            pickup_request=self.pickup_request,
            image=create_test_image(),
            waste_type="Plastic",
            confidence=0.92
        )

        test_img = create_test_image()
        collection = WasteCollection.objects.create(
            pickup_request=self.pickup_request,
            staff=self.staff1,
            completion_image=test_img,
            estimated_weight=7.25
        )

        # 2. Authenticate as citizen_user and fetch history
        self.client.force_authenticate(user=self.citizen_user)
        response = self.client.get("/api/waste/user/pickup-history/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("success"))
        history = response.data.get("history", [])
        self.assertEqual(len(history), 1)

        item = history[0]
        self.assertEqual(item["request_id"], self.pickup_request.id)
        self.assertEqual(item["pickup_location"], "123 Main Street")
        self.assertEqual(item["ward"], "Ward 1")
        self.assertEqual(item["waste_type"], "Plastic")
        self.assertEqual(item["status"], "COMPLETED")
        self.assertEqual(item["estimated_weight"], 7.25)
        self.assertIsNotNone(item["completion_image"])
        self.assertIsNotNone(item["completed_at"])
        self.assertIsNotNone(item["completed_date"])
        self.assertIsNotNone(item["completed_time"])
        self.assertIsNotNone(item["payment_qr_data"])

    def test_user_isolation_cannot_view_other_user_history(self):
        # 1. Create a completed pickup for citizen 1
        self.pickup_request.status = "COMPLETED"
        self.pickup_request.save()
        WasteCollection.objects.create(
            pickup_request=self.pickup_request,
            staff=self.staff1,
            completion_image=create_test_image(),
            estimated_weight=5.0
        )

        # 2. Create citizen 2
        citizen_user2 = User.objects.create_user(
            username="citizen2",
            email="citizen2@example.com",
            password="Password123!"
        )
        UserProfile.objects.create(
            user=citizen_user2,
            name="Jane Citizen",
            phone="9876543219",
            ward=self.ward,
            role="CITIZEN"
        )

        # 3. Authenticate as citizen 2 and query history
        self.client.force_authenticate(user=citizen_user2)
        response = self.client.get("/api/waste/user/pickup-history/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        history = response.data.get("history", [])
        # Citizen 2 must not see Citizen 1's history
        self.assertEqual(len(history), 0)
        self.assertFalse(any(h["request_id"] == self.pickup_request.id for h in history))

    def test_only_completed_pickups_in_completed_history(self):
        # 1. Citizen 1 has one PENDING request and one COMPLETED request
        pending_req = WastePickupRequest.objects.create(
            user=self.citizen_user,
            location_name="999 Pending Lane",
            latitude=12.971,
            longitude=77.594,
            status="PENDING"
        )

        completed_req = WastePickupRequest.objects.create(
            user=self.citizen_user,
            location_name="888 Completed Road",
            latitude=12.972,
            longitude=77.595,
            status="COMPLETED",
            assigned_staff=self.staff1
        )
        WasteCollection.objects.create(
            pickup_request=completed_req,
            staff=self.staff1,
            completion_image=create_test_image(),
            estimated_weight=3.5
        )

        # 2. Query history
        self.client.force_authenticate(user=self.citizen_user)
        response = self.client.get("/api/waste/user/pickup-history/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        history = response.data.get("history", [])

        history_ids = [h["request_id"] for h in history]
        self.assertIn(completed_req.id, history_ids)
        self.assertNotIn(pending_req.id, history_ids)

    def test_history_sorting_by_completion_date(self):
        import time

        # Complete req 1
        req1 = WastePickupRequest.objects.create(
            user=self.citizen_user,
            location_name="First Location",
            latitude=12.971,
            longitude=77.594,
            status="COMPLETED",
            assigned_staff=self.staff1
        )
        c1 = WasteCollection.objects.create(
            pickup_request=req1,
            staff=self.staff1,
            completion_image=create_test_image(),
            estimated_weight=2.0
        )

        # Complete req 2 later
        req2 = WastePickupRequest.objects.create(
            user=self.citizen_user,
            location_name="Second Location",
            latitude=12.972,
            longitude=77.595,
            status="COMPLETED",
            assigned_staff=self.staff1
        )
        c2 = WasteCollection.objects.create(
            pickup_request=req2,
            staff=self.staff1,
            completion_image=create_test_image(),
            estimated_weight=4.0
        )

        self.client.force_authenticate(user=self.citizen_user)
        response = self.client.get("/api/waste/user/pickup-history/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        history = response.data.get("history", [])
        self.assertGreaterEqual(len(history), 2)
        # Most recent completion should be first
        self.assertEqual(history[0]["request_id"], req2.id)

    def test_user_latest_pickup_unauthenticated(self):
        response = self.client.get("/api/waste/user/latest-pickup/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_latest_pickup_empty_state(self):
        new_user = User.objects.create_user(username="newuser", email="newuser@example.com", password="Password123!")
        UserProfile.objects.create(user=new_user, name="New Resident", phone="9998887776", ward=self.ward, role="CITIZEN")
        self.client.force_authenticate(user=new_user)

        response = self.client.get("/api/waste/user/latest-pickup/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("success"))
        self.assertFalse(response.data.get("has_pickup"))
        self.assertIsNone(response.data.get("latest_pickup"))

    def test_user_latest_pickup_returns_most_recent_request_and_details(self):
        # 1. First request
        req1 = WastePickupRequest.objects.create(
            user=self.citizen_user,
            location_name="Old Location 1",
            latitude=12.971,
            longitude=77.594,
            status="COMPLETED"
        )

        # 2. Second request (most recent)
        req2 = WastePickupRequest.objects.create(
            user=self.citizen_user,
            location_name="Latest Location 2",
            latitude=12.975,
            longitude=77.598,
            status="ASSIGNED",
            assigned_staff=self.staff1
        )
        WastePickupImage.objects.create(
            pickup_request=req2,
            image=create_test_image(),
            waste_type="Plastic",
            confidence=0.965
        )

        self.client.force_authenticate(user=self.citizen_user)
        response = self.client.get("/api/waste/user/latest-pickup/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("success"))
        self.assertTrue(response.data.get("has_pickup"))
        latest = response.data.get("latest_pickup")
        self.assertIsNotNone(latest)
        self.assertEqual(latest["request_id"], req2.id)
        self.assertEqual(latest["pickup_location"], "Latest Location 2")
        self.assertEqual(latest["waste_type"], "Plastic")
        self.assertEqual(latest["status"], "ASSIGNED")
        self.assertEqual(latest["assigned_staff"], "Staff Member One")
        self.assertEqual(latest["ai_confidence"], 96.5)

    def test_user_latest_pickup_user_isolation(self):
        # Citizen 1 has self.pickup_request
        # Citizen 2 queries latest pickup
        citizen2 = User.objects.create_user(username="citizen_iso", email="iso@example.com", password="Password123!")
        UserProfile.objects.create(user=citizen2, name="Iso Citizen", phone="9988776655", ward=self.ward, role="CITIZEN")

        self.client.force_authenticate(user=citizen2)
        response = self.client.get("/api/waste/user/latest-pickup/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get("has_pickup"))
        self.assertIsNone(response.data.get("latest_pickup"))


class WasteComplaintWorkflowTests(TestCase):

    def setUp(self):
        # 1. Create Ward
        self.ward = Ward.objects.create(ward_name="Central Ward", location="City Center")

        # 2. Create Citizen 1
        self.citizen1 = User.objects.create_user(
            username="citizen_complaint1",
            email="citizen1@waste.com",
            password="Password123!"
        )
        self.citizen_profile1 = UserProfile.objects.create(
            user=self.citizen1,
            name="Alice Smith",
            phone="9876500001",
            ward=self.ward,
            role="CITIZEN"
        )

        # 3. Create Citizen 2
        self.citizen2 = User.objects.create_user(
            username="citizen_complaint2",
            email="citizen2@waste.com",
            password="Password123!"
        )
        self.citizen_profile2 = UserProfile.objects.create(
            user=self.citizen2,
            name="Bob Jones",
            phone="9876500002",
            ward=self.ward,
            role="CITIZEN"
        )

        # 4. Create Staff 1
        self.staff_user1 = User.objects.create_user(
            username="staff_john",
            email="staffjohn@waste.com",
            password="Password123!"
        )
        self.staff_profile1 = UserProfile.objects.create(
            user=self.staff_user1,
            name="John Staff",
            phone="9876500011",
            ward=self.ward,
            role="STAFF"
        )
        self.staff1 = Staff.objects.create(
            user=self.staff_user1,
            phone="9876500011",
            designation="STAFF",
            date_of_joining="2024-01-01"
        )

        # 5. Create Staff 2
        self.staff_user2 = User.objects.create_user(
            username="staff_mary",
            email="staffmary@waste.com",
            password="Password123!"
        )
        self.staff_profile2 = UserProfile.objects.create(
            user=self.staff_user2,
            name="Mary Staff",
            phone="9876500022",
            ward=self.ward,
            role="STAFF"
        )
        self.staff2 = Staff.objects.create(
            user=self.staff_user2,
            phone="9876500022",
            designation="STAFF",
            date_of_joining="2024-01-01"
        )

        self.client = APIClient()

    def test_unauthenticated_complaint_creation_blocked(self):
        response = self.client.post(
            "/api/waste/complaints/",
            {
                "location_name": "Government Hospital, Kottayam",
                "description": "Garbage dumped near hospital gate"
            }
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_complaint_high_priority_hospital(self):
        self.client.force_authenticate(user=self.citizen1)
        test_img = create_test_image()
        response = self.client.post(
            "/api/waste/complaints/",
            {
                "location_name": "Government Hospital, Kottayam",
                "latitude": 9.5916,
                "longitude": 76.5222,
                "description": "Medical and plastic waste dumped near main gate",
                "image": test_img
            },
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data.get("complaint", {})
        self.assertEqual(data.get("priority"), "HIGH")
        self.assertEqual(data.get("status"), "NEW")
        self.assertEqual(data.get("user_name"), "Alice Smith")
        self.assertIn("complaint_images/", data.get("image", "") or data.get("image_url", ""))

    def test_create_complaint_medium_priority_school(self):
        self.client.force_authenticate(user=self.citizen1)
        response = self.client.post(
            "/api/waste/complaints/",
            {
                "location_name": "St. Mary's School, Erattupetta",
                "latitude": 9.6916,
                "longitude": 76.7822,
                "description": "Overflowing waste bin outside school premises",
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data.get("complaint", {})
        self.assertEqual(data.get("priority"), "MEDIUM")
        self.assertEqual(data.get("status"), "NEW")

    def test_create_complaint_medium_priority_college(self):
        self.client.force_authenticate(user=self.citizen1)
        response = self.client.post(
            "/api/waste/complaints/",
            {
                "location_name": "Engineering College Campus, Ward 4",
                "description": "Dumped paper and plastic waste near campus entrance",
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data.get("complaint", {})
        self.assertEqual(data.get("priority"), "MEDIUM")

    def test_create_complaint_low_priority_roadside(self):
        self.client.force_authenticate(user=self.citizen1)
        response = self.client.post(
            "/api/waste/complaints/",
            {
                "location_name": "Normal Roadside Public Area, Street 12",
                "latitude": 9.5000,
                "longitude": 76.5000,
                "description": "Litter on the sidewalk",
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data.get("complaint", {})
        self.assertEqual(data.get("priority"), "LOW")
        self.assertEqual(data.get("status"), "NEW")

    def test_admin_complaints_sorting_high_medium_low(self):
        # Create Low priority first
        c_low = WasteComplaint.objects.create(
            user=self.citizen1,
            location_name="General Public Road",
            description="Litter",
            priority="LOW",
            status="NEW"
        )
        # Create Medium priority second
        c_med = WasteComplaint.objects.create(
            user=self.citizen1,
            location_name="National High School Area",
            description="School waste",
            priority="MEDIUM",
            status="NEW"
        )
        # Create High priority third
        c_high = WasteComplaint.objects.create(
            user=self.citizen1,
            location_name="General Hospital Ward",
            description="Medical waste",
            priority="HIGH",
            status="NEW"
        )

        response = self.client.get("/api/waste/admin/complaints/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        complaints = response.data.get("complaints", [])
        self.assertGreaterEqual(len(complaints), 3)

        # Check order: HIGH first, then MEDIUM, then LOW
        priorities = [c["priority"] for c in complaints[:3]]
        self.assertEqual(priorities, ["HIGH", "MEDIUM", "LOW"])

    def test_admin_assign_staff_by_numeric_id(self):
        complaint = WasteComplaint.objects.create(
            user=self.citizen1,
            location_name="City Hospital Road",
            description="Illegal waste dumping",
            priority="HIGH",
            status="NEW"
        )

        response = self.client.post(
            "/api/waste/admin/complaints/assign/",
            {
                "complaint_id": complaint.id,
                "staff_id": self.staff1.staff_id
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, "ASSIGNED")
        self.assertEqual(complaint.assigned_staff, self.staff1)

    def test_admin_assign_staff_by_username_lookup(self):
        complaint = WasteComplaint.objects.create(
            user=self.citizen1,
            location_name="City High School",
            description="Garbage dump",
            priority="MEDIUM",
            status="NEW"
        )

        response = self.client.post(
            f"/api/waste/admin/complaints/{complaint.id}/assign/",
            {
                "staff_id": "staff_mary"
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, "ASSIGNED")
        self.assertEqual(complaint.assigned_staff, self.staff2)

    def test_staff_assigned_complaints_isolation(self):
        # Create complaint assigned to staff1
        c1 = WasteComplaint.objects.create(
            user=self.citizen1,
            location_name="Hospital Gate",
            description="Task for John",
            priority="HIGH",
            status="ASSIGNED",
            assigned_staff=self.staff1
        )
        # Create complaint assigned to staff2
        c2 = WasteComplaint.objects.create(
            user=self.citizen2,
            location_name="School Ground",
            description="Task for Mary",
            priority="MEDIUM",
            status="ASSIGNED",
            assigned_staff=self.staff2
        )

        # Authenticate as staff 1
        self.client.force_authenticate(user=self.staff_user1)
        response1 = self.client.get("/api/waste/staff/my-complaints/")
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        task_ids1 = [c["id"] for c in response1.data.get("complaints", [])]
        self.assertIn(c1.id, task_ids1)
        self.assertNotIn(c2.id, task_ids1)

        # Authenticate as staff 2
        self.client.force_authenticate(user=self.staff_user2)
        response2 = self.client.get("/api/waste/staff/my-complaints/")
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        task_ids2 = [c["id"] for c in response2.data.get("complaints", [])]
        self.assertIn(c2.id, task_ids2)
        self.assertNotIn(c1.id, task_ids2)

    def test_staff_complaint_status_update_in_progress(self):
        complaint = WasteComplaint.objects.create(
            user=self.citizen1,
            location_name="Primary Health Centre",
            description="Waste near PHC",
            priority="HIGH",
            status="ASSIGNED",
            assigned_staff=self.staff1
        )

        self.client.force_authenticate(user=self.staff_user1)
        response = self.client.post(
            f"/api/waste/staff/complaints/{complaint.id}/update/",
            {"status": "IN_PROGRESS"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, "IN_PROGRESS")

    def test_staff_resolve_complaint_with_proof_image(self):
        complaint = WasteComplaint.objects.create(
            user=self.citizen1,
            location_name="City Hospital Gate",
            description="Waste pile outside gate",
            priority="HIGH",
            status="IN_PROGRESS",
            assigned_staff=self.staff1
        )

        self.client.force_authenticate(user=self.staff_user1)
        proof = create_test_image()
        response = self.client.post(
            f"/api/waste/staff/complaints/{complaint.id}/update/",
            {"status": "RESOLVED", "proof_image": proof},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, "RESOLVED")
        self.assertIsNotNone(complaint.resolved_at)
        self.assertTrue(bool(complaint.proof_image))

    def test_staff_resolve_without_proof_image_rejected(self):
        complaint = WasteComplaint.objects.create(
            user=self.citizen1,
            location_name="City School Road",
            description="School gate waste",
            priority="MEDIUM",
            status="IN_PROGRESS",
            assigned_staff=self.staff1
        )

        self.client.force_authenticate(user=self.staff_user1)
        response = self.client.post(
            f"/api/waste/staff/complaints/{complaint.id}/update/",
            {"status": "RESOLVED"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("proof image", response.data.get("error", "").lower())
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, "IN_PROGRESS")

    def test_admin_assign_staff_from_any_ward_to_complaint(self):
        # Create Ward 2 and Staff in Ward 2
        ward2 = Ward.objects.create(ward_name="North Ward", location="North Sector")
        staff_user_w2 = User.objects.create_user(username="staff_w2", email="w2@waste.com", password="Password123!")
        UserProfile.objects.create(user=staff_user_w2, name="North Staff", phone="9876500099", ward=ward2, role="STAFF")
        staff_w2 = Staff.objects.create(user=staff_user_w2, phone="9876500099", designation="STAFF", date_of_joining="2024-01-01")

        # Complaint is in Ward 1
        complaint = WasteComplaint.objects.create(
            user=self.citizen1,
            location_name="Central Ward Market",
            description="Market garbage",
            priority="LOW",
            status="NEW"
        )

        # Admin assigns Staff from Ward 2 to Complaint in Ward 1
        response = self.client.post(
            "/api/waste/admin/complaints/assign/",
            {"complaint_id": complaint.id, "staff_id": staff_w2.staff_id}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, "ASSIGNED")
        self.assertEqual(complaint.assigned_staff_id, staff_w2.staff_id)

    def test_all_staff_list_endpoint(self):
        response = self.client.get("/api/waste/staff/all/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        staff_ids = [s["staff_id"] for s in response.data]
        self.assertIn(self.staff1.staff_id, staff_ids)
        self.assertIn(self.staff2.staff_id, staff_ids)

    def test_user_complaints_isolation(self):
        c1 = WasteComplaint.objects.create(
            user=self.citizen1,
            location_name="Loc 1",
            description="Desc 1",
            priority="LOW",
            status="NEW"
        )
        c2 = WasteComplaint.objects.create(
            user=self.citizen2,
            location_name="Loc 2",
            description="Desc 2",
            priority="LOW",
            status="NEW"
        )

        self.client.force_authenticate(user=self.citizen1)
        response = self.client.get("/api/waste/complaints/my/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [c["id"] for c in response.data.get("complaints", [])]
        self.assertIn(c1.id, ids)
        self.assertNotIn(c2.id, ids)

    def test_user_complaint_detail_security_owner_access(self):
        complaint = WasteComplaint.objects.create(
            user=self.citizen1,
            location_name="Civil Station Road",
            description="Market plastic waste",
            priority="HIGH",
            status="NEW",
            latitude=9.6823,
            longitude=76.8421
        )

        self.client.force_authenticate(user=self.citizen1)
        response = self.client.get(f"/api/waste/complaints/{complaint.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("success"))
        c_data = response.data.get("complaint")
        self.assertEqual(c_data["id"], complaint.id)
        self.assertEqual(c_data["location_name"], "Civil Station Road")
        self.assertEqual(c_data["priority"], "HIGH")
        self.assertEqual(c_data["status"], "NEW")
        self.assertEqual(float(c_data["latitude"]), 9.6823)
        self.assertEqual(float(c_data["longitude"]), 76.8421)

    def test_user_complaint_detail_security_cross_user_denied(self):
        complaint = WasteComplaint.objects.create(
            user=self.citizen1,
            location_name="Private Lane",
            description="Private waste",
            priority="LOW",
            status="NEW"
        )

        # Citizen 2 attempts to access Citizen 1's complaint detail
        self.client.force_authenticate(user=self.citizen2)
        response = self.client.get(f"/api/waste/complaints/{complaint.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(response.data.get("success"))

    def test_user_complaint_detail_includes_proof_image_and_dates(self):
        complaint = WasteComplaint.objects.create(
            user=self.citizen1,
            location_name="Hospital Junction",
            description="Cleared waste area",
            priority="HIGH",
            status="RESOLVED",
            proof_image=create_test_image(),
            resolved_at=timezone.now()
        )

        self.client.force_authenticate(user=self.citizen1)
        response = self.client.get(f"/api/waste/complaints/{complaint.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        c_data = response.data.get("complaint")
        self.assertEqual(c_data["status"], "RESOLVED")
        self.assertIsNotNone(c_data.get("proof_image_url"))
        self.assertIsNotNone(c_data.get("resolved_at"))
        self.assertIsNotNone(c_data.get("resolved_at_formatted"))









