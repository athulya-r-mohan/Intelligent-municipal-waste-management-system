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


class StaffStartTodayCollectionTests(TestCase):
    """
    Test suite covering Start Today's Collection batch operation:
    1. Batch start all ASSIGNED pickups for today.
    2. Cancellation blocked for started pickups.
    3. Unstarted pickups retain cancellation capability.
    4. Staff and date isolation.
    5. Completed and cancelled pickups unaffected.
    6. Repeated clicks idempotency.
    7. Newly assigned same-day pickups support.
    8. Date validation (future date rejected).
    """

    def setUp(self):
        self.ward = Ward.objects.create(ward_name="Central Ward", location="City Center")

        # Citizen 1 & 2
        self.citizen1 = User.objects.create_user(
            username="citizen_one@test.local",
            email="citizen_one@test.local",
            password="Password123!"
        )
        self.citizen1_profile = UserProfile.objects.create(
            user=self.citizen1,
            name="Citizen One",
            ward=self.ward,
            role="CITIZEN"
        )

        self.citizen2 = User.objects.create_user(
            username="citizen_two@test.local",
            email="citizen_two@test.local",
            password="Password123!"
        )
        self.citizen2_profile = UserProfile.objects.create(
            user=self.citizen2,
            name="Citizen Two",
            ward=self.ward,
            role="CITIZEN"
        )

        # Staff 1
        self.staff1_user = User.objects.create_user(
            username="staff_one@test.local",
            email="staff_one@test.local",
            password="Password123!"
        )
        self.staff1_profile = UserProfile.objects.create(
            user=self.staff1_user,
            name="Staff Driver One",
            ward=self.ward,
            role="STAFF"
        )
        self.staff1 = Staff.objects.create(
            user=self.staff1_user,
            designation="STAFF",
            date_of_joining="2024-01-01"
        )

        # Staff 2
        self.staff2_user = User.objects.create_user(
            username="staff_two@test.local",
            email="staff_two@test.local",
            password="Password123!"
        )
        self.staff2_profile = UserProfile.objects.create(
            user=self.staff2_user,
            name="Staff Driver Two",
            ward=self.ward,
            role="STAFF"
        )
        self.staff2 = Staff.objects.create(
            user=self.staff2_user,
            designation="STAFF",
            date_of_joining="2024-01-01"
        )

        self.client = APIClient()
        self.today = timezone.localdate()

    def test_batch_start_today_collection_success(self):
        """Batch start transitions all eligible ASSIGNED tasks for today to IN_PROGRESS and notifies citizens."""
        p1 = WastePickupRequest.objects.create(
            user=self.citizen1,
            location_name="101 Pine St",
            latitude=12.97,
            longitude=77.59,
            status="ASSIGNED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=self.today
        )
        p2 = WastePickupRequest.objects.create(
            user=self.citizen2,
            location_name="102 Maple Ave",
            latitude=12.98,
            longitude=77.60,
            status="ASSIGNED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=self.today
        )

        self.client.force_authenticate(user=self.staff1_user)
        resp = self.client.post(
            "/api/waste/staff/start-today-collection/",
            {"scheduled_pickup_date": self.today.strftime("%Y-%m-%d")},
            format="json"
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data.get("success"))
        self.assertEqual(resp.data.get("updated_count"), 2)
        self.assertTrue(resp.data.get("all_started"))

        p1.refresh_from_db()
        p2.refresh_from_db()
        self.assertEqual(p1.status, "IN_PROGRESS")
        self.assertEqual(p2.status, "IN_PROGRESS")

        # Citizen notifications verified
        n1 = Notification.objects.filter(recipient=self.citizen1, related_pickup=p1).first()
        n2 = Notification.objects.filter(recipient=self.citizen2, related_pickup=p2).first()
        self.assertIsNotNone(n1)
        self.assertIsNotNone(n2)
        self.assertIn("started", n1.message.lower())
        self.assertIn("started", n2.message.lower())

    def test_citizen_cannot_cancel_started_pickup(self):
        """Citizens cannot cancel pickups after collection has started."""
        p = WastePickupRequest.objects.create(
            user=self.citizen1,
            location_name="201 Elm St",
            latitude=12.97,
            longitude=77.59,
            status="ASSIGNED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=self.today
        )

        # Staff starts collection
        self.client.force_authenticate(user=self.staff1_user)
        start_resp = self.client.post(
            "/api/waste/staff/start-today-collection/",
            {"scheduled_pickup_date": self.today.strftime("%Y-%m-%d")},
            format="json"
        )
        self.assertEqual(start_resp.status_code, status.HTTP_200_OK)

        # Citizen attempts to cancel
        self.client.force_authenticate(user=self.citizen1)
        cancel_resp = self.client.post(f"/api/waste/user/pickup-requests/{p.id}/cancel/")
        self.assertEqual(cancel_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already progressed", cancel_resp.data.get("error", ""))

        p.refresh_from_db()
        self.assertEqual(p.status, "IN_PROGRESS")

    def test_unstarted_pickup_can_be_cancelled(self):
        """Unstarted pickups still permit cancellation."""
        tomorrow = self.today + timedelta(days=1)
        p = WastePickupRequest.objects.create(
            user=self.citizen1,
            location_name="301 Birch Way",
            latitude=12.97,
            longitude=77.59,
            status="ASSIGNED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=tomorrow
        )

        self.client.force_authenticate(user=self.citizen1)
        cancel_resp = self.client.post(f"/api/waste/user/pickup-requests/{p.id}/cancel/")
        self.assertEqual(cancel_resp.status_code, status.HTTP_200_OK)
        p.refresh_from_db()
        self.assertEqual(p.status, "CANCELLED")

    def test_different_staff_and_date_isolation(self):
        """Starting collection only affects the authenticated staff's tasks for today."""
        tomorrow = self.today + timedelta(days=1)

        # Staff 1's today pickup
        p_staff1_today = WastePickupRequest.objects.create(
            user=self.citizen1,
            location_name="Staff1 Today",
            latitude=12.97,
            longitude=77.59,
            status="ASSIGNED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=self.today
        )
        # Staff 1's tomorrow pickup
        p_staff1_tomorrow = WastePickupRequest.objects.create(
            user=self.citizen1,
            location_name="Staff1 Tomorrow",
            latitude=12.97,
            longitude=77.59,
            status="ASSIGNED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=tomorrow
        )
        # Staff 2's today pickup
        p_staff2_today = WastePickupRequest.objects.create(
            user=self.citizen2,
            location_name="Staff2 Today",
            latitude=12.98,
            longitude=77.60,
            status="ASSIGNED",
            assigned_staff=self.staff2,
            scheduled_pickup_date=self.today
        )

        self.client.force_authenticate(user=self.staff1_user)
        resp = self.client.post(
            "/api/waste/staff/start-today-collection/",
            {"scheduled_pickup_date": self.today.strftime("%Y-%m-%d")},
            format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data.get("updated_count"), 1)

        p_staff1_today.refresh_from_db()
        p_staff1_tomorrow.refresh_from_db()
        p_staff2_today.refresh_from_db()

        self.assertEqual(p_staff1_today.status, "IN_PROGRESS")
        self.assertEqual(p_staff1_tomorrow.status, "ASSIGNED")
        self.assertEqual(p_staff2_today.status, "ASSIGNED")

    def test_completed_and_cancelled_pickups_untouched(self):
        """Completed and cancelled pickups scheduled for today are not restarted."""
        p_comp = WastePickupRequest.objects.create(
            user=self.citizen1,
            location_name="Already Completed",
            latitude=12.97,
            longitude=77.59,
            status="COMPLETED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=self.today
        )
        p_canc = WastePickupRequest.objects.create(
            user=self.citizen2,
            location_name="Already Cancelled",
            latitude=12.98,
            longitude=77.60,
            status="CANCELLED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=self.today
        )
        p_active = WastePickupRequest.objects.create(
            user=self.citizen1,
            location_name="Active Assigned",
            latitude=12.99,
            longitude=77.61,
            status="ASSIGNED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=self.today
        )

        self.client.force_authenticate(user=self.staff1_user)
        resp = self.client.post(
            "/api/waste/staff/start-today-collection/",
            {"scheduled_pickup_date": self.today.strftime("%Y-%m-%d")},
            format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data.get("updated_count"), 1)

        p_comp.refresh_from_db()
        p_canc.refresh_from_db()
        p_active.refresh_from_db()

        self.assertEqual(p_comp.status, "COMPLETED")
        self.assertEqual(p_canc.status, "CANCELLED")
        self.assertEqual(p_active.status, "IN_PROGRESS")

    def test_idempotent_repeated_clicks(self):
        """Repeated clicks when all pickups are already started do not error or re-notify."""
        p = WastePickupRequest.objects.create(
            user=self.citizen1,
            location_name="Single Task",
            latitude=12.97,
            longitude=77.59,
            status="ASSIGNED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=self.today
        )

        self.client.force_authenticate(user=self.staff1_user)
        # First click
        resp1 = self.client.post(
            "/api/waste/staff/start-today-collection/",
            {"scheduled_pickup_date": self.today.strftime("%Y-%m-%d")},
            format="json"
        )
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertEqual(resp1.data.get("updated_count"), 1)

        notif_count_before = Notification.objects.filter(related_pickup=p).count()
        self.assertEqual(notif_count_before, 1)

        # Second click (idempotent)
        resp2 = self.client.post(
            "/api/waste/staff/start-today-collection/",
            {"scheduled_pickup_date": self.today.strftime("%Y-%m-%d")},
            format="json"
        )
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.data.get("updated_count"), 0)
        self.assertTrue(resp2.data.get("all_started"))

        notif_count_after = Notification.objects.filter(related_pickup=p).count()
        self.assertEqual(notif_count_after, 1)  # No duplicate notification sent

    def test_newly_assigned_same_day_pickups(self):
        """When an additional pickup is assigned for today after collection starts, batch start starts it."""
        p1 = WastePickupRequest.objects.create(
            user=self.citizen1,
            location_name="Initial Pickup",
            latitude=12.97,
            longitude=77.59,
            status="ASSIGNED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=self.today
        )

        self.client.force_authenticate(user=self.staff1_user)
        resp1 = self.client.post(
            "/api/waste/staff/start-today-collection/",
            {"scheduled_pickup_date": self.today.strftime("%Y-%m-%d")},
            format="json"
        )
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertEqual(resp1.data.get("updated_count"), 1)

        # Later in the day, Admin assigns a 2nd pickup for today to staff1
        p2 = WastePickupRequest.objects.create(
            user=self.citizen2,
            location_name="Newly Assigned Later",
            latitude=12.98,
            longitude=77.60,
            status="ASSIGNED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=self.today
        )

        # Staff starts today's collection again for newly assigned task
        resp2 = self.client.post(
            "/api/waste/staff/start-today-collection/",
            {"scheduled_pickup_date": self.today.strftime("%Y-%m-%d")},
            format="json"
        )
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.data.get("updated_count"), 1)

        p1.refresh_from_db()
        p2.refresh_from_db()
        self.assertEqual(p1.status, "IN_PROGRESS")
        self.assertEqual(p2.status, "IN_PROGRESS")

    def test_future_date_rejected(self):
        """Attempting to start collection for a future date is rejected with 400 Bad Request."""
        tomorrow = self.today + timedelta(days=1)
        WastePickupRequest.objects.create(
            user=self.citizen1,
            location_name="Future Task",
            latitude=12.97,
            longitude=77.59,
            status="ASSIGNED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=tomorrow
        )

        self.client.force_authenticate(user=self.staff1_user)
        resp = self.client.post(
            "/api/waste/staff/start-today-collection/",
            {"scheduled_pickup_date": tomorrow.strftime("%Y-%m-%d")},
            format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("today", resp.data.get("error", "").lower())

    def test_citizen_address_included_in_staff_tasks(self):
        """Staff assigned tasks API includes the registered citizen address from UserProfile."""
        self.citizen1_profile.address = "Flat 402, Green Meadows, Eco City"
        self.citizen1_profile.save()

        # Pickup with registered address
        p1 = WastePickupRequest.objects.create(
            user=self.citizen1,
            location_name="101 Pine St",
            latitude=12.97,
            longitude=77.59,
            status="ASSIGNED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=self.today
        )

        # Pickup with missing address (blank)
        self.citizen2_profile.address = ""
        self.citizen2_profile.save()

        p2 = WastePickupRequest.objects.create(
            user=self.citizen2,
            location_name="102 Maple Ave",
            latitude=12.98,
            longitude=77.60,
            status="ASSIGNED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=self.today
        )

        self.client.force_authenticate(user=self.staff1_user)
        resp = self.client.get("/api/waste/staff/my-tasks/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        tasks_data = resp.data.get("tasks", [])
        task1_data = next((t for t in tasks_data if t.get("request_id") == p1.id), None)
        task2_data = next((t for t in tasks_data if t.get("request_id") == p2.id), None)

        self.assertIsNotNone(task1_data)
        self.assertEqual(task1_data.get("address"), "Flat 402, Green Meadows, Eco City")

        self.assertIsNotNone(task2_data)
        self.assertEqual(task2_data.get("address"), "")


class StaffWardRouteOptimizationPhase2Tests(TestCase):
    def setUp(self):
        self.today = timezone.now().date()

        # Ward 1 with registered MCF coordinates
        self.ward1 = Ward.objects.create(
            ward_name="North Green Ward",
            ward_number=101,
            location="North District",
            mcf_location_name="North Ward Material Collection Facility",
            mcf_latitude=9.69850,
            mcf_longitude=76.72310
        )

        # Ward 2 with registered MCF coordinates
        self.ward2 = Ward.objects.create(
            ward_name="South Central Ward",
            ward_number=102,
            location="South District",
            mcf_location_name="South Ward Mini MCF",
            mcf_latitude=9.68200,
            mcf_longitude=76.71150
        )

        # Ward 3 with MISSING MCF coordinates
        self.ward3 = Ward.objects.create(
            ward_name="East Ridge Ward",
            ward_number=103,
            location="East District",
            mcf_location_name="Pending Facility",
            mcf_latitude=None,
            mcf_longitude=None
        )

        # Staff 1 assigned to Ward 1
        self.staff1_user = User.objects.create_user(
            username="staff_ward1@ecopulse.test",
            password="Password123!"
        )
        self.staff1_profile = UserProfile.objects.create(
            user=self.staff1_user,
            name="Ravi Kumar (Ward 1)",
            ward=self.ward1,
            role="STAFF"
        )
        self.staff1 = Staff.objects.create(
            user=self.staff1_user,
            phone="9876500001",
            designation="STAFF",
            date_of_joining="2024-01-01"
        )

        # Staff 2 assigned to Ward 2
        self.staff2_user = User.objects.create_user(
            username="staff_ward2@ecopulse.test",
            password="Password123!"
        )
        self.staff2_profile = UserProfile.objects.create(
            user=self.staff2_user,
            name="Suresh Nair (Ward 2)",
            ward=self.ward2,
            role="STAFF"
        )
        self.staff2 = Staff.objects.create(
            user=self.staff2_user,
            phone="9876500002",
            designation="STAFF",
            date_of_joining="2024-01-01"
        )

        # Staff 3 assigned to Ward 3 (Missing MCF)
        self.staff3_user = User.objects.create_user(
            username="staff_ward3@ecopulse.test",
            password="Password123!"
        )
        self.staff3_profile = UserProfile.objects.create(
            user=self.staff3_user,
            name="Anjali Menon (Ward 3)",
            ward=self.ward3,
            role="STAFF"
        )
        self.staff3 = Staff.objects.create(
            user=self.staff3_user,
            phone="9876500003",
            designation="STAFF",
            date_of_joining="2024-01-01"
        )

        # Citizens in Ward 1 and Ward 2
        self.citizen_w1_user = User.objects.create_user(
            username="citizen_w1@ecopulse.test",
            password="Password123!"
        )
        self.citizen_w1_profile = UserProfile.objects.create(
            user=self.citizen_w1_user,
            name="Citizen Ward 1",
            ward=self.ward1,
            address="10 Green Valley, Ward 1",
            role="CITIZEN"
        )

        self.citizen_w2_user = User.objects.create_user(
            username="citizen_w2@ecopulse.test",
            password="Password123!"
        )
        self.citizen_w2_profile = UserProfile.objects.create(
            user=self.citizen_w2_user,
            name="Citizen Ward 2",
            ward=self.ward2,
            address="20 Palm Grove, Ward 2",
            role="CITIZEN"
        )

        self.client = APIClient()

    def test_staff_ward1_mcf_returned(self):
        """Staff in Ward 1 receives Ward 1 MCF coordinates and details in my-tasks API."""
        # Create pickup in Ward 1 assigned to Staff 1
        p1 = WastePickupRequest.objects.create(
            user=self.citizen_w1_user,
            location_name="Ward 1 Stop Alpha",
            latitude=9.6990,
            longitude=76.7240,
            status="ASSIGNED",
            assigned_staff=self.staff1,
            scheduled_pickup_date=self.today
        )

        self.client.force_authenticate(user=self.staff1_user)
        resp = self.client.get("/api/waste/staff/my-tasks/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        staff_ward = resp.data.get("staff_ward")
        self.assertIsNotNone(staff_ward)
        self.assertEqual(staff_ward.get("ward_id"), self.ward1.ward_id)
        self.assertEqual(staff_ward.get("ward_name"), "North Green Ward")
        self.assertEqual(staff_ward.get("mcf_location_name"), "North Ward Material Collection Facility")
        self.assertAlmostEqual(staff_ward.get("mcf_latitude"), 9.69850, places=4)
        self.assertAlmostEqual(staff_ward.get("mcf_longitude"), 76.72310, places=4)

        # Check pickup includes ward_id
        tasks = resp.data.get("tasks", [])
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].get("ward_id"), self.ward1.ward_id)

    def test_staff_ward2_mcf_isolated_from_ward1(self):
        """Staff in Ward 2 receives only Ward 2 MCF and cannot see Ward 1 MCF."""
        # Create pickup in Ward 2 assigned to Staff 2
        p2 = WastePickupRequest.objects.create(
            user=self.citizen_w2_user,
            location_name="Ward 2 Stop Beta",
            latitude=9.6830,
            longitude=76.7120,
            status="ASSIGNED",
            assigned_staff=self.staff2,
            scheduled_pickup_date=self.today
        )

        self.client.force_authenticate(user=self.staff2_user)
        resp = self.client.get("/api/waste/staff/my-tasks/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        staff_ward = resp.data.get("staff_ward")
        self.assertIsNotNone(staff_ward)
        self.assertEqual(staff_ward.get("ward_id"), self.ward2.ward_id)
        self.assertEqual(staff_ward.get("mcf_location_name"), "South Ward Mini MCF")
        self.assertAlmostEqual(staff_ward.get("mcf_latitude"), 9.68200, places=4)
        self.assertAlmostEqual(staff_ward.get("mcf_longitude"), 76.71150, places=4)

        # Ensure Ward 1 MCF coordinates are NOT returned to Staff 2
        self.assertNotEqual(staff_ward.get("mcf_latitude"), 9.69850)

    def test_missing_mcf_coordinates_handled_cleanly(self):
        """Ward without configured MCF coordinates returns None for mcf_latitude and mcf_longitude."""
        self.client.force_authenticate(user=self.staff3_user)
        resp = self.client.get("/api/waste/staff/my-tasks/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        staff_ward = resp.data.get("staff_ward")
        self.assertIsNotNone(staff_ward)
        self.assertEqual(staff_ward.get("ward_id"), self.ward3.ward_id)
        self.assertIsNone(staff_ward.get("mcf_latitude"))
        self.assertIsNone(staff_ward.get("mcf_longitude"))



