import io
from PIL import Image
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Ward, UserProfile, Staff
from waste.models import WastePickupRequest, WastePickupImage, WasteCollection
from waste.serializers import WastePickupRequestSerializer


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






