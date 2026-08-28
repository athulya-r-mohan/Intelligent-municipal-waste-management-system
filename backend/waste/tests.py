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




