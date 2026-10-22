import os
import django
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from django.contrib.auth.models import User
from accounts.models import Ward, UserProfile, Staff, Recycler
from waste.models import (
    WastePickupRequest,
    WastePickupImage,
    WasteCollection,
    WasteComplaint,
    StaffMCFCollection,
    MCFRecyclerAssignment,
    Payment,
    RewardSubmission,
)
from notifications.models import Notification


def seed():
    print("=== SEEDING DOCKER POSTGRESQL DATABASE ===")

    # 1. WARDS
    print("1. Creating Municipal Wards...")
    wards_data = [
        {
            "ward_number": 1,
            "ward_name": "Green Valley Ward",
            "location": "Pala Central",
            "mcf_location_name": "Pala Central MCF, Civil Station Road",
            "mcf_latitude": Decimal("9.7123450"),
            "mcf_longitude": Decimal("76.6834560"),
        },
        {
            "ward_number": 2,
            "ward_name": "Riverside Ward",
            "location": "Meenachil Riverbank",
            "mcf_location_name": "Meenachil East MCF Station",
            "mcf_latitude": Decimal("9.7156780"),
            "mcf_longitude": Decimal("76.6890120"),
        },
        {
            "ward_number": 3,
            "ward_name": "Highland Ward",
            "location": "Lalam Junction",
            "mcf_location_name": "North MCF Depot, Lalam",
            "mcf_latitude": Decimal("9.7189010"),
            "mcf_longitude": Decimal("76.6812340"),
        },
        {
            "ward_number": 4,
            "ward_name": "Market Ward",
            "location": "Town Hall Area",
            "mcf_location_name": "Civic MCF Yard, Market Road",
            "mcf_latitude": Decimal("9.7111220"),
            "mcf_longitude": Decimal("76.6844550"),
        },
    ]

    wards = {}
    for wd in wards_data:
        ward, _ = Ward.objects.update_or_create(
            ward_number=wd["ward_number"],
            defaults=wd
        )
        wards[wd["ward_number"]] = ward
        print(f"   [OK] Ward {ward.ward_number}: {ward.ward_name}")

    def create_account(email, password, name, role, ward=None, phone="9876543210", address="", is_superuser=False):
        user, _ = User.objects.get_or_create(username=email, defaults={"email": email})
        user.email = email
        user.is_staff = is_superuser
        user.is_superuser = is_superuser
        user.set_password(password)
        user.save()

        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                "name": name,
                "phone": phone,
                "address": address,
                "ward": ward,
                "role": role,
            }
        )
        return user

    # 2. ADMIN USER
    print("\n2. Creating Admin User...")
    admin_user = create_account(
        email="admin@ecopulse.gov.in",
        password="AdminPassword123!",
        name="Municipal Admin",
        role="ADMIN",
        ward=wards[1],
        phone="9998887770",
        address="Municipal Corporation Office, Pala",
        is_superuser=True,
    )
    print("   [OK] Admin: admin@ecopulse.gov.in (Password: AdminPassword123!)")

    # 3. STAFF USERS
    print("\n3. Creating Staff Members...")
    staff_records = {}
    staff_info = [
        {
            "email": "staff.rahul@ecopulse.gov.in",
            "password": "StaffPassword123!",
            "name": "Rahul Nair",
            "designation": "STAFF",
            "ward": wards[1],
            "phone": "9876543210",
            "address": "Quarter 12, Municipal Staff Colony, Pala",
            "date_of_joining": date(2024, 1, 15),
        },
        {
            "email": "driver.anand@ecopulse.gov.in",
            "password": "StaffPassword123!",
            "name": "Anand Kumar",
            "designation": "DRIVER",
            "ward": wards[2],
            "phone": "9876543211",
            "address": "House 45, Green Park, Pala",
            "date_of_joining": date(2024, 3, 1),
        },
        {
            "email": "staff.priya@ecopulse.gov.in",
            "password": "StaffPassword123!",
            "name": "Priya Menon",
            "designation": "STAFF",
            "ward": wards[3],
            "phone": "9876543212",
            "address": "Apt 3B, Riverview Residency, Pala",
            "date_of_joining": date(2024, 6, 10),
        },
    ]

    for si in staff_info:
        u = create_account(
            email=si["email"],
            password=si["password"],
            name=si["name"],
            role="STAFF",
            ward=si["ward"],
            phone=si["phone"],
            address=si["address"],
        )
        staff_rec, _ = Staff.objects.update_or_create(
            user=u,
            defaults={
                "phone": si["phone"],
                "address": si["address"],
                "designation": si["designation"],
                "date_of_joining": si["date_of_joining"],
            }
        )
        staff_records[si["name"]] = staff_rec
        print(f"   [OK] Staff: {si['name']} ({si['designation']}) - {si['email']}")

    # 4. RECYCLERS
    print("\n4. Creating Recyclers...")
    recycler_records = {}
    recycler_info = [
        {
            "email": "recycler.cleanplastic@ecopulse.gov.in",
            "password": "RecyclerPassword123!",
            "name": "CleanPlastic Industries",
            "organization": "CleanPlastic Eco Solutions",
            "waste_type": "Plastic",
            "phone": "9847123456",
            "address": "Plot 14, Industrial Development Plot, Pala",
            "date_of_registration": date(2024, 2, 1),
        },
        {
            "email": "recycler.greenpaper@ecopulse.gov.in",
            "password": "RecyclerPassword123!",
            "name": "GreenPaper Mills",
            "organization": "GreenPaper Recycling Corp",
            "waste_type": "Paper",
            "phone": "9847234567",
            "address": "Plot 22, MIDC Zone, Pala",
            "date_of_registration": date(2024, 2, 15),
        },
        {
            "email": "recycler.ecometal@ecopulse.gov.in",
            "password": "RecyclerPassword123!",
            "name": "EcoMetal Processors",
            "organization": "Kerala Metal Recovery",
            "waste_type": "Metal",
            "phone": "9847345678",
            "address": "Bypass Road, Pala",
            "date_of_registration": date(2024, 4, 10),
        },
        {
            "email": "recycler.keralaglass@ecopulse.gov.in",
            "password": "RecyclerPassword123!",
            "name": "Kerala Glass Works",
            "organization": "Kerala Glass & Bottle Recyclers",
            "waste_type": "Glass",
            "phone": "9847456789",
            "address": "Industrial Estate, Kottayam Road, Pala",
            "date_of_registration": date(2024, 5, 5),
        },
    ]

    for ri in recycler_info:
        u = create_account(
            email=ri["email"],
            password=ri["password"],
            name=ri["name"],
            role="RECYCLER",
            phone=ri["phone"],
            address=ri["address"],
        )
        rec, _ = Recycler.objects.update_or_create(
            user=u,
            defaults={
                "organization": ri["organization"],
                "waste_type": ri["waste_type"],
                "address": ri["address"],
                "date_of_registration": ri["date_of_registration"],
            }
        )
        recycler_records[ri["waste_type"]] = rec
        print(f"   [OK] Recycler: {ri['organization']} ({ri['waste_type']})")

    # 5. CITIZENS
    print("\n5. Creating Citizens...")
    citizens = {}
    citizen_info = [
        {
            "email": "citizen.anjali@gmail.com",
            "password": "CitizenPassword123!",
            "name": "Anjali Sharma",
            "ward": wards[1],
            "phone": "9812345670",
            "address": "12/A Rose Villa, Pala Central",
        },
        {
            "email": "citizen.vipin@gmail.com",
            "password": "CitizenPassword123!",
            "name": "Vipin Thomas",
            "ward": wards[2],
            "phone": "9812345671",
            "address": "Green Meadows #5, Riverside Road, Pala",
        },
        {
            "email": "citizen.divya@gmail.com",
            "password": "CitizenPassword123!",
            "name": "Divya Kurian",
            "ward": wards[3],
            "phone": "9812345672",
            "address": "Hilltop Cottage, Lalam Junction, Pala",
        },
    ]

    for ci in citizen_info:
        u = create_account(
            email=ci["email"],
            password=ci["password"],
            name=ci["name"],
            role="CITIZEN",
            ward=ci["ward"],
            phone=ci["phone"],
            address=ci["address"],
        )
        citizens[ci["name"]] = u
        print(f"   [OK] Citizen: {ci['name']} - {ci['email']}")

    today = timezone.now().date()

    # 6. PICKUP REQUESTS
    print("\n6. Creating Pickup Requests...")
    p1, _ = WastePickupRequest.objects.get_or_create(
        user=citizens["Anjali Sharma"],
        location_name="12/A Rose Villa, Pala Central",
        defaults={
            "latitude": Decimal("9.7132100"),
            "longitude": Decimal("76.6841200"),
            "status": "COMPLETED",
            "assigned_staff": staff_records["Rahul Nair"],
            "scheduled_pickup_date": today - timedelta(days=2),
        }
    )
    WastePickupImage.objects.get_or_create(
        pickup_request=p1,
        defaults={
            "waste_type": "Plastic",
            "confidence": 0.94,
            "detections": [
                {"label": "plastic bottle", "confidence": 0.94},
                {"label": "plastic container", "confidence": 0.88}
            ],
            "image": "waste_pickups/dummy_plastic.jpg"
        }
    )
    WasteCollection.objects.get_or_create(
        pickup_request=p1,
        defaults={
            "staff": staff_records["Rahul Nair"],
            "estimated_weight": Decimal("14.50"),
            "completion_image": "waste_collections/dummy_complete.jpg"
        }
    )
    Payment.objects.get_or_create(
        pickup_request=p1,
        defaults={
            "user": citizens["Anjali Sharma"],
            "amount": Decimal("50.00"),
            "payment_status": "COMPLETED",
            "payment_id": "PAY-20261020-A1B2C3D4",
            "transaction_id": "TXN_987123654",
            "order_id": "ORD_PALA_001",
            "payment_date": timezone.now() - timedelta(days=2)
        }
    )
    print("   [OK] Pickup #1 [COMPLETED]")

    p2, _ = WastePickupRequest.objects.get_or_create(
        user=citizens["Vipin Thomas"],
        location_name="Green Meadows #5, Riverside Road, Pala",
        defaults={
            "latitude": Decimal("9.7158900"),
            "longitude": Decimal("76.6894500"),
            "status": "IN_PROGRESS",
            "assigned_staff": staff_records["Anand Kumar"],
            "scheduled_pickup_date": today,
        }
    )
    WastePickupImage.objects.get_or_create(
        pickup_request=p2,
        defaults={
            "waste_type": "Paper",
            "confidence": 0.89,
            "detections": [
                {"label": "cardboard box", "confidence": 0.89}
            ],
            "image": "waste_pickups/dummy_paper.jpg"
        }
    )
    Payment.objects.get_or_create(
        pickup_request=p2,
        defaults={
            "user": citizens["Vipin Thomas"],
            "amount": Decimal("50.00"),
            "payment_status": "COMPLETED",
            "payment_id": "PAY-20261022-E5F6G7H8",
        }
    )
    print("   [OK] Pickup #2 [IN_PROGRESS]")

    print("\n=== DOCKER SEEDING COMPLETED SUCCESSFULLY ===")


if __name__ == "__main__":
    seed()
