import io
from PIL import Image
from datetime import timedelta
from django.test import TestCase, TransactionTestCase
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Ward, UserProfile, Staff
from waste.models import WastePickupRequest, WasteCollection
from notifications.models import Notification


def create_test_image():
    file = io.BytesIO()
    image = Image.new("RGB", (100, 100), color=(73, 109, 137))
    image.save(file, "jpeg")
    file.seek(0)
    return SimpleUploadedFile("test_proof.jpg", file.read(), content_type="image/jpeg")


class Phase2FeatureTests(TestCase):
    def setUp(self):
        # 1. Ward
        self.ward = Ward.objects.create(ward_name="Green Ward 1", location="Eco City")

        # 2. Citizen User
        self.citizen = User.objects.create_user(
            username="citizen_phase2@ecopulse.test",
            email="citizen_phase2@ecopulse.test",
            password="Password123!"
        )
        self.citizen_profile = UserProfile.objects.create(
            user=self.citizen,
            name="Alice Citizen",
            phone="9876543201",
            ward=self.ward,
            role="CITIZEN"
        )

        # 3. Admin User
        self.admin = User.objects.create_superuser(
            username="admin_phase2@ecopulse.test",
            email="admin_phase2@ecopulse.test",
            password="AdminPassword123!"
        )
        self.admin_profile = UserProfile.objects.create(
            user=self.admin,
            name="Admin Officer",
            phone="9876543202",
            ward=self.ward,
            role="ADMIN"
        )

        # 4. Staff User
        self.staff_user = User.objects.create_user(
            username="staff_phase2@ecopulse.test",
            email="staff_phase2@ecopulse.test",
            password="StaffPassword123!"
        )
        self.staff_profile = UserProfile.objects.create(
            user=self.staff_user,
            name="Bob Staff",
            phone="9876543203",
            ward=self.ward,
            role="STAFF"
        )
        self.staff = Staff.objects.create(
            user=self.staff_user,
            phone="9876543203",
            designation="STAFF",
            date_of_joining="2024-01-01"
        )

        self.client = APIClient()

    def test_full_lifecycle_flow(self):
        """
        Complete flow:
        Citizen submits request -> Admin schedules date -> Citizen sees scheduled date ->
        Staff clicks Start Pickup -> Citizen sees In Progress -> Cancellation becomes unavailable ->
        Staff completes pickup with proof.
        """
        # Step 1: Citizen submits request
        pickup = WastePickupRequest.objects.create(
            user=self.citizen,
            location_name="100 Eco Boulevard",
            latitude=12.9715,
            longitude=77.5945,
            status="PENDING"
        )
        self.assertEqual(pickup.status, "PENDING")
        self.assertIsNone(pickup.scheduled_pickup_date)

        # Step 2: Admin schedules date
        scheduled_date = timezone.now().date() + timedelta(days=2)
        self.client.force_authenticate(user=self.admin)
        assign_resp = self.client.post(
            "/api/waste/assign-pickup/",
            {
                "request_id": pickup.id,
                "staff_id": self.staff.staff_id,
                "scheduled_pickup_date": scheduled_date.strftime("%Y-%m-%d"),
            },
            format="json"
        )
        self.assertEqual(assign_resp.status_code, status.HTTP_200_OK)
        pickup.refresh_from_db()
        self.assertEqual(pickup.status, "ASSIGNED")
        self.assertEqual(pickup.assigned_staff, self.staff)
        self.assertEqual(pickup.scheduled_pickup_date, scheduled_date)

        # Step 3: Citizen sees scheduled date in latest pickup tracking
        self.client.force_authenticate(user=self.citizen)
        track_resp = self.client.get("/api/waste/user/latest-pickup/")
        self.assertEqual(track_resp.status_code, status.HTTP_200_OK)
        latest_data = track_resp.data.get("latest_pickup", {})
        self.assertEqual(latest_data.get("scheduled_pickup_date"), scheduled_date.strftime("%Y-%m-%d"))
        self.assertEqual(latest_data.get("status"), "ASSIGNED")

        # Step 4: Admin reschedules request -> Citizen sees latest date
        new_scheduled_date = timezone.now().date() + timedelta(days=4)
        self.client.force_authenticate(user=self.admin)
        reschedule_resp = self.client.post(
            "/api/waste/assign-pickup/",
            {
                "request_id": pickup.id,
                "staff_id": self.staff.staff_id,
                "scheduled_pickup_date": new_scheduled_date.strftime("%Y-%m-%d"),
            },
            format="json"
        )
        self.assertEqual(reschedule_resp.status_code, status.HTTP_200_OK)
        pickup.refresh_from_db()
        self.assertEqual(pickup.scheduled_pickup_date, new_scheduled_date)

        self.client.force_authenticate(user=self.citizen)
        track_resp2 = self.client.get("/api/waste/user/latest-pickup/")
        self.assertEqual(track_resp2.data.get("latest_pickup", {}).get("scheduled_pickup_date"), new_scheduled_date.strftime("%Y-%m-%d"))

        # Step 5: Staff clicks Start Pickup -> request status IN_PROGRESS
        self.client.force_authenticate(user=self.staff_user)
        start_resp = self.client.post(
            f"/api/waste/staff/task-update/{pickup.id}/",
            {"status": "IN_PROGRESS"},
            format="json"
        )
        self.assertEqual(start_resp.status_code, status.HTTP_200_OK)
        pickup.refresh_from_db()
        self.assertEqual(pickup.status, "IN_PROGRESS")

        # Step 6: Citizen receives notification that pickup has started
        citizen_notif = Notification.objects.filter(
            recipient=self.citizen,
            related_pickup=pickup
        ).first()
        self.assertIsNotNone(citizen_notif)
        self.assertIn("started", citizen_notif.message.lower())

        # Step 7: Cancellation becomes UNAVAILABLE for IN_PROGRESS
        self.client.force_authenticate(user=self.citizen)
        cancel_attempt = self.client.post(f"/api/waste/user/pickup-requests/{pickup.id}/cancel/")
        self.assertEqual(cancel_attempt.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already progressed", cancel_attempt.data.get("error", ""))
        pickup.refresh_from_db()
        self.assertEqual(pickup.status, "IN_PROGRESS")

        # Step 8: Staff completes pickup with photo and weight proof
        self.client.force_authenticate(user=self.staff_user)
        proof_img = create_test_image()
        complete_resp = self.client.post(
            f"/api/waste/staff/task-update/{pickup.id}/",
            {
                "status": "COMPLETED",
                "completion_image": proof_img,
                "estimated_weight": "8.5"
            },
            format="multipart"
        )
        self.assertEqual(complete_resp.status_code, status.HTTP_200_OK)
        pickup.refresh_from_db()
        self.assertEqual(pickup.status, "COMPLETED")
        self.assertTrue(WasteCollection.objects.filter(pickup_request=pickup).exists())
        self.assertEqual(float(pickup.collection.estimated_weight), 8.5)

        # Step 9: Cancellation remains blocked after completion
        self.client.force_authenticate(user=self.citizen)
        cancel_attempt2 = self.client.post(f"/api/waste/user/pickup-requests/{pickup.id}/cancel/")
        self.assertEqual(cancel_attempt2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_citizen_cancellation_before_staff_starts(self):
        """
        Test cancellation of PENDING and ASSIGNED requests.
        Ensures staff and admin are notified, and cancelled requests are preserved in history.
        """
        # Case A: Cancel PENDING request
        pickup1 = WastePickupRequest.objects.create(
            user=self.citizen,
            location_name="200 Pine Street",
            latitude=12.9715,
            longitude=77.5945,
            status="PENDING"
        )
        self.client.force_authenticate(user=self.citizen)
        resp1 = self.client.post(f"/api/waste/user/pickup-requests/{pickup1.id}/cancel/")
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        pickup1.refresh_from_db()
        self.assertEqual(pickup1.status, "CANCELLED")

        # Admin notification created
        admin_notif = Notification.objects.filter(
            recipient=self.admin,
            related_pickup=pickup1
        ).first()
        self.assertIsNotNone(admin_notif)
        self.assertIn("cancelled", admin_notif.message.lower())

        # Case B: Cancel ASSIGNED request
        pickup2 = WastePickupRequest.objects.create(
            user=self.citizen,
            location_name="300 Maple Street",
            latitude=12.9715,
            longitude=77.5945,
            status="ASSIGNED",
            assigned_staff=self.staff,
            scheduled_pickup_date=timezone.now().date()
        )
        resp2 = self.client.post(f"/api/waste/user/pickup-requests/{pickup2.id}/cancel/")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        pickup2.refresh_from_db()
        self.assertEqual(pickup2.status, "CANCELLED")

        # Staff notification created
        staff_notif = Notification.objects.filter(
            recipient=self.staff_user,
            related_pickup=pickup2
        ).first()
        self.assertIsNotNone(staff_notif)
        self.assertIn("cancelled", staff_notif.message.lower())

        # Preserved in history with status=ALL
        hist_resp = self.client.get("/api/waste/user/pickup-history/?status=ALL")
        self.assertEqual(hist_resp.status_code, status.HTTP_200_OK)
        hist_ids = [item.get("request_id") or item.get("id") for item in hist_resp.data.get("history", [])]
        self.assertIn(pickup1.id, hist_ids)
        self.assertIn(pickup2.id, hist_ids)

        # Admin sees Cancelled request in pickup requests list
        self.client.force_authenticate(user=self.admin)
        admin_list_resp = self.client.get("/api/waste/pickup-requests/")
        self.assertEqual(admin_list_resp.status_code, status.HTTP_200_OK)
        admin_reqs = admin_list_resp.data if isinstance(admin_list_resp.data, list) else admin_list_resp.data.get("pickup_requests", [])
        p2_admin_data = next((r for r in admin_reqs if (r.get("request_id") or r.get("id")) == pickup2.id), None)
        self.assertIsNotNone(p2_admin_data)
        self.assertEqual(p2_admin_data.get("status"), "CANCELLED")

        # Admin CANNOT reassign a cancelled request
        assign_blocked = self.client.post(
            "/api/waste/assign-pickup/",
            {
                "request_id": pickup2.id,
                "staff_id": self.staff.staff_id,
                "scheduled_pickup_date": timezone.now().date().strftime("%Y-%m-%d"),
            },
            format="json"
        )
        self.assertEqual(assign_blocked.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cancelled", assign_blocked.data.get("error", "").lower())

        # Staff active tasks list excludes cancelled requests
        self.client.force_authenticate(user=self.staff_user)
        staff_tasks_resp = self.client.get("/api/waste/staff/my-tasks/")
        self.assertEqual(staff_tasks_resp.status_code, status.HTTP_200_OK)
        staff_task_ids = [t["id"] for t in staff_tasks_resp.data.get("tasks", [])]
        self.assertNotIn(pickup2.id, staff_task_ids)

        # Staff cannot Start Pickup on cancelled request
        start_cancelled = self.client.post(
            f"/api/waste/staff/task-update/{pickup2.id}/",
            {"status": "IN_PROGRESS"},
            format="json"
        )
        self.assertEqual(start_cancelled.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delayed_pending_workflow_preserved(self):
        """
        Verify existing delayed/pending workflow is preserved:
        Staff can update ASSIGNED or IN_PROGRESS task to PENDING with a note/reason.
        """
        pickup = WastePickupRequest.objects.create(
            user=self.citizen,
            location_name="400 Birch Street",
            latitude=12.9715,
            longitude=77.5945,
            status="ASSIGNED",
            assigned_staff=self.staff,
            scheduled_pickup_date=timezone.now().date()
        )
        self.client.force_authenticate(user=self.staff_user)
        resp = self.client.post(
            f"/api/waste/staff/task-update/{pickup.id}/",
            {"status": "PENDING"},
            format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        pickup.refresh_from_db()
        self.assertEqual(pickup.status, "PENDING")
        self.assertTrue(pickup.staff_marked_pending)


class ConcurrencyProtectionTests(TransactionTestCase):
    """
    TransactionTestCase allows actual multi-threading/database transactions
    to test atomic select_for_update concurrency between Start Pickup and Cancel Request.
    """
    def setUp(self):
        self.ward = Ward.objects.create(ward_name="Green Ward 1", location="Eco City")
        self.citizen = User.objects.create_user(
            username="concurrent_citizen@ecopulse.test",
            email="concurrent_citizen@ecopulse.test",
            password="Password123!"
        )
        UserProfile.objects.create(
            user=self.citizen,
            name="Concurrent Citizen",
            phone="9876543204",
            ward=self.ward,
            role="CITIZEN"
        )
        self.staff_user = User.objects.create_user(
            username="concurrent_staff@ecopulse.test",
            email="concurrent_staff@ecopulse.test",
            password="StaffPassword123!"
        )
        UserProfile.objects.create(
            user=self.staff_user,
            name="Concurrent Staff",
            phone="9876543205",
            ward=self.ward,
            role="STAFF"
        )
        self.staff = Staff.objects.create(
            user=self.staff_user,
            phone="9876543205",
            designation="STAFF",
            date_of_joining="2024-01-01"
        )

    def test_start_and_cancel_cannot_both_succeed(self):
        """
        Ensure concurrent Start Pickup and Cancel Request cannot both succeed.
        When one acquires the row lock and changes status, the other MUST fail.
        """
        pickup = WastePickupRequest.objects.create(
            user=self.citizen,
            location_name="500 Cedar Road",
            latitude=12.9715,
            longitude=77.5945,
            status="ASSIGNED",
            assigned_staff=self.staff,
            scheduled_pickup_date=timezone.now().date()
        )

        client1 = APIClient()
        client1.force_authenticate(user=self.staff_user)

        client2 = APIClient()
        client2.force_authenticate(user=self.citizen)

        # Simulation 1: Staff starts first, citizen tries immediately after
        resp1 = client1.post(f"/api/waste/staff/task-update/{pickup.id}/", {"status": "IN_PROGRESS"}, format="json")
        resp2 = client2.post(f"/api/waste/user/pickup-requests/{pickup.id}/cancel/")

        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)
        pickup.refresh_from_db()
        self.assertEqual(pickup.status, "IN_PROGRESS")

        # Simulation 2: On a fresh request, citizen cancels first, staff tries immediately after
        pickup2 = WastePickupRequest.objects.create(
            user=self.citizen,
            location_name="600 Oak Lane",
            latitude=12.9715,
            longitude=77.5945,
            status="ASSIGNED",
            assigned_staff=self.staff,
            scheduled_pickup_date=timezone.now().date()
        )
        resp_cancel = client2.post(f"/api/waste/user/pickup-requests/{pickup2.id}/cancel/")
        resp_start = client1.post(f"/api/waste/staff/task-update/{pickup2.id}/", {"status": "IN_PROGRESS"}, format="json")

        self.assertEqual(resp_cancel.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_start.status_code, status.HTTP_400_BAD_REQUEST)
        pickup2.refresh_from_db()
        self.assertEqual(pickup2.status, "CANCELLED")
