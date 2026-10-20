import json
import os
import tempfile

from django.db import models, transaction
from django.http import JsonResponse
from django.utils import timezone


from rest_framework.decorators import (
    api_view,
    permission_classes,
)

from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import BasicAuthentication, SessionAuthentication
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.authentication import JWTAuthentication

from datetime import datetime, date, timedelta
from decimal import Decimal, InvalidOperation

from .serializers import (
    WastePickupRequestSerializer,
    WasteComplaintSerializer,
    StaffMCFCollectionSerializer,
    MCFRecyclerAssignmentSerializer,
    RecyclerOptionSerializer,
    PaymentSerializer,
    RewardSubmissionSerializer,
)

from ultralytics import YOLO
from accounts.models import UserProfile, Staff, Recycler


from .models import (
    WastePickupRequest,
    WastePickupImage,
    WasteCollection,
    WasteComplaint,
    StaffMCFCollection,
    MCFRecyclerAssignment,
    Payment,
    RewardSubmission,
)

from .priority_detector import determine_complaint_priority
from notifications.services import create_notification, notify_admins


# ============================================================
# BASE DIRECTORY
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)


# ============================================================
# YOLO MODEL PATH
# ============================================================

MODEL_PATH = os.path.join(
    BASE_DIR,
    "ai_models",
    "best.pt"
)


# ============================================================
# CHECK MODEL
# ============================================================

print("==========================================")
print("YOLO MODEL PATH:")
print(MODEL_PATH)

print(
    "MODEL EXISTS:",
    os.path.exists(MODEL_PATH)
)

print("==========================================")


# ============================================================
# LOAD YOLO MODEL
# ============================================================

model = None

try:

    if os.path.exists(MODEL_PATH):

        model = YOLO(MODEL_PATH)

        print(
            "YOLO MODEL LOADED SUCCESSFULLY"
        )

        print(
            "MODEL CLASSES:",
            model.names
        )

    else:

        print(
            "ERROR: YOLO model not found:"
        )

        print(
            MODEL_PATH
        )

except Exception as e:

    print(
        "YOLO MODEL LOAD FAILED:",
        str(e)
    )

    model = None


# ============================================================
# DETECT WASTE
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def detect_waste(request):

    print("==========================================")
    print("WASTE DETECTION REQUEST")
    print("USER:", request.user)
    print("USER ID:", request.user.id)
    print("EMAIL:", request.user.email)
    print(
        "AUTHENTICATED:",
        request.user.is_authenticated
    )
    print("==========================================")


    # ========================================================
    # AUTHENTICATION CHECK
    # ========================================================

    if not request.user.is_authenticated:

        return JsonResponse(
            {
                "success": False,
                "message":
                    "Authentication required. Please login again.",
            },
            status=401,
        )


    # ========================================================
    # MODEL CHECK
    # ========================================================

    if model is None:

        return JsonResponse(
            {
                "success": False,
                "message": (
                    "YOLO model could not be loaded. "
                    "Check backend/ai_models/best.pt"
                ),
            },
            status=500,
        )


    # ========================================================
    # IMAGE CHECK
    # ========================================================

    uploaded_image = request.FILES.get("image")

    if not uploaded_image:

        return JsonResponse(
            {
                "success": False,
                "message": "No image uploaded.",
            },
            status=400,
        )


    print(
        "IMAGE:",
        uploaded_image.name
    )

    print(
        "SIZE:",
        uploaded_image.size
    )


    temp_file = None


    try:

        # ====================================================
        # TEMP FILE
        # ====================================================

        suffix = os.path.splitext(
            uploaded_image.name
        )[1]

        if not suffix:
            suffix = ".jpg"


        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        )


        # ====================================================
        # WRITE IMAGE
        # ====================================================

        for chunk in uploaded_image.chunks():

            temp_file.write(chunk)


        temp_file.close()


        # ====================================================
        # RUN YOLO
        # ====================================================

        print(
            "RUNNING YOLO DETECTION..."
        )
        print(
            "IMAGE FILE:",
            uploaded_image.name
        )

        results = model.predict(
            source=temp_file.name,
            conf=0.25,
            verbose=False
        )

        print(
            "YOLO PREDICTION COMPLETED"
        )


        # ====================================================
        # DETECTIONS
        # ====================================================

        detections = []


        for result in results:

            if result.boxes is None:
                continue


            for box in result.boxes:

                class_id = int(
                    box.cls[0].item()
                )


                confidence = float(
                    box.conf[0].item()
                )


                if isinstance(
                    model.names,
                    dict
                ):

                    class_name = model.names.get(
                        class_id,
                        str(class_id)
                    )

                else:

                    class_name = model.names[
                        class_id
                    ]


                detections.append(
                    {
                        "class":
                            class_name,

                        "confidence":
                            round(
                                confidence,
                                4
                            ),
                    }
                )


        # ====================================================
        # SORT BY CONFIDENCE
        # ====================================================

        detections.sort(
            key=lambda x:
                x["confidence"],
            reverse=True
        )


        print(
            "DETECTIONS:",
            detections
        )
        print(
            "Number of detections:",
            len(detections)
        )
        print(
            "Detected classes:",
            [d["class"] for d in detections]
        )
        print(
            "Confidence values:",
            [d["confidence"] for d in detections]
        )


        # ====================================================
        # RESPONSE
        # ====================================================

        return JsonResponse(
            {
                "success": True,

                "image_name":
                    uploaded_image.name,

                "detections":
                    detections,

                "total_detections":
                    len(detections),
            },
            status=200
        )


    except Exception as e:

        print(
            "YOLO ERROR:",
            str(e)
        )


        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=500
        )


    finally:

        if temp_file is not None:

            try:

                if os.path.exists(
                    temp_file.name
                ):

                    os.remove(
                        temp_file.name
                    )

            except Exception as e:

                print(
                    "TEMP FILE CLEANUP ERROR:",
                    str(e)
                )


# ============================================================
# CREATE PICKUP REQUEST
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_pickup_request(request):

    print("==========================================")
    print("CREATE PICKUP REQUEST")
    print("USER:", request.user)
    print("USER ID:", request.user.id)
    print("EMAIL:", request.user.email)
    print(
        "AUTHENTICATED:",
        request.user.is_authenticated
    )
    print("==========================================")


    # ========================================================
    # AUTHENTICATION CHECK
    # ========================================================

    if not request.user.is_authenticated:

        return JsonResponse(
            {
                "success": False,
                "message":
                    "Authentication required. Please login again.",
            },
            status=401,
        )


    try:

        # ====================================================
        # LOCATION
        # ====================================================

        location_name = request.POST.get(
            "location_name"
        )

        latitude = request.POST.get(
            "latitude"
        )

        longitude = request.POST.get(
            "longitude"
        )


        if not location_name:

            return JsonResponse(
                {
                    "success": False,
                    "message":
                        "Location name is required.",
                },
                status=400,
            )


        if not latitude or not longitude:

            return JsonResponse(
                {
                    "success": False,
                    "message":
                        "Location coordinates are required.",
                },
                status=400,
            )


        # ====================================================
        # CONVERT COORDINATES
        # ====================================================

        try:

            latitude = float(latitude)
            longitude = float(longitude)

        except (
            ValueError,
            TypeError
        ):

            return JsonResponse(
                {
                    "success": False,
                    "message":
                        "Invalid coordinates.",
                },
                status=400,
            )


        # ====================================================
        # GET ALL IMAGES
        # ====================================================

        uploaded_images = request.FILES.getlist(
            "images"
        )


        print(
            "TOTAL UPLOADED IMAGES:",
            len(uploaded_images)
        )


        if not uploaded_images:

            return JsonResponse(
                {
                    "success": False,
                    "message":
                        "No waste images uploaded.",
                },
                status=400,
            )


        # ====================================================
        # GET DETECTIONS
        # ====================================================

        detections_json = request.POST.get(
            "detections",
            "[]"
        )


        try:

            detections = json.loads(
                detections_json
            )

        except (
            json.JSONDecodeError,
            TypeError
        ):

            detections = []


        if not isinstance(
            detections,
            list
        ):

            detections = []


        print(
            "TOTAL DETECTIONS:",
            len(detections)
        )


        # ====================================================
        # CREATE PICKUP REQUEST
        #
        # THIS IS THE IMPORTANT PART
        #
        # request.user is the authenticated Django User
        # ====================================================

        print(
            "CREATING PICKUP REQUEST FOR USER ID:",
            request.user.id
        )


        pickup_request = (
            WastePickupRequest.objects.create(

                user=request.user,

                location_name=
                    location_name,

                latitude=
                    latitude,

                longitude=
                    longitude,

                status=
                    "PENDING",
            )
        )


        print(
            "PICKUP REQUEST CREATED:",
            pickup_request.id
        )


        # ====================================================
        # SAVE EACH IMAGE
        # ====================================================

        saved_images = []


        for index, uploaded_image in enumerate(
            uploaded_images
        ):

            current_image_index = index + 1


            print(
                "------------------------------------------"
            )

            print(
                "SAVING IMAGE:",
                current_image_index
            )

            print(
                "FILE:",
                uploaded_image.name
            )


            # =================================================
            # FIND DETECTIONS FOR THIS IMAGE
            # =================================================

            image_detections = []


            for detection in detections:

                if not isinstance(
                    detection,
                    dict
                ):

                    continue


                detection_image_index = (
                    detection.get(
                        "imageIndex"
                    )
                )


                try:

                    detection_image_index = int(
                        detection_image_index
                    )

                except (
                    ValueError,
                    TypeError
                ):

                    continue


                if (
                    detection_image_index
                    ==
                    current_image_index
                ):

                    image_detections.append(
                        detection
                    )


            # =================================================
            # ALL DETECTIONS & BEST DETECTION
            # =================================================

            def get_confidence(detection):
                try:
                    val = float(detection.get("confidence", 0))
                    if val > 1.0:
                        val = val / 100.0
                    return max(0.0, min(1.0, val))
                except (ValueError, TypeError):
                    return 0.0

            formatted_detections = []
            for d in image_detections:
                if not isinstance(d, dict):
                    continue
                c_name = (
                    d.get("class")
                    or d.get("class_name")
                    or d.get("name")
                    or "Unknown"
                )
                c_conf = get_confidence(d)
                formatted_detections.append({
                    "class": str(c_name).strip() if str(c_name).strip() else "Unknown",
                    "confidence": round(c_conf, 4),
                })

            if image_detections:
                best_detection = max(
                    image_detections,
                    key=get_confidence
                )

                waste_type = (
                    best_detection.get(
                        "class"
                    )
                    or
                    best_detection.get(
                        "class_name"
                    )
                    or
                    best_detection.get(
                        "name"
                    )
                    or
                    "Unknown"
                )

                confidence = get_confidence(
                    best_detection
                )

            else:
                waste_type = "Unknown"
                confidence = 0.0

            # =================================================
            # SAVE IMAGE RECORD (WITH ALL DETECTIONS)
            # =================================================

            image_record = (
                WastePickupImage.objects.create(
                    pickup_request=
                        pickup_request,

                    image=
                        uploaded_image,

                    waste_type=
                        waste_type,

                    confidence=
                        confidence,

                    detections=
                        formatted_detections,
                )
            )

            saved_images.append(
                {
                    "id":
                        image_record.id,

                    "image":
                        request.build_absolute_uri(
                            image_record.image.url
                        ),

                    "image_name":
                        uploaded_image.name,

                    "waste_type":
                        waste_type,

                    "confidence":
                        confidence,

                    "detections":
                        formatted_detections,

                    "image_index":
                        current_image_index,
                }
            )


            print(
                "WASTE TYPE:",
                waste_type
            )

            print(
                "CONFIDENCE:",
                confidence
            )


        # ====================================================
        # USER PROFILE
        # ====================================================

        profile = getattr(
            request.user,
            "userprofile",
            None
        )


        name = None
        ward_id = None


        if profile:

            name = profile.name


            if profile.ward:

                ward_id = (
                    profile.ward.ward_id
                )


        # ====================================================
        # SUCCESS
        # ====================================================

        print("==========================================")

        print(
            "PICKUP REQUEST CREATED:",
            pickup_request.id
        )

        print(
            "USER ID:",
            request.user.id
        )

        print(
            "TOTAL IMAGES SAVED:",
            len(saved_images)
        )

        # Trigger Notifications
        try:
            create_notification(
                recipient=request.user,
                title="Pickup Request Submitted",
                message=f"Your waste pickup request #{pickup_request.id} for {location_name} has been submitted successfully.",
                notification_type="PICKUP_CREATED",
                related_pickup=pickup_request,
                action_url="/user",
            )
            notify_admins(
                title="New Waste Pickup Request",
                message=f"Resident {name or request.user.username} submitted pickup request #{pickup_request.id} at {location_name}.",
                notification_type="PICKUP_CREATED",
                related_pickup=pickup_request,
                action_url="/assign",
            )
        except Exception as notif_err:
            print("Notification trigger error:", notif_err)

        return JsonResponse(
            {
                "success": True,

                "message":
                    "Waste pickup request created successfully.",

                "pickup_request": {

                    "id":
                        pickup_request.id,

                    "user_id":
                        request.user.id,

                    "email":
                        request.user.email,

                    "name":
                        name,

                    "ward_id":
                        ward_id,

                    "location_name":
                        pickup_request.location_name,

                    "latitude":
                        float(
                            pickup_request.latitude
                        ),

                    "longitude":
                        float(
                            pickup_request.longitude
                        ),

                    "status":
                        pickup_request.status,

                    "images":
                        saved_images,

                    "total_images":
                        len(saved_images),

                    "created_at":
                        pickup_request.created_at.isoformat(),

                    "updated_at":
                        pickup_request.updated_at.isoformat(),
                }
            },
            status=201,
        )


    except Exception as e:

        print("==========================================")

        print(
            "CREATE PICKUP REQUEST ERROR"
        )

        print(
            "ERROR:",
            str(e)
        )

        print("==========================================")


        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=500,
        )


class AdminPickupRequestListView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        requests = (
            WastePickupRequest.objects
            .select_related(
                "user",
                "user__userprofile",
                "user__userprofile__ward",
                "assigned_staff",
                "assigned_staff__user",
                "assigned_staff__user__userprofile",
                "collection",
                "collection__staff",
                "collection__staff__user",
                "collection__staff__user__userprofile",
            )
            .order_by("-id")
        )

        serializer = WastePickupRequestSerializer(
            requests,
            many=True,
            context={"request": request}
        )

        return Response(serializer.data)


# ============================================================
# GET STAFF BY WARD (Preserved existing implementation)
# ============================================================

class StaffByWardView(APIView):

    permission_classes = []

    def get(self, request, ward_id):

        staff_members = (
            Staff.objects
            .filter(
                user__userprofile__ward_id=ward_id,
                user__userprofile__role="STAFF"
            )
            .select_related(
                "user",
                "user__userprofile",
                "user__userprofile__ward"
            )
            .order_by(
                "user__userprofile__name"
            )
        )

        staff_data = []

        for staff in staff_members:

            profile = getattr(
                staff.user,
                "userprofile",
                None
            )

            staff_data.append({

                "staff_id": staff.staff_id,

                "name":
                    profile.name
                    if profile
                    else staff.user.username,

                "email":
                    staff.user.email,

                "phone":
                    staff.phone,

                "designation":
                    staff.designation,

                "ward":
                    (profile.ward.ward_name or f"Ward {profile.ward.ward_number or profile.ward.ward_id}")
                    if profile and profile.ward
                    else "",
            })

        return Response(staff_data)


# ============================================================
# ASSIGN PICKUP TO STAFF
# ============================================================

class AssignPickupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        request_id = data.get("request_id") or data.get("pickup_id")
        staff_id = data.get("staff_id")

        if not request_id:
            return Response(
                {"success": False, "error": "request_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not staff_id:
            return Response(
                {"success": False, "error": "staff_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            pickup_request = (
                WastePickupRequest.objects
                .select_related("user", "user__userprofile", "user__userprofile__ward")
                .get(id=request_id)
            )
        except (WastePickupRequest.DoesNotExist, ValueError):
            return Response(
                {"success": False, "error": f"Pickup request #{request_id} not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if pickup_request.status == "CANCELLED":
            return Response(
                {"success": False, "error": "This pickup request was cancelled by the citizen and cannot be assigned or rescheduled."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if pickup_request.status in ["IN_PROGRESS", "COLLECTED", "COMPLETED"]:
            return Response(
                {"success": False, "error": f"Cannot assign or reschedule a pickup request that is already {pickup_request.get_status_display()}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Lookup staff by staff_id, user_id, username, email, or profile name
        staff = None
        staff_id_str = str(staff_id).strip()

        # 1. Numeric lookup by staff_id or user_id or userprofile_id
        if staff_id_str.isdigit():
            numeric_id = int(staff_id_str)
            staff = (
                Staff.objects.select_related("user", "user__userprofile", "user__userprofile__ward")
                .filter(
                    models.Q(staff_id=numeric_id) |
                    models.Q(user_id=numeric_id) |
                    models.Q(user__userprofile__id=numeric_id)
                )
                .first()
            )

        # 2. Case-insensitive lookup by username, email, or profile name
        if not staff:
            staff = (
                Staff.objects.select_related("user", "user__userprofile", "user__userprofile__ward")
                .filter(
                    models.Q(user__username__iexact=staff_id_str) |
                    models.Q(user__email__iexact=staff_id_str) |
                    models.Q(user__userprofile__name__iexact=staff_id_str)
                )
                .first()
            )

        # 3. Partial contains fallback
        if not staff:
            staff = (
                Staff.objects.select_related("user", "user__userprofile", "user__userprofile__ward")
                .filter(
                    models.Q(user__username__icontains=staff_id_str) |
                    models.Q(user__userprofile__name__icontains=staff_id_str)
                )
                .first()
            )

        if not staff:
            return Response(
                {"success": False, "error": f"Staff member '{staff_id}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Cross-ward validation
        pickup_user_profile = getattr(pickup_request.user, "userprofile", None)
        pickup_ward = getattr(pickup_user_profile, "ward", None) if pickup_user_profile else None

        staff_user_profile = getattr(staff.user, "userprofile", None)
        staff_ward = getattr(staff_user_profile, "ward", None) if staff_user_profile else None

        if pickup_ward and staff_ward and pickup_ward.ward_id != staff_ward.ward_id:
            return Response(
                {
                    "success": False,
                    "error": (
                        f"Cannot assign cross-ward staff. Selected staff belongs to "
                        f"Ward '{staff_ward.ward_name or staff_ward.ward_number or staff_ward.ward_id}', but pickup request #{pickup_request.id} "
                        f"is in Ward '{pickup_ward.ward_name or pickup_ward.ward_number or pickup_ward.ward_id}'."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update manual waste type if provided (e.g. when AI detection failed)
        manual_waste_type = data.get("waste_type")
        if manual_waste_type and str(manual_waste_type).strip():
            clean_waste_type = str(manual_waste_type).strip()
            pickup_request.waste_images.all().update(waste_type=clean_waste_type)

        # Scheduled pickup date validation (defaults to today if omitted in tests/API)
        raw_scheduled_date = data.get("scheduled_pickup_date")
        if raw_scheduled_date and str(raw_scheduled_date).strip():
            try:
                parsed_scheduled_date = datetime.strptime(str(raw_scheduled_date).strip(), "%Y-%m-%d").date()
            except ValueError:
                try:
                    parsed_scheduled_date = datetime.strptime(str(raw_scheduled_date).strip(), "%d/%m/%Y").date()
                except ValueError:
                    return Response(
                        {"success": False, "error": "Invalid scheduled date format. Expected YYYY-MM-DD."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            today = timezone.now().date()
            if parsed_scheduled_date < today:
                return Response(
                    {"success": False, "error": "Scheduled pickup date cannot be in the past."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            request_date = pickup_request.created_at.date()
            if parsed_scheduled_date < request_date:
                return Response(
                    {
                        "success": False,
                        "error": f"Scheduled pickup date cannot be earlier than the request date ({request_date.strftime('%d/%m/%Y')})."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            parsed_scheduled_date = timezone.now().date()

        request_date = pickup_request.created_at.date()
        if parsed_scheduled_date < request_date:
            return Response(
                {
                    "success": False,
                    "error": f"Scheduled pickup date cannot be earlier than the request date ({request_date.strftime('%d/%m/%Y')})."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save assignment, scheduled date, and update status
        pickup_request.assigned_staff = staff
        pickup_request.scheduled_pickup_date = parsed_scheduled_date
        pickup_request.status = "ASSIGNED"
        pickup_request.save(update_fields=["assigned_staff", "scheduled_pickup_date", "status", "updated_at"])

        staff_name = staff_user_profile.name if staff_user_profile and staff_user_profile.name else staff.user.username
        date_str_formatted = parsed_scheduled_date.strftime("%d/%m/%Y")
        
        # Trigger Notifications
        try:
            create_notification(
                recipient=staff.user,
                title="New Pickup Task Assigned",
                message=f"You have been assigned pickup request #{pickup_request.id} scheduled for {date_str_formatted} at {pickup_request.location_name}.",
                notification_type="TASK_ASSIGNED",
                related_pickup=pickup_request,
                action_url="/stafftask",
            )
            create_notification(
                recipient=pickup_request.user,
                title="Staff Assigned to Your Pickup",
                message=f"Field staff {staff_name} has been assigned to your waste pickup request #{pickup_request.id} (Scheduled: {date_str_formatted}).",
                notification_type="TASK_ASSIGNED",
                related_pickup=pickup_request,
                action_url="/user",
            )
        except Exception as notif_err:
            print("Notification trigger error:", notif_err)

        serializer = WastePickupRequestSerializer(pickup_request, context={"request": request})

        return Response(
            {
                "success": True,
                "message": f"Pickup request #{pickup_request.id} successfully assigned to {staff_name} for {date_str_formatted}.",
                "pickup_request": serializer.data
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# STAFF ASSIGNED TASKS VIEW (For Authenticated Staff)
# ============================================================

class StaffAssignedTasksView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        staff = (
            Staff.objects
            .select_related("user", "user__userprofile", "user__userprofile__ward")
            .filter(user=user)
            .first()
        )
        if not staff:
            return Response(
                {"success": False, "error": "No Staff profile associated with the current user."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Retrieve authenticated staff's assigned ward details & saved MCF coordinates
        staff_profile = getattr(staff.user, "userprofile", None)
        staff_ward = getattr(staff_profile, "ward", None)
        ward_data = None
        if staff_ward:
            ward_data = {
                "ward_id": staff_ward.ward_id,
                "ward_name": staff_ward.ward_name,
                "ward_number": staff_ward.ward_number,
                "location": staff_ward.location,
                "mcf_location_name": staff_ward.mcf_location_name or "",
                "mcf_latitude": float(staff_ward.mcf_latitude) if staff_ward.mcf_latitude is not None else None,
                "mcf_longitude": float(staff_ward.mcf_longitude) if staff_ward.mcf_longitude is not None else None,
            }

        # Return ONLY requests assigned to this specific staff member (excluding CANCELLED)
        tasks = (
            WastePickupRequest.objects
            .filter(assigned_staff=staff)
            .exclude(status="CANCELLED")
            .select_related(
                "user",
                "user__userprofile",
                "user__userprofile__ward",
                "assigned_staff",
                "assigned_staff__user",
                "assigned_staff__user__userprofile",
                "collection",
            )
            .prefetch_related("waste_images")
            .order_by("-updated_at", "-id")
        )

        serializer = WastePickupRequestSerializer(
            tasks,
            many=True,
            context={"request": request}
        )

        return Response(
            {
                "success": True,
                "count": tasks.count(),
                "tasks": serializer.data,
                "staff_ward": ward_data,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# STAFF TASK STATUS UPDATE VIEW (Pending & Completed)
# ============================================================

class StaffTaskUpdateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        user = request.user
        staff = Staff.objects.filter(user=user).first()
        if not staff:
            return Response(
                {"success": False, "error": "Staff profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            task = (
                WastePickupRequest.objects
                .select_related(
                    "user",
                    "user__userprofile",
                    "user__userprofile__ward",
                    "assigned_staff",
                    "assigned_staff__user",
                    "assigned_staff__user__userprofile",
                    "collection",
                )
                .prefetch_related("waste_images")
                .get(id=pk)
            )
        except WastePickupRequest.DoesNotExist:
            return Response(
                {"success": False, "error": f"Task #{pk} not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if task.assigned_staff_id != staff.staff_id:
            return Response(
                {
                    "success": False,
                    "error": "You are not authorized to view this task because it is assigned to another staff member."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = WastePickupRequestSerializer(task, context={"request": request})
        return Response(
            {"success": True, "task": serializer.data},
            status=status.HTTP_200_OK
        )

    def post(self, request, pk):
        # 1. Staff verification
        user = request.user
        staff = Staff.objects.filter(user=user).first()
        if not staff:
            return Response(
                {"success": False, "error": "Staff profile not found for logged-in user."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 2. Task lookup with atomic row lock
        try:
            with transaction.atomic():
                task = WastePickupRequest.objects.select_for_update().get(id=pk)

                # 3. Ownership / assignment verification
                if task.assigned_staff_id != staff.staff_id:
                    return Response(
                        {
                            "success": False,
                            "error": "You are not authorized to update this task because it is assigned to another staff member."
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )

                # 3.1 Cancelled check
                if task.status == "CANCELLED":
                    return Response(
                        {
                            "success": False,
                            "error": "This pickup task was cancelled by the citizen and cannot be started or modified."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # 4. Status extraction & normalization
                status_input = request.data.get("status") or request.POST.get("status") or ""
                new_status = str(status_input).strip().upper()

                if new_status not in ["PENDING", "IN_PROGRESS", "COMPLETED"]:
                    return Response(
                        {"success": False, "error": "Invalid status. Must be 'PENDING', 'IN_PROGRESS', or 'COMPLETED'."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # 4.1 Prevent reverting completed/collected tasks
                if task.status in ["COMPLETED", "COLLECTED"] and new_status in ["PENDING", "IN_PROGRESS"]:
                    return Response(
                        {
                            "success": False,
                            "error": f"This pickup task is already {task.get_status_display()} and cannot be reverted to {new_status}."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # ====================================================
                # CASE 1: IN_PROGRESS (Staff clicked Start Pickup)
                # ====================================================
                if new_status == "IN_PROGRESS":
                    if task.status in ["COLLECTED", "COMPLETED"]:
                        return Response(
                            {"success": False, "error": f"Cannot start pickup. Task is already {task.get_status_display()}."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    task.status = "IN_PROGRESS"
                    task.staff_marked_pending = False
                    task.save(update_fields=["status", "staff_marked_pending", "updated_at"])

                # ====================================================
                # CASE 2: PENDING (Explicitly marked by assigned staff)
                # ====================================================
                elif new_status == "PENDING":
                    has_reason_key = (
                        "pending_reason" in request.data
                        or "reason" in request.data
                        or "pending_reason" in request.POST
                        or "reason" in request.POST
                    )
                    if has_reason_key:
                        raw_reason = (
                            request.data.get("pending_reason")
                            or request.data.get("reason")
                            or request.POST.get("pending_reason")
                            or request.POST.get("reason")
                            or ""
                        )
                        cleaned_reason = str(raw_reason).strip()
                        if not cleaned_reason:
                            return Response(
                                {"success": False, "error": "Reason for marking task as Pending is required."},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                    else:
                        cleaned_reason = "Pending verification by staff"

                    task.status = "PENDING"
                    task.staff_marked_pending = True
                    task.pending_reason = cleaned_reason
                    task.save(update_fields=["status", "staff_marked_pending", "pending_reason", "updated_at"])

        except WastePickupRequest.DoesNotExist:
            return Response(
                {"success": False, "error": f"Task #{pk} not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if new_status == "IN_PROGRESS":
            # Trigger Notifications
            try:
                staff_user_profile = getattr(staff.user, "userprofile", None)
                staff_display_name = staff_user_profile.name if (staff_user_profile and staff_user_profile.name) else staff.user.username
                create_notification(
                    recipient=task.user,
                    title="Pickup Collection Started",
                    message=f"Field staff {staff_display_name} has started collection for your waste pickup request #{task.id} and is en route.",
                    notification_type="TASK_STARTED",
                    related_pickup=task,
                    action_url="/user",
                )
            except Exception as notif_err:
                print("Notification trigger error on start pickup:", notif_err)

            serializer = WastePickupRequestSerializer(task, context={"request": request})
            return Response(
                {
                    "success": True,
                    "message": f"Task #{task.id} started successfully. Status is now IN_PROGRESS.",
                    "task": serializer.data,
                },
                status=status.HTTP_200_OK
            )

        if new_status == "PENDING":

            # Trigger Notifications
            try:
                create_notification(
                    recipient=task.user,
                    title="Pickup Task Rescheduled / Pending",
                    message=f"Your waste pickup request #{task.id} has been marked as pending by field staff {staff.user.username}.",
                    notification_type="TASK_PENDING",
                    related_pickup=task,
                    action_url="/user",
                )
                notify_admins(
                    title="Task Marked Pending",
                    message=f"Staff {staff.user.username} marked pickup request #{task.id} as PENDING.",
                    notification_type="TASK_PENDING",
                    related_pickup=task,
                    action_url="/assign?status=STAFF_PENDING",
                )
            except Exception as notif_err:
                print("Notification trigger error:", notif_err)

            serializer = WastePickupRequestSerializer(task, context={"request": request})
            return Response(
                {
                    "success": True,
                    "message": f"Task #{task.id} status successfully updated to PENDING.",
                    "task": serializer.data,
                },
                status=status.HTTP_200_OK
            )

        # ====================================================
        # CASE 2: COMPLETED
        # ====================================================
        if new_status == "COMPLETED":
            completion_image = (
                request.FILES.get("completion_image") or
                request.FILES.get("image")
            )
            estimated_weight = (
                request.data.get("estimated_weight") or
                request.data.get("weight") or
                request.POST.get("estimated_weight") or
                request.POST.get("weight")
            )

            # Check completion image requirement
            has_existing_collection = hasattr(task, "collection") and task.collection
            if not completion_image and not has_existing_collection:
                return Response(
                    {"success": False, "error": "Completion image is required when completing a task."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate image file type if uploaded
            if completion_image:
                allowed_extensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
                ext = os.path.splitext(completion_image.name)[1].lower()
                if ext not in allowed_extensions:
                    return Response(
                        {"success": False, "error": f"Invalid image format ({ext}). Supported formats: PNG, JPG, JPEG, WEBP, GIF."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Validate estimated weight
            if estimated_weight is None or str(estimated_weight).strip() == "":
                return Response(
                    {"success": False, "error": "Estimated waste weight is required when completing a task."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                weight_val = float(str(estimated_weight).strip())
                if weight_val < 0:
                    return Response(
                        {"success": False, "error": "Estimated weight cannot be negative."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except (ValueError, TypeError):
                return Response(
                    {"success": False, "error": "Invalid estimated weight format. Please enter a valid number."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create or update WasteCollection (prevent duplicates)
            collection, created = WasteCollection.objects.get_or_create(
                pickup_request=task,
                defaults={
                    "staff": staff,
                    "completion_image": completion_image,
                    "estimated_weight": weight_val,
                }
            )

            if not created:
                collection.staff = staff
                if completion_image:
                    collection.completion_image = completion_image
                collection.estimated_weight = weight_val
                collection.save()

            # Update WastePickupRequest status and reset staff_marked_pending
            task.status = "COMPLETED"
            task.staff_marked_pending = False
            task.save(update_fields=["status", "staff_marked_pending", "updated_at"])

            # Trigger Notifications
            try:
                create_notification(
                    recipient=task.user,
                    title="Waste Pickup Completed",
                    message=f"Your waste pickup request #{task.id} was completed by {staff.user.username}. Estimated weight: {weight_val} kg.",
                    notification_type="TASK_COMPLETED",
                    related_pickup=task,
                    action_url="/user",
                )
                notify_admins(
                    title="Pickup Task Completed",
                    message=f"Staff {staff.user.username} completed pickup request #{task.id} ({weight_val} kg collected).",
                    notification_type="TASK_COMPLETED",
                    related_pickup=task,
                    action_url="/assign?status=COMPLETED",
                )
            except Exception as notif_err:
                print("Notification trigger error:", notif_err)

            # Reload with updated relationships
            task.refresh_from_db()
            serializer = WastePickupRequestSerializer(task, context={"request": request})

            return Response(
                {
                    "success": True,
                    "message": f"Task #{task.id} successfully marked as COMPLETED.",
                    "task": serializer.data,
                    "payment_qr": serializer.data.get("payment_qr_data"),
                },
                status=status.HTTP_200_OK
            )


# ============================================================
# STAFF BATCH START TODAY'S COLLECTION VIEW
# ============================================================

class StaffBatchStartCollectionView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        staff = Staff.objects.filter(user=user).first()
        if not staff:
            return Response(
                {"success": False, "error": "Staff profile not found for logged-in user."},
                status=status.HTTP_403_FORBIDDEN
            )

        date_str = request.data.get("scheduled_pickup_date") or request.data.get("date")
        if not date_str:
            return Response(
                {"success": False, "error": "Scheduled pickup date is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            parsed_date = datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date()
        except ValueError:
            try:
                parsed_date = datetime.strptime(str(date_str).strip(), "%d/%m/%Y").date()
            except ValueError:
                return Response(
                    {"success": False, "error": "Invalid date format. Expected YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Validate date: Only today's scheduled collections may be started
        today_dates = {timezone.now().date(), timezone.localdate()}
        if parsed_date not in today_dates:
            return Response(
                {
                    "success": False,
                    "error": f"Collection can only be started for today's scheduled date ({timezone.localdate().strftime('%Y-%m-%d')})."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Atomic database transaction to update only ASSIGNED tasks for this staff & date
        with transaction.atomic():
            eligible_pickups = list(
                WastePickupRequest.objects
                .select_for_update()
                .filter(
                    assigned_staff=staff,
                    scheduled_pickup_date=parsed_date,
                    status="ASSIGNED"
                )
                .select_related("user")
            )

            # Check all scheduled tasks for this date (excluding cancelled)
            all_scheduled = (
                WastePickupRequest.objects
                .filter(
                    assigned_staff=staff,
                    scheduled_pickup_date=parsed_date
                )
                .exclude(status="CANCELLED")
            )

            if not all_scheduled.exists():
                return Response(
                    {"success": False, "error": "No pickup tasks scheduled for this date.", "updated_count": 0},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not eligible_pickups:
                # All active tasks are already IN_PROGRESS or COMPLETED
                return Response(
                    {
                        "success": True,
                        "message": "All eligible pickups for today have already been started.",
                        "updated_count": 0,
                        "all_started": True,
                    },
                    status=status.HTTP_200_OK
                )

            for task in eligible_pickups:
                task.status = "IN_PROGRESS"
                task.staff_marked_pending = False
                task.save(update_fields=["status", "staff_marked_pending", "updated_at"])

        # Trigger notifications outside the atomic block
        staff_user_profile = getattr(staff.user, "userprofile", None)
        staff_display_name = (
            staff_user_profile.name
            if (staff_user_profile and staff_user_profile.name)
            else staff.user.username
        )

        for task in eligible_pickups:
            try:
                create_notification(
                    recipient=task.user,
                    title="Pickup Collection Started",
                    message=f"Field staff {staff_display_name} has started collection for your waste pickup request #{task.id} and is en route.",
                    notification_type="TASK_STARTED",
                    related_pickup=task,
                    action_url="/user",
                )
            except Exception as notif_err:
                print(f"Notification error on batch start for task #{task.id}:", notif_err)

        count = len(eligible_pickups)
        return Response(
            {
                "success": True,
                "message": f"Successfully started collection for {count} pickup request{'s' if count != 1 else ''}.",
                "updated_count": count,
                "all_started": True,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# DASHBOARD STATS VIEW (For Admin Dashboard Live Counts)
# ============================================================

class DashboardStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # ONLY tasks that were assigned and explicitly marked PENDING by staff
        pending_count = WastePickupRequest.objects.filter(
            staff_marked_pending=True,
            status="PENDING"
        ).count()
        completed_count = WastePickupRequest.objects.filter(status="COMPLETED").count()
        assigned_count = WastePickupRequest.objects.filter(status__in=["ASSIGNED", "IN_PROGRESS"]).count()
        in_progress_count = WastePickupRequest.objects.filter(status="IN_PROGRESS").count()
        cancelled_count = WastePickupRequest.objects.filter(status="CANCELLED").count()
        total_requests = WastePickupRequest.objects.count()
        recycled_count = MCFRecyclerAssignment.objects.filter(status="COMPLETED").count()

        return Response(
            {
                "success": True,
                "stats": {
                    "pending_count": pending_count,
                    "completed_count": completed_count,
                    "assigned_count": assigned_count,
                    "in_progress_count": in_progress_count,
                    "cancelled_count": cancelled_count,
                    "total_requests": total_requests,
                    "recycled_count": recycled_count,
                }
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# USER PICKUP / ROUTE HISTORY VIEW (For Authenticated Users)
# ============================================================

class UserPickupHistoryView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Query only the authenticated user's requests
        requests_qs = (
            WastePickupRequest.objects
            .filter(user=user)
            .select_related(
                "user",
                "user__userprofile",
                "user__userprofile__ward",
                "assigned_staff",
                "assigned_staff__user",
                "assigned_staff__user__userprofile",
                "collection",
                "collection__staff",
                "collection__staff__user",
                "collection__staff__user__userprofile",
            )
            .prefetch_related("waste_images")
        )

        # Filter by status (default is COMPLETED for pickup history)
        status_param = request.query_params.get("status", "COMPLETED").strip().upper()
        if status_param == "ALL":
            pass
        elif status_param in ["COMPLETED_AND_CANCELLED", "HISTORY"]:
            requests_qs = requests_qs.filter(status__in=["COMPLETED", "CANCELLED"])
        else:
            requests_qs = requests_qs.filter(status=status_param)

        # Sort by completion date descending (most recently completed first)
        requests_qs = requests_qs.order_by("-collection__completed_at", "-updated_at", "-id")

        serializer = WastePickupRequestSerializer(
            requests_qs,
            many=True,
            context={"request": request}
        )

        return Response(
            {
                "success": True,
                "count": requests_qs.count(),
                "history": serializer.data,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# USER LATEST PICKUP VIEW (For Waste Pickup Tracking Timeline)
# ============================================================

class UserLatestPickupView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        latest_pickup = (
            WastePickupRequest.objects
            .filter(user=user)
            .select_related(
                "user",
                "user__userprofile",
                "user__userprofile__ward",
                "assigned_staff",
                "assigned_staff__user",
                "assigned_staff__user__userprofile",
                "collection",
                "collection__staff",
                "collection__staff__user",
                "collection__staff__user__userprofile",
            )
            .prefetch_related("waste_images")
            .order_by("-id")
            .first()
        )

        if not latest_pickup:
            return Response(
                {
                    "success": True,
                    "has_pickup": False,
                    "latest_pickup": None,
                    "message": "No pickup requests found for this user."
                },
                status=status.HTTP_200_OK
            )

        serializer = WastePickupRequestSerializer(
            latest_pickup,
            context={"request": request}
        )

        return Response(
            {
                "success": True,
                "has_pickup": True,
                "latest_pickup": serializer.data,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# CITIZEN CANCEL PICKUP REQUEST VIEW
# ============================================================

class CitizenCancelPickupView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user

        try:
            with transaction.atomic():
                pickup = WastePickupRequest.objects.select_for_update().get(id=pk)

                if pickup.user_id != user.id and not user.is_staff:
                    return Response(
                        {"success": False, "error": "You are not authorized to cancel this pickup request."},
                        status=status.HTTP_403_FORBIDDEN
                    )

                if pickup.status in ["IN_PROGRESS", "COLLECTED", "COMPLETED"]:
                    return Response(
                        {
                            "success": False,
                            "error": f"Cannot cancel pickup request. Collection has already progressed to {pickup.get_status_display()}."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if pickup.status == "CANCELLED":
                    return Response(
                        {"success": False, "error": "This pickup request is already cancelled."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if pickup.status not in ["PENDING", "ASSIGNED"]:
                    return Response(
                        {
                            "success": False,
                            "error": f"Cannot cancel pickup request from status {pickup.get_status_display()}."
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                assigned_staff_obj = pickup.assigned_staff
                scheduled_date_str = pickup.scheduled_pickup_date.strftime("%d/%m/%Y") if pickup.scheduled_pickup_date else "today"

                pickup.status = "CANCELLED"
                pickup.save(update_fields=["status", "updated_at"])

            # Trigger Notifications outside atomic block
            try:
                if assigned_staff_obj and assigned_staff_obj.user:
                    create_notification(
                        recipient=assigned_staff_obj.user,
                        title="Pickup Request Cancelled by Citizen",
                        message=f"Pickup request #{pickup.id} scheduled for {scheduled_date_str} was cancelled by citizen {user.username}.",
                        notification_type="TASK_CANCELLED",
                        related_pickup=pickup,
                        action_url="/stafftask",
                    )

                notify_admins(
                    title="Pickup Request Cancelled by Citizen",
                    message=f"Citizen {user.username} cancelled pickup request #{pickup.id} (Scheduled: {scheduled_date_str}).",
                    notification_type="TASK_CANCELLED",
                    related_pickup=pickup,
                    action_url="/assign?status=CANCELLED",
                )
            except Exception as notif_err:
                print("Notification trigger error on cancel:", notif_err)

            serializer = WastePickupRequestSerializer(pickup, context={"request": request})
            return Response(
                {
                    "success": True,
                    "message": f"Pickup request #{pickup.id} was successfully cancelled.",
                    "task": serializer.data,
                },
                status=status.HTTP_200_OK
            )
        except WastePickupRequest.DoesNotExist:
            return Response(
                {"success": False, "error": f"Pickup request #{pk} not found."},
                status=status.HTTP_404_NOT_FOUND
            )


# ============================================================
# CREATE WASTE COMPLAINT (Authenticated User)
# ============================================================

class WasteComplaintCreateView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"success": False, "message": "Authentication required. Please login again."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        data = request.data
        location_name = data.get("location_name") or request.POST.get("location_name") or ""
        description = data.get("description") or request.POST.get("description") or ""
        latitude = data.get("latitude") or request.POST.get("latitude")
        longitude = data.get("longitude") or request.POST.get("longitude")
        image = request.FILES.get("image") or request.FILES.get("complaint_image") or request.FILES.get("photo")

        if not location_name.strip():
            return Response(
                {"success": False, "message": "Location name is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not description.strip():
            return Response(
                {"success": False, "message": "Complaint description is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        lat_val = None
        lon_val = None
        if latitude is not None and str(latitude).strip() != "":
            try:
                lat_val = float(str(latitude).strip())
            except (ValueError, TypeError):
                pass

        if longitude is not None and str(longitude).strip() != "":
            try:
                lon_val = float(str(longitude).strip())
            except (ValueError, TypeError):
                pass

        # Automatically determine location-based priority
        priority = determine_complaint_priority(
            location_name=location_name,
            latitude=lat_val,
            longitude=lon_val,
        )

        complaint = WasteComplaint.objects.create(
            user=user,
            image=image,
            location_name=location_name.strip(),
            latitude=lat_val,
            longitude=lon_val,
            description=description.strip(),
            priority=priority,
            status="NEW",
        )

        # Trigger Notifications
        try:
            create_notification(
                recipient=user,
                title="Complaint Registered",
                message=f"Your waste complaint #{complaint.id} for {complaint.location_name} has been registered with {priority} priority.",
                notification_type="COMPLAINT_CREATED",
                related_complaint=complaint,
                action_url="/user",
            )
            notify_admins(
                title=f"New [{priority}] Waste Complaint",
                message=f"New waste complaint #{complaint.id} registered at {complaint.location_name} with {priority} priority.",
                notification_type="COMPLAINT_CREATED",
                related_complaint=complaint,
                action_url="/admincomplaints",
            )
        except Exception as notif_err:
            print("Notification trigger error:", notif_err)

        serializer = WasteComplaintSerializer(complaint, context={"request": request})

        return Response(
            {
                "success": True,
                "message": f"Waste complaint registered successfully with {priority} priority.",
                "complaint": serializer.data,
            },
            status=status.HTTP_201_CREATED
        )


# ============================================================
# USER COMPLAINTS LIST VIEW (My Complaints)
# ============================================================

class UserComplaintListView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        complaints = (
            WasteComplaint.objects
            .filter(user=user)
            .select_related(
                "user",
                "user__userprofile",
                "user__userprofile__ward",
                "assigned_staff",
                "assigned_staff__user",
                "assigned_staff__user__userprofile",
            )
            .order_by("-id")
        )

        serializer = WasteComplaintSerializer(complaints, many=True, context={"request": request})
        return Response(
            {
                "success": True,
                "count": complaints.count(),
                "complaints": serializer.data,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# USER COMPLAINT DETAIL VIEW
# ============================================================

class UserComplaintDetailView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            complaint = (
                WasteComplaint.objects
                .select_related(
                    "user",
                    "user__userprofile",
                    "user__userprofile__ward",
                    "assigned_staff",
                    "assigned_staff__user",
                    "assigned_staff__user__userprofile",
                )
                .get(id=pk)
            )
        except WasteComplaint.DoesNotExist:
            return Response(
                {"success": False, "error": f"Complaint #{pk} not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Enforce security: authenticated user must be the owner, or assigned staff, or admin/superuser
        user = request.user
        is_owner = (complaint.user_id == user.id)
        is_assigned_staff = hasattr(user, "staff") and (complaint.assigned_staff_id == user.staff.staff_id)
        is_admin = user.is_staff or user.is_superuser

        if not (is_owner or is_assigned_staff or is_admin):
            return Response(
                {"success": False, "error": "You do not have permission to view this complaint."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = WasteComplaintSerializer(complaint, context={"request": request})
        return Response(
            {
                "success": True,
                "complaint": serializer.data,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# ADMIN COMPLAINTS LIST VIEW (Sorted HIGH -> MEDIUM -> LOW, Newest first)
# ============================================================


class AdminComplaintListView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        # Priority sort order: HIGH = 1, MEDIUM = 2, LOW = 3
        priority_order = models.Case(
            models.When(priority="HIGH", then=models.Value(1)),
            models.When(priority="MEDIUM", then=models.Value(2)),
            models.When(priority="LOW", then=models.Value(3)),
            default=models.Value(4),
            output_field=models.IntegerField(),
        )

        complaints = (
            WasteComplaint.objects
            .select_related(
                "user",
                "user__userprofile",
                "user__userprofile__ward",
                "assigned_staff",
                "assigned_staff__user",
                "assigned_staff__user__userprofile",
            )
            .annotate(priority_rank=priority_order)
            .order_by("priority_rank", "-created_at", "-id")
        )

        # Optional filtering by priority or status
        priority_filter = request.query_params.get("priority")
        if priority_filter and priority_filter.upper() in ["HIGH", "MEDIUM", "LOW"]:
            complaints = complaints.filter(priority=priority_filter.upper())

        status_filter = request.query_params.get("status")
        if status_filter:
            complaints = complaints.filter(status=status_filter.upper())

        serializer = WasteComplaintSerializer(complaints, many=True, context={"request": request})
        return Response(
            {
                "success": True,
                "count": complaints.count(),
                "complaints": serializer.data,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# ADMIN ASSIGN COMPLAINT TO STAFF
# ============================================================

class AdminAssignComplaintView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, pk=None):
        data = request.data
        complaint_id = pk or data.get("complaint_id") or data.get("id")
        staff_id = data.get("staff_id")

        if not complaint_id:
            return Response(
                {"success": False, "error": "complaint_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not staff_id:
            return Response(
                {"success": False, "error": "staff_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            complaint = (
                WasteComplaint.objects
                .select_related("user", "user__userprofile", "user__userprofile__ward")
                .get(id=complaint_id)
            )
        except (WasteComplaint.DoesNotExist, ValueError):
            return Response(
                {"success": False, "error": f"Complaint #{complaint_id} not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Robust staff lookup matching AssignPickupView
        staff = None
        staff_id_str = str(staff_id).strip()

        # 1. Numeric lookup by staff_id or user_id or userprofile_id
        if staff_id_str.isdigit():
            numeric_id = int(staff_id_str)
            staff = (
                Staff.objects.select_related("user", "user__userprofile", "user__userprofile__ward")
                .filter(
                    models.Q(staff_id=numeric_id) |
                    models.Q(user_id=numeric_id) |
                    models.Q(user__userprofile__id=numeric_id)
                )
                .first()
            )

        # 2. Case-insensitive lookup by username, email, or profile name
        if not staff:
            staff = (
                Staff.objects.select_related("user", "user__userprofile", "user__userprofile__ward")
                .filter(
                    models.Q(user__username__iexact=staff_id_str) |
                    models.Q(user__email__iexact=staff_id_str) |
                    models.Q(user__userprofile__name__iexact=staff_id_str)
                )
                .first()
            )

        # 3. Partial contains fallback
        if not staff:
            staff = (
                Staff.objects.select_related("user", "user__userprofile", "user__userprofile__ward")
                .filter(
                    models.Q(user__username__icontains=staff_id_str) |
                    models.Q(user__userprofile__name__icontains=staff_id_str)
                )
                .first()
            )

        if not staff:
            return Response(
                {"success": False, "error": f"Staff member '{staff_id}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Save assignment and update status
        complaint.assigned_staff = staff
        complaint.status = "ASSIGNED"
        complaint.save(update_fields=["assigned_staff", "status", "updated_at"])

        staff_user_profile = getattr(staff.user, "userprofile", None)
        staff_name = staff_user_profile.name if staff_user_profile and staff_user_profile.name else staff.user.username
        
        # Trigger Notifications
        try:
            create_notification(
                recipient=staff.user,
                title="New Complaint Assigned",
                message=f"You have been assigned to resolve waste complaint #{complaint.id} at {complaint.location_name}.",
                notification_type="COMPLAINT_ASSIGNED",
                related_complaint=complaint,
                action_url="/stafftask",
            )
            create_notification(
                recipient=complaint.user,
                title="Complaint Assigned to Staff",
                message=f"Your waste complaint #{complaint.id} has been assigned to field staff {staff_name}.",
                notification_type="COMPLAINT_ASSIGNED",
                related_complaint=complaint,
                action_url="/user",
            )
        except Exception as notif_err:
            print("Notification trigger error:", notif_err)

        serializer = WasteComplaintSerializer(complaint, context={"request": request})

        return Response(
            {
                "success": True,
                "message": f"Complaint #{complaint.id} successfully assigned to {staff_name}.",
                "complaint": serializer.data
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# STAFF ASSIGNED COMPLAINTS VIEW (For Authenticated Staff)
# ============================================================

class StaffAssignedComplaintsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        staff = Staff.objects.filter(user=user).first()
        if not staff:
            return Response(
                {"success": False, "error": "No Staff profile associated with the current user."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Return ONLY complaints assigned to this specific staff member
        complaints = (
            WasteComplaint.objects
            .filter(assigned_staff=staff)
            .select_related(
                "user",
                "user__userprofile",
                "user__userprofile__ward",
                "assigned_staff",
                "assigned_staff__user",
                "assigned_staff__user__userprofile",
            )
            .order_by("-updated_at", "-id")
        )

        serializer = WasteComplaintSerializer(complaints, many=True, context={"request": request})
        return Response(
            {
                "success": True,
                "count": complaints.count(),
                "complaints": serializer.data,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# ALL AVAILABLE STAFF LIST VIEW (FOR ANY-WARD COMPLAINTS)
# ============================================================

class AllStaffListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        staff_queryset = Staff.objects.select_related("user", "user__userprofile", "user__userprofile__ward").all()
        data = []
        for s in staff_queryset:
            profile = getattr(s.user, "userprofile", None)
            ward_name = (profile.ward.ward_name or f"Ward {profile.ward.ward_number or profile.ward.ward_id}") if profile and profile.ward else "General Ward"
            ward_id = profile.ward.ward_id if profile and profile.ward else None
            name = profile.name if profile and profile.name else (s.user.get_full_name() or s.user.username)
            phone = profile.phone if profile and profile.phone else s.phone
            data.append({
                "staff_id": s.staff_id,
                "id": s.staff_id,
                "user_id": s.user.id,
                "name": name,
                "username": s.user.username,
                "email": s.user.email,
                "phone": phone,
                "designation": s.designation or "Field Staff",
                "ward": ward_name,
                "ward_id": ward_id,
                "address": s.address,
            })
        return Response(data, status=status.HTTP_200_OK)


# ============================================================
# STAFF COMPLAINT STATUS UPDATE & RESOLUTION VIEW
# ============================================================

class StaffComplaintUpdateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        staff = Staff.objects.filter(user=user).first()
        if not staff:
            return Response(
                {"success": False, "error": "Staff profile not found."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            complaint = (
                WasteComplaint.objects
                .select_related("user", "user__userprofile", "user__userprofile__ward", "assigned_staff")
                .get(id=pk)
            )
        except WasteComplaint.DoesNotExist:
            return Response(
                {"success": False, "error": f"Complaint #{pk} not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if complaint.assigned_staff_id != staff.staff_id:
            return Response(
                {"success": False, "error": "You are not authorized to update this complaint."},
                status=status.HTTP_403_FORBIDDEN
            )

        status_input = (request.data.get("status") or request.POST.get("status") or "").strip().upper()
        if status_input not in ["ASSIGNED", "IN_PROGRESS", "RESOLVED"]:
            return Response(
                {"success": False, "error": "Invalid status. Must be 'ASSIGNED', 'IN_PROGRESS', or 'RESOLVED'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        proof_image = request.FILES.get("proof_image") or request.FILES.get("image")
        update_fields = ["status", "updated_at"]

        if status_input == "RESOLVED":
            if not proof_image and not complaint.proof_image:
                return Response(
                    {
                        "success": False,
                        "error": "A proof image showing cleared waste is required to resolve this complaint."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if proof_image:
                complaint.proof_image = proof_image
                update_fields.append("proof_image")

            complaint.resolved_at = timezone.now()
            update_fields.append("resolved_at")
        elif proof_image:
            complaint.proof_image = proof_image
            update_fields.append("proof_image")

        complaint.status = status_input
        complaint.save(update_fields=update_fields)

        # Trigger Notifications
        try:
            if status_input == "RESOLVED":
                create_notification(
                    recipient=complaint.user,
                    title="Waste Complaint Resolved",
                    message=f"Your waste complaint #{complaint.id} at {complaint.location_name} has been resolved by field staff.",
                    notification_type="COMPLAINT_RESOLVED",
                    related_complaint=complaint,
                    action_url="/user",
                )
                notify_admins(
                    title="Complaint Resolved",
                    message=f"Complaint #{complaint.id} at {complaint.location_name} was marked as RESOLVED by staff {staff.user.username}.",
                    notification_type="COMPLAINT_RESOLVED",
                    related_complaint=complaint,
                    action_url="/admincomplaints",
                )
            elif status_input == "IN_PROGRESS":
                create_notification(
                    recipient=complaint.user,
                    title="Complaint In Progress",
                    message=f"Field staff is actively addressing your complaint #{complaint.id} at {complaint.location_name}.",
                    notification_type="COMPLAINT_IN_PROGRESS",
                    related_complaint=complaint,
                    action_url="/user",
                )
        except Exception as notif_err:
            print("Notification trigger error:", notif_err)

        serializer = WasteComplaintSerializer(complaint, context={"request": request})
        return Response(
            {
                "success": True,
                "message": f"Complaint #{complaint.id} status updated to {status_input}.",
                "complaint": serializer.data,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# STAFF MCF DAILY WASTE COLLECTION VIEWS
# ============================================================

class StaffMCFTodayView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        staff = Staff.objects.filter(user=user).first()
        if not staff:
            return Response(
                {"success": False, "error": "No staff profile associated with current user."},
                status=status.HTTP_403_FORBIDDEN
            )

        date_str = request.query_params.get("date")
        if date_str:
            try:
                target_date = datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"success": False, "error": "Invalid date format. Expected YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            target_date = timezone.now().date()

        collection = StaffMCFCollection.objects.filter(staff=staff, date=target_date).first()

        if collection:
            serializer = StaffMCFCollectionSerializer(collection)
            return Response({
                "success": True,
                "exists": True,
                "date": str(target_date),
                "collection": serializer.data,
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "success": True,
                "exists": False,
                "date": str(target_date),
                "collection": {
                    "date": str(target_date),
                    "paper": "0.00",
                    "plastic": "0.00",
                    "glass": "0.00",
                    "metal": "0.00",
                    "organic": "0.00",
                    "electronics": "0.00",
                    "miscellaneous": "0.00",
                    "total_quantity": "0.00",
                }
            }, status=status.HTTP_200_OK)


class StaffMCFCollectionSubmitView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        staff = Staff.objects.filter(user=user).first()
        if not staff:
            return Response(
                {"success": False, "error": "No staff profile associated with current user."},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data
        date_str = data.get("date")
        if date_str:
            try:
                target_date = datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"success": False, "error": "Invalid date format. Expected YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            target_date = timezone.now().date()

        # Parse and validate quantities
        categories = ["paper", "plastic", "glass", "metal", "organic", "electronics", "miscellaneous"]
        parsed_quantities = {}

        for cat in categories:
            val = data.get(cat, 0)
            if val is None or str(val).strip() == "":
                val = 0
            try:
                num = float(val)
                if num < 0:
                    return Response(
                        {"success": False, "error": f"{cat.capitalize()} quantity cannot be negative."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                parsed_quantities[cat] = round(num, 2)
            except (ValueError, TypeError):
                return Response(
                    {"success": False, "error": f"Invalid number format for {cat} quantity."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Upsert StaffMCFCollection (prevents duplicate records for same staff and date)
        collection, created = StaffMCFCollection.objects.update_or_create(
            staff=staff,
            date=target_date,
            defaults={
                "paper": parsed_quantities["paper"],
                "plastic": parsed_quantities["plastic"],
                "glass": parsed_quantities["glass"],
                "metal": parsed_quantities["metal"],
                "organic": parsed_quantities["organic"],
                "electronics": parsed_quantities["electronics"],
                "miscellaneous": parsed_quantities["miscellaneous"],
            }
        )

        serializer = StaffMCFCollectionSerializer(collection)
        action_verb = "submitted" if created else "updated"

        return Response({
            "success": True,
            "message": f"MCF daily collection successfully {action_verb} for {target_date}.",
            "created": created,
            "collection": serializer.data,
        }, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)


# ============================================================
# ADMIN MCF DAILY AGGREGATION & DETAILS VIEWS
# ============================================================

class AdminMCFDailyListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        daily_groups = (
            StaffMCFCollection.objects
            .values("date")
            .annotate(
                total_paper=models.Sum("paper"),
                total_plastic=models.Sum("plastic"),
                total_glass=models.Sum("glass"),
                total_metal=models.Sum("metal"),
                total_organic=models.Sum("organic"),
                total_electronics=models.Sum("electronics"),
                total_miscellaneous=models.Sum("miscellaneous"),
                grand_total=models.Sum("total_quantity"),
                staff_count=models.Count("staff", distinct=True),
            )
            .order_by("-date")
        )

        results = []
        for g in daily_groups:
            d = g["date"]
            assignments_count = MCFRecyclerAssignment.objects.filter(date=d).count()
            formatted_date = d.strftime("%d %b %Y")
            
            results.append({
                "date": str(d),
                "date_formatted": formatted_date,
                "grand_total": float(g["grand_total"] or 0),
                "staff_count": g["staff_count"],
                "total_paper": float(g["total_paper"] or 0),
                "total_plastic": float(g["total_plastic"] or 0),
                "total_glass": float(g["total_glass"] or 0),
                "total_metal": float(g["total_metal"] or 0),
                "total_organic": float(g["total_organic"] or 0),
                "total_electronics": float(g["total_electronics"] or 0),
                "total_miscellaneous": float(g["total_miscellaneous"] or 0),
                "assignments_count": assignments_count,
            })

        return Response({
            "success": True,
            "count": len(results),
            "daily_totals": results,
        }, status=status.HTTP_200_OK)


class AdminMCFDateDetailsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            target_date = timezone.now().date()
        else:
            try:
                target_date = datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"success": False, "error": "Invalid date format. Expected YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        totals = (
            StaffMCFCollection.objects
            .filter(date=target_date)
            .aggregate(
                total_paper=models.Sum("paper"),
                total_plastic=models.Sum("plastic"),
                total_glass=models.Sum("glass"),
                total_metal=models.Sum("metal"),
                total_organic=models.Sum("organic"),
                total_electronics=models.Sum("electronics"),
                total_miscellaneous=models.Sum("miscellaneous"),
                grand_total=models.Sum("total_quantity"),
                staff_count=models.Count("staff", distinct=True),
            )
        )

        grand_total = float(totals["grand_total"] or 0)
        staff_count = totals["staff_count"] or 0

        # Existing assignments for this date
        assignments = {
            a.waste_type: MCFRecyclerAssignmentSerializer(a).data
            for a in MCFRecyclerAssignment.objects.filter(date=target_date).select_related("recycler", "recycler__user", "assigned_by")
        }

        categories_config = [
            {"key": "Paper", "total": float(totals["total_paper"] or 0)},
            {"key": "Plastic", "total": float(totals["total_plastic"] or 0)},
            {"key": "Glass", "total": float(totals["total_glass"] or 0)},
            {"key": "Metal", "total": float(totals["total_metal"] or 0)},
            {"key": "Organic", "total": float(totals["total_organic"] or 0)},
            {"key": "Electronics", "total": float(totals["total_electronics"] or 0)},
            {"key": "Miscellaneous", "total": float(totals["total_miscellaneous"] or 0)},
        ]

        categories_data = []
        for cat in categories_config:
            w_type = cat["key"]
            qty = cat["total"]
            assignment_info = assignments.get(w_type, None)
            
            categories_data.append({
                "waste_type": w_type,
                "total_quantity": qty,
                "is_assigned": bool(assignment_info),
                "assignment": assignment_info,
            })

        # List of staff submissions for this date
        staff_records = (
            StaffMCFCollection.objects
            .filter(date=target_date)
            .select_related("staff", "staff__user", "staff__user__userprofile")
        )
        staff_serializer = StaffMCFCollectionSerializer(staff_records, many=True)

        return Response({
            "success": True,
            "date": str(target_date),
            "date_formatted": target_date.strftime("%d %B %Y"),
            "grand_total": grand_total,
            "staff_count": staff_count,
            "categories": categories_data,
            "staff_submissions": staff_serializer.data,
        }, status=status.HTTP_200_OK)


class AdminMCFAssignRecyclerView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        date_str = data.get("date")
        waste_type = data.get("waste_type")
        recycler_id = data.get("recycler_id")

        if not date_str:
            return Response(
                {"success": False, "error": "date is required (YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not waste_type:
            return Response(
                {"success": False, "error": "waste_type is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not recycler_id:
            return Response(
                {"success": False, "error": "recycler_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            target_date = datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"success": False, "error": "Invalid date format. Expected YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            recycler = Recycler.objects.select_related("user", "user__userprofile").get(recycler_id=recycler_id)
        except Recycler.DoesNotExist:
            return Response(
                {"success": False, "error": f"Recycler #{recycler_id} not found in database."},
                status=status.HTTP_404_NOT_FOUND
            )

        field_map = {
            "Paper": "paper",
            "Plastic": "plastic",
            "Glass": "glass",
            "Metal": "metal",
            "Organic": "organic",
            "Electronics": "electronics",
            "Miscellaneous": "miscellaneous",
        }
        db_field = field_map.get(waste_type.capitalize(), "plastic")
        
        sum_result = StaffMCFCollection.objects.filter(date=target_date).aggregate(
            total=models.Sum(db_field)
        )
        total_qty = float(sum_result["total"] or 0)

        assigned_user = request.user if request.user and request.user.is_authenticated else None
        
        assignment, created = MCFRecyclerAssignment.objects.update_or_create(
            date=target_date,
            waste_type=waste_type,
            defaults={
                "recycler": recycler,
                "total_quantity": total_qty,
                "assigned_by": assigned_user,
                "status": "PENDING",
            }
        )

        try:
            create_notification(
                recipient=recycler.user,
                title=f"New {waste_type} Waste Assigned",
                message=f"You have been assigned {total_qty} kg of {waste_type} collected from MCF on {target_date.strftime('%d %b %Y')}.",
                notification_type="RECYCLER_ALERT",
                action_url="/recycler",
            )
        except Exception as notif_err:
            print("Notification trigger error for recycler assignment:", notif_err)

        serializer = MCFRecyclerAssignmentSerializer(assignment)
        action_verb = "assigned" if created else "reassigned"

        return Response({
            "success": True,
            "message": f"Successfully {action_verb} {recycler.organization} to {waste_type} for {target_date}.",
            "assignment": serializer.data,
        }, status=status.HTTP_200_OK)


class ExistingRecyclerListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        waste_type = request.query_params.get("waste_type")
        qs = Recycler.objects.select_related("user", "user__userprofile").all()
        if waste_type:
            qs = qs.filter(waste_type__icontains=waste_type.strip())

        serializer = RecyclerOptionSerializer(qs, many=True)
        return Response({
            "success": True,
            "count": qs.count(),
            "recyclers": serializer.data,
        }, status=status.HTTP_200_OK)


def get_recycler_for_user(user):
    if not user or not user.is_authenticated:
        return None
    try:
        if hasattr(user, "recycler"):
            return user.recycler
    except Exception:
        pass
    rec = Recycler.objects.filter(user=user).first()
    if rec:
        return rec
    if getattr(user, "email", None):
        rec = Recycler.objects.filter(user__email__iexact=user.email.strip()).first()
        if rec:
            return rec
    if getattr(user, "username", None):
        rec = Recycler.objects.filter(user__username__iexact=user.username.strip()).first()
        if rec:
            return rec
    return None


class RecyclerTasksView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recycler = get_recycler_for_user(request.user)
        if not recycler:
            return Response(
                {"success": False, "error": "Current authenticated user is not registered as a Recycler."},
                status=status.HTTP_403_FORBIDDEN
            )

        pending_qs = MCFRecyclerAssignment.objects.filter(
            recycler=recycler
        ).filter(
            models.Q(status="PENDING") | models.Q(status__isnull=True) | models.Q(status="")
        ).select_related("recycler", "assigned_by").order_by("-date", "-created_at")

        completed_qs = MCFRecyclerAssignment.objects.filter(
            recycler=recycler,
            status="COMPLETED"
        ).select_related("recycler", "assigned_by").order_by("-completed_at", "-date")

        pending_serializer = MCFRecyclerAssignmentSerializer(pending_qs, many=True, context={"request": request})
        completed_serializer = MCFRecyclerAssignmentSerializer(completed_qs, many=True, context={"request": request})

        return Response({
            "success": True,
            "pending_tasks": pending_serializer.data,
            "completed_tasks": completed_serializer.data,
            "counts": {
                "newly": pending_qs.count(),
                "completed": completed_qs.count()
            }
        }, status=status.HTTP_200_OK)


class RecyclerCompleteTaskView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        recycler = get_recycler_for_user(request.user)
        if not recycler:
            return Response(
                {"success": False, "error": "Current authenticated user is not registered as a Recycler."},
                status=status.HTTP_403_FORBIDDEN
            )

        assignment_id = request.data.get("assignment_id")
        if not assignment_id:
            return Response(
                {"success": False, "error": "assignment_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            assignment = MCFRecyclerAssignment.objects.select_related("recycler").get(pk=assignment_id)
        except MCFRecyclerAssignment.DoesNotExist:
            return Response(
                {"success": False, "error": f"Assignment #{assignment_id} not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if assignment.recycler != recycler:
            return Response(
                {"success": False, "error": "You are not authorized to complete this assignment."},
                status=status.HTTP_403_FORBIDDEN
            )

        if assignment.status == "COMPLETED":
            return Response(
                {"success": False, "error": "This recycling task has already been completed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw_qty = request.data.get("recyclable_quantity")
        if raw_qty is None or str(raw_qty).strip() == "":
            return Response(
                {"success": False, "error": "Recyclable waste quantity is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            recyclable_qty = Decimal(str(raw_qty).strip())
        except (ValueError, TypeError, InvalidOperation):
            return Response(
                {"success": False, "error": "Please enter a valid numeric recyclable quantity."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if recyclable_qty < Decimal("0"):
            return Response(
                {"success": False, "error": "Recyclable quantity cannot be negative."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if recyclable_qty > assignment.total_quantity:
            return Response(
                {
                    "success": False,
                    "error": f"Recyclable quantity ({recyclable_qty} kg) cannot exceed assigned quantity of {assignment.total_quantity} kg."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        note = str(request.data.get("note", "") or "").strip()

        recycling_image = request.FILES.get("recycling_image")
        if recycling_image:
            valid_extensions = [".jpg", ".jpeg", ".png", ".webp"]
            ext = os.path.splitext(recycling_image.name)[1].lower()
            if ext not in valid_extensions:
                return Response(
                    {"success": False, "error": "Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            assignment.recycling_image = recycling_image

        assignment.recyclable_quantity = recyclable_qty
        assignment.note = note
        assignment.status = "COMPLETED"
        assignment.completed_at = timezone.now()
        assignment.save()

        # Trigger Admin Notification
        try:
            recycler_name = (
                getattr(recycler, "organization", None)
                or (request.user.get_full_name() if request.user else "")
                or (request.user.username if request.user else "Recycler")
            )
            notify_admins(
                title="Recycling Task Completed",
                message=f"Recycler {recycler_name} completed processing {recyclable_qty} kg of {assignment.waste_type} waste.",
                notification_type="RECYCLER_ALERT",
                action_url="/admin/recycled-history",
            )
        except Exception as notif_err:
            print("Notification trigger error on recycler task completion:", notif_err)

        serializer = MCFRecyclerAssignmentSerializer(assignment, context={"request": request})
        return Response({
            "success": True,
            "message": "Recycling task completed successfully.",
            "assignment": serializer.data,
        }, status=status.HTTP_200_OK)


# ============================================================
# FIXED ₹50 PICKUP PAYMENT SYSTEM VIEWS
# ============================================================

class PaymentDetailByPickupView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pickup_id):
        try:
            pickup = WastePickupRequest.objects.select_related(
                "user", "user__userprofile", "assigned_staff", "assigned_staff__user", "collection"
            ).get(id=pickup_id)
        except WastePickupRequest.DoesNotExist:
            return Response({"success": False, "error": f"Pickup #{pickup_id} not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user and user.is_authenticated:
            is_owner = (pickup.user_id == user.id)
            is_admin = (user.is_staff or user.is_superuser)
            if not (is_owner or is_admin):
                return Response({"success": False, "error": "Access denied for this pickup payment."}, status=status.HTTP_403_FORBIDDEN)

        payment, _ = Payment.objects.get_or_create(
            pickup_request=pickup,
            defaults={
                "user": pickup.user,
                "amount": 50.00,
                "payment_status": "PENDING",
            }
        )

        serializer = PaymentSerializer(payment, context={"request": request})
        return Response({
            "success": True,
            "payment": serializer.data,
        }, status=status.HTTP_200_OK)


class PaymentCreateOrderView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        pickup_id = request.data.get("pickup_id")
        if not pickup_id:
            return Response({"success": False, "error": "pickup_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pickup = WastePickupRequest.objects.select_related("user").get(id=pickup_id)
        except WastePickupRequest.DoesNotExist:
            return Response({"success": False, "error": f"Pickup #{pickup_id} not found."}, status=status.HTTP_404_NOT_FOUND)

        payment, _ = Payment.objects.get_or_create(
            pickup_request=pickup,
            defaults={
                "user": pickup.user,
                "amount": 50.00,
                "payment_status": "PENDING",
            }
        )

        if payment.payment_status == "COMPLETED":
            return Response({
                "success": True,
                "already_paid": True,
                "message": "Payment for this pickup has already been completed.",
                "payment": PaymentSerializer(payment, context={"request": request}).data,
            }, status=status.HTTP_200_OK)

        import uuid
        order_id = f"order_ecopulse_{uuid.uuid4().hex[:12]}"
        payment.order_id = order_id
        payment.save(update_fields=["order_id"])

        return Response({
            "success": True,
            "order_id": order_id,
            "amount": 50.00,
            "currency": "INR",
            "pickup_id": pickup.id,
            "payment_id": payment.payment_id,
            "payment": PaymentSerializer(payment, context={"request": request}).data,
        }, status=status.HTTP_200_OK)


class PaymentVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        pickup_id = request.data.get("pickup_id")
        transaction_id = request.data.get("transaction_id")
        payment_method = request.data.get("payment_method", "UPI / Online")

        if not pickup_id:
            return Response({"success": False, "error": "pickup_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pickup = WastePickupRequest.objects.select_related("user", "user__userprofile").get(id=pickup_id)
        except WastePickupRequest.DoesNotExist:
            return Response({"success": False, "error": f"Pickup #{pickup_id} not found."}, status=status.HTTP_404_NOT_FOUND)

        payment, _ = Payment.objects.get_or_create(
            pickup_request=pickup,
            defaults={
                "user": pickup.user,
                "amount": 50.00,
                "payment_status": "PENDING",
            }
        )

        if payment.payment_status == "COMPLETED":
            serializer = PaymentSerializer(payment, context={"request": request})
            return Response({
                "success": True,
                "message": "Payment was already completed.",
                "payment": serializer.data,
            }, status=status.HTTP_200_OK)

        import uuid
        tx_id = transaction_id or f"TXN-{uuid.uuid4().hex[:10].upper()}"
        payment.payment_status = "COMPLETED"
        payment.amount = 50.00
        payment.transaction_id = tx_id
        payment.payment_method = payment_method
        payment.payment_date = timezone.now()
        payment.save()

        # Send User Notification
        try:
            create_notification(
                recipient=payment.user,
                title="Payment Successful",
                message=f"Your ₹50 payment for Pickup #{pickup.id} has been successfully completed. Transaction ID: {tx_id}",
                notification_type="PAYMENT_UPDATE",
                related_pickup=pickup,
                action_url="/user",
            )
        except Exception as e:
            print("User payment notification error:", e)

        # Send Admin Notification
        try:
            user_display = payment.user.get_full_name() or payment.user.username
            notify_admins(
                title="Pickup Payment Received",
                message=f"Payment received for Pickup #{pickup.id}.\nUser: {user_display}\nAmount: ₹50\nPayment ID: {payment.payment_id}\nDate: {payment.payment_date.strftime('%d %b %Y')}",
                notification_type="PAYMENT_UPDATE",
                related_pickup=pickup,
                action_url="/admin/payments",
            )
        except Exception as e:
            print("Admin payment notification error:", e)

        serializer = PaymentSerializer(payment, context={"request": request})
        return Response({
            "success": True,
            "message": "Payment verified and recorded successfully.",
            "payment": serializer.data,
        }, status=status.HTTP_200_OK)


class AdminPaymentListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        date_str = request.query_params.get("date")
        status_filter = request.query_params.get("status")

        # Sync any completed pickups that don't yet have a Payment record
        completed_pickups = WastePickupRequest.objects.filter(status="COMPLETED")
        for p in completed_pickups:
            Payment.objects.get_or_create(
                pickup_request=p,
                defaults={
                    "user": p.user,
                    "amount": 50.00,
                    "payment_status": "PENDING",
                }
            )

        qs = Payment.objects.select_related(
            "pickup_request",
            "pickup_request__assigned_staff",
            "pickup_request__assigned_staff__user",
            "pickup_request__collection",
            "user",
            "user__userprofile",
            "user__userprofile__ward",
        ).all().order_by("-created_at", "-id")

        if date_str:
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                qs = qs.filter(
                    models.Q(payment_date__date=target_date) |
                    models.Q(pickup_request__date=target_date) |
                    models.Q(created_at__date=target_date)
                )
            except ValueError:
                pass

        total_payments_count = qs.count()
        completed_count = qs.filter(payment_status="COMPLETED").count()
        pending_count = qs.filter(payment_status="PENDING").count()
        total_amount_collected = completed_count * 50.0
        pending_amount = pending_count * 50.0

        if status_filter and status_filter.upper() in ["PENDING", "COMPLETED"]:
            qs = qs.filter(payment_status=status_filter.upper())

        serializer = PaymentSerializer(qs, many=True, context={"request": request})

        return Response({
            "success": True,
            "date": date_str,
            "status_filter": status_filter,
            "totals": {
                "total_payments": total_payments_count,
                "completed_payments": completed_count,
                "pending_payments": pending_count,
                "total_amount_collected": total_amount_collected,
                "pending_amount": pending_amount,
            },
            "payments": serializer.data,
        }, status=status.HTTP_200_OK)


class AdminRequestPaymentReminderView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk=None):
        payment_id = pk or request.data.get("payment_id") or request.data.get("pickup_id")
        if not payment_id:
            return Response({"success": False, "error": "Payment or Pickup ID required."}, status=status.HTTP_400_BAD_REQUEST)

        payment = None
        if pk or request.data.get("payment_id"):
            payment = Payment.objects.filter(models.Q(id=payment_id) | models.Q(payment_id=str(payment_id))).first()
        if not payment and request.data.get("pickup_id"):
            payment = Payment.objects.filter(pickup_request_id=request.data.get("pickup_id")).first()

        if not payment:
            return Response({"success": False, "error": "Payment record not found."}, status=status.HTTP_404_NOT_FOUND)

        if payment.payment_status == "COMPLETED":
            return Response({"success": False, "error": "Payment is already completed. No reminder needed."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            create_notification(
                recipient=payment.user,
                title="Payment Reminder",
                message=f"Your payment of ₹50 for Pickup #{payment.pickup_request.id} is still pending. Please complete the payment.",
                notification_type="PAYMENT_UPDATE",
                related_pickup=payment.pickup_request,
                action_url=f"/payment/{payment.pickup_request.id}",
            )
        except Exception as notif_err:
            print("Payment reminder notification error:", notif_err)

        return Response({
            "success": True,
            "message": f"Payment reminder notification successfully sent to {payment.user.username}.",
        }, status=status.HTTP_200_OK)


class UserPaymentsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        if not (user and user.is_authenticated):
            user_id = request.query_params.get("user_id")
            if user_id:
                qs = Payment.objects.filter(user_id=user_id)
            else:
                qs = Payment.objects.all()
        else:
            qs = Payment.objects.filter(user=user)

        qs = qs.select_related(
            "pickup_request",
            "pickup_request__assigned_staff",
            "pickup_request__collection",
            "user",
            "user__userprofile",
            "user__userprofile__ward",
        ).order_by("-created_at")

        serializer = PaymentSerializer(qs, many=True, context={"request": request})
        return Response({
            "success": True,
            "count": qs.count(),
            "payments": serializer.data,
        }, status=status.HTTP_200_OK)


# ============================================================
# ADMIN RECYCLED WASTE HISTORY VIEWS
# ============================================================

class AdminRecyclingHistoryMonthsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = MCFRecyclerAssignment.objects.filter(status="COMPLETED")
        
        months_dict = {}
        for item in qs:
            d = item.completed_at.date() if item.completed_at else item.date
            if not d:
                continue
            key = (d.year, d.month)
            if key not in months_dict:
                months_dict[key] = {
                    "year": d.year,
                    "month": d.month,
                    "month_name": d.strftime("%B"),
                    "label": d.strftime("%B %Y"),
                    "total_records": 0,
                    "total_kg": 0.0,
                }
            months_dict[key]["total_records"] += 1
            qty = float(item.recyclable_quantity if item.recyclable_quantity is not None else item.total_quantity or 0)
            months_dict[key]["total_kg"] += qty

        sorted_months = sorted(months_dict.values(), key=lambda x: (x["year"], x["month"]), reverse=True)

        return Response({
            "success": True,
            "count": len(sorted_months),
            "months": sorted_months,
        }, status=status.HTTP_200_OK)


class AdminRecyclingHistoryCategoriesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        year_str = request.query_params.get("year")
        month_str = request.query_params.get("month")

        if not year_str or not month_str:
            return Response(
                {"success": False, "error": "Year and month query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            year = int(year_str)
            month = int(month_str)
        except ValueError:
            return Response(
                {"success": False, "error": "Invalid year or month value."},
                status=status.HTTP_400_BAD_REQUEST
            )

        all_completed = MCFRecyclerAssignment.objects.filter(status="COMPLETED")
        matched_items = [
            item for item in all_completed
            if (item.completed_at.date() if item.completed_at else item.date).year == year
            and (item.completed_at.date() if item.completed_at else item.date).month == month
        ]

        from datetime import date
        month_date = date(year, month, 1)
        month_label = month_date.strftime("%B %Y")

        ai_categories = ["Paper", "Plastic", "Glass", "Metal", "Organic", "Electronics", "Miscellaneous"]
        category_map = {cat: {"name": cat, "count": 0, "total_kg": 0.0} for cat in ai_categories}

        for item in matched_items:
            cat_name = item.waste_type.capitalize() if item.waste_type else "Miscellaneous"
            matched_cat = next((c for c in ai_categories if c.lower() == cat_name.lower()), "Miscellaneous")
            
            category_map[matched_cat]["count"] += 1
            qty = float(item.recyclable_quantity if item.recyclable_quantity is not None else item.total_quantity or 0)
            category_map[matched_cat]["total_kg"] += qty

        categories_list = [category_map[cat] for cat in ai_categories]

        return Response({
            "success": True,
            "year": year,
            "month": month,
            "month_label": month_label,
            "total_records": len(matched_items),
            "categories": categories_list,
        }, status=status.HTTP_200_OK)


class AdminRecyclingHistoryRecordsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        year_str = request.query_params.get("year")
        month_str = request.query_params.get("month")
        category = request.query_params.get("category", "").strip()

        if not year_str or not month_str:
            return Response(
                {"success": False, "error": "Year and month query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            year = int(year_str)
            month = int(month_str)
        except ValueError:
            return Response(
                {"success": False, "error": "Invalid year or month value."},
                status=status.HTTP_400_BAD_REQUEST
            )

        all_completed = MCFRecyclerAssignment.objects.filter(status="COMPLETED").select_related("recycler", "recycler__user", "assigned_by")
        matched_items = [
            item for item in all_completed
            if (item.completed_at.date() if item.completed_at else item.date).year == year
            and (item.completed_at.date() if item.completed_at else item.date).month == month
            and (not category or item.waste_type.lower() == category.lower())
        ]

        serializer = MCFRecyclerAssignmentSerializer(matched_items, many=True, context={"request": request})

        return Response({
            "success": True,
            "year": year,
            "month": month,
            "category": category,
            "count": len(matched_items),
            "records": serializer.data,
        }, status=status.HTTP_200_OK)


# ============================================================
# REWARD SUBMISSION VIEWS
# ============================================================

class RewardSubmissionCreateView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user
        photo = request.FILES.get("photo")
        date_str = request.data.get("date")
        bin_location = request.data.get("bin_location")
        waste_type = request.data.get("waste_type")
        estimated_quantity = request.data.get("estimated_quantity")

        # 1. Validate Date
        if not date_str or not str(date_str).strip():
            return Response(
                {
                    "success": False,
                    "error": "Please select the date.",
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            from datetime import datetime
            parsed_date = datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {
                    "success": False,
                    "error": "Invalid date format. Expected YYYY-MM-DD.",
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Validate Photo
        if not photo:
            return Response(
                {
                    "success": False,
                    "error": "Please upload a photo before submitting.",
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file extension and MIME type
        valid_mime_prefixes = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
        valid_extensions = [".jpg", ".jpeg", ".png", ".webp"]
        file_ext = os.path.splitext(photo.name)[1].lower()

        if file_ext not in valid_extensions and (photo.content_type and photo.content_type.lower() not in valid_mime_prefixes):
            return Response(
                {
                    "success": False,
                    "error": "Please upload a valid image file (JPG, JPEG, PNG).",
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Validate Bin Location
        if not bin_location or not str(bin_location).strip():
            return Response(
                {
                    "success": False,
                    "error": "Please select or specify the bin location.",
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        cleaned_bin_location = str(bin_location).strip()

        # 4. Validate Waste Type
        valid_waste_types = ["Paper", "Plastic", "Glass", "Metal", "Organic", "Electronics", "Miscellaneous"]
        if not waste_type or not str(waste_type).strip():
            return Response(
                {
                    "success": False,
                    "error": "Please select the waste type.",
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        matched_waste_type = next((wt for wt in valid_waste_types if wt.lower() == str(waste_type).strip().lower()), None)
        if not matched_waste_type:
            return Response(
                {
                    "success": False,
                    "error": f"Invalid waste type. Must be one of: {', '.join(valid_waste_types)}.",
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 5. Validate Estimated Quantity
        if estimated_quantity is None or str(estimated_quantity).strip() == "":
            return Response(
                {
                    "success": False,
                    "error": "Please enter the estimated waste quantity.",
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            from decimal import Decimal
            qty_val = Decimal(str(estimated_quantity).strip())
            if qty_val <= 0:
                return Response(
                    {
                        "success": False,
                        "error": "Estimated quantity must be greater than 0 kg.",
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception:
            return Response(
                {
                    "success": False,
                    "error": "Please enter a valid numeric quantity.",
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        submission = RewardSubmission.objects.create(
            user=user,
            photo=photo,
            date=parsed_date,
            bin_location=cleaned_bin_location,
            waste_type=matched_waste_type,
            estimated_quantity=qty_val,
            status="Pending",
        )

        serializer = RewardSubmissionSerializer(submission, context={"request": request})

        return Response(
            {
                "success": True,
                "message": "Reward submission sent successfully.",
                "submission": serializer.data,
            },
            status=status.HTTP_201_CREATED
        )


class AdminRewardSubmissionListView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "userprofile", None)
        is_admin = request.user.is_staff or request.user.is_superuser or (profile and profile.role == "ADMIN")
        if not is_admin:
            return Response(
                {"success": False, "error": "Unauthorized. Admin privileges required."},
                status=status.HTTP_403_FORBIDDEN
            )

        submissions = (
            RewardSubmission.objects
            .select_related("user", "user__userprofile", "reward_assigned_by", "reward_assigned_by__userprofile")
            .order_by("-created_at")
        )

        serializer = RewardSubmissionSerializer(submissions, many=True, context={"request": request})

        return Response(
            {
                "success": True,
                "count": submissions.count(),
                "submissions": serializer.data,
            },
            status=status.HTTP_200_OK
        )


class AdminAssignRewardView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        return self._assign_reward(request, pk)

    def patch(self, request, pk=None):
        return self._assign_reward(request, pk)

    def _assign_reward(self, request, pk=None):
        profile = getattr(request.user, "userprofile", None)
        is_admin = request.user.is_staff or request.user.is_superuser or (profile and profile.role == "ADMIN")
        if not is_admin:
            return Response(
                {"success": False, "error": "Unauthorized. Only administrators can assign rewards."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            submission = (
                RewardSubmission.objects
                .select_related("user", "user__userprofile", "reward_assigned_by", "reward_assigned_by__userprofile")
                .get(id=pk)
            )
        except RewardSubmission.DoesNotExist:
            return Response(
                {"success": False, "error": "Reward submission not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if submission.points is not None or submission.status in ["Active", "Reward Assigned", "Claimed"]:
            existing_points = submission.points if submission.points is not None else submission.reward_amount
            return Response(
                {
                    "success": False,
                    "error": f"Reward has already been assigned for this submission ({existing_points} points).",
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        raw_points = request.data.get("points")
        if raw_points is None:
            raw_points = request.data.get("reward_amount")

        if raw_points is None or str(raw_points).strip() == "":
            return Response(
                {"success": False, "error": "Reward points are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        points_str = str(raw_points).strip()
        if "." in points_str:
            return Response(
                {"success": False, "error": "Reward points must be an integer, not a decimal value."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            points_val = int(points_str)
        except (ValueError, TypeError):
            return Response(
                {"success": False, "error": "Please enter a valid numeric reward points value."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if points_val <= 0:
            return Response(
                {"success": False, "error": "Reward points must be greater than 0."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if points_val % 5 != 0:
            return Response(
                {"success": False, "error": "Reward points must be a multiple of 5 (1 bottle = 5 points). Examples: 5, 10, 15, 20."},
                status=status.HTTP_400_BAD_REQUEST
            )

        now = timezone.now()
        valid_till = now + timedelta(days=30)

        submission.points = points_val
        submission.reward_amount = points_val
        submission.valid_from = now
        submission.valid_till = valid_till
        submission.reward_assigned_at = now
        submission.reward_assigned_by = request.user
        submission.status = "Active"
        submission.save()

        serializer = RewardSubmissionSerializer(submission, context={"request": request})

        return Response(
            {
                "success": True,
                "message": f"Successfully assigned {points_val} points ({points_val // 5} bottles) valid for 30 days.",
                "submission": serializer.data,
            },
            status=status.HTTP_200_OK
        )


class UserRewardListView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        submissions = (
            RewardSubmission.objects
            .filter(user=user, points__isnull=False, points__gt=0)
            .select_related("user", "user__userprofile", "reward_assigned_by", "reward_assigned_by__userprofile")
            .order_by("-valid_from", "-created_at")
        )

        all_records = list(submissions)
        total_earned_points = sum(s.points for s in all_records if s.points)
        total_bottles = total_earned_points // 5

        active_points = sum(s.points for s in all_records if s.computed_status == "Active" and s.points)
        claimed_points = sum(s.points for s in all_records if s.computed_status == "Claimed" and s.points)
        expired_points = sum(s.points for s in all_records if s.computed_status == "Expired" and s.points)

        serializer = RewardSubmissionSerializer(all_records, many=True, context={"request": request})

        return Response(
            {
                "success": True,
                "total_earned_points": total_earned_points,
                "total_bottles": total_bottles,
                "active_points": active_points,
                "claimed_points": claimed_points,
                "expired_points": expired_points,
                "summary": {
                    "total_earned_points": total_earned_points,
                    "total_bottles": total_bottles,
                    "active_points": active_points,
                    "claimed_points": claimed_points,
                    "expired_points": expired_points,
                    "active_bottles": active_points // 5,
                    "claimed_bottles": claimed_points // 5,
                    "expired_bottles": expired_points // 5,
                },
                "rewards": serializer.data,
            },
            status=status.HTTP_200_OK
        )


class UserClaimRewardView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        user = request.user
        try:
            submission = RewardSubmission.objects.get(id=pk)
        except RewardSubmission.DoesNotExist:
            return Response(
                {"success": False, "error": "Reward not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if submission.user != user:
            return Response(
                {"success": False, "error": "Unauthorized. You cannot claim another user's reward."},
                status=status.HTTP_403_FORBIDDEN
            )

        if not submission.points or submission.points <= 0:
            return Response(
                {"success": False, "error": "No reward points have been assigned to this submission."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if submission.claimed_at is not None or submission.status == "Claimed":
            return Response(
                {"success": False, "error": "This reward has already been claimed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        now = timezone.now()
        if submission.valid_till and now >= submission.valid_till:
            return Response(
                {"success": False, "error": "This reward has expired and can no longer be claimed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission.claimed_at = now
        submission.status = "Claimed"
        submission.save()

        serializer = RewardSubmissionSerializer(submission, context={"request": request})

        return Response(
            {
                "success": True,
                "message": f"Congratulations! You claimed {submission.points} points ({submission.bottle_count} bottles).",
                "reward": serializer.data,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# ADMIN REAL-TIME ANALYTICS VIEW
# ============================================================
import calendar

class AdminAnalyticsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.now()
        curr_year = now.year
        curr_month = now.month

        # Query param for specific historical month report
        req_year = request.query_params.get("year")
        req_month = request.query_params.get("month")

        if req_year and req_month:
            try:
                target_year = int(req_year)
                target_month = int(req_month)
                month_report = self._calculate_month_analytics(target_year, target_month)
                return Response({
                    "success": True,
                    "report": month_report
                }, status=status.HTTP_200_OK)
            except ValueError:
                return Response({
                    "success": False,
                    "error": "Invalid year or month query parameter."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Dynamic previous month calculation
        if curr_month == 1:
            prev_month = 12
            prev_year = curr_year - 1
        else:
            prev_month = curr_month - 1
            prev_year = curr_year

        # Dynamic Days remaining in current month
        total_days_in_curr_month = calendar.monthrange(curr_year, curr_month)[1]
        days_remaining = max(0, total_days_in_curr_month - now.day)

        # Current Month and Previous Month Analytics
        curr_month_data = self._calculate_month_analytics(curr_year, curr_month)
        prev_month_data = self._calculate_month_analytics(prev_year, prev_month)

        # Waste comparison structure (all 7 project AI categories)
        categories = ["Paper", "Plastic", "Glass", "Metal", "Organic", "Electronics", "Miscellaneous"]
        curr_cat_map = {c["category"]: c["collected_kg"] for c in curr_month_data["waste_collection"]["categories"]}
        prev_cat_map = {c["category"]: c["collected_kg"] for c in prev_month_data["waste_collection"]["categories"]}

        comparison = []
        for cat in categories:
            comparison.append({
                "category": cat,
                "prev_month_kg": prev_cat_map.get(cat, 0.0),
                "curr_month_kg": curr_cat_map.get(cat, 0.0),
            })

        # Historical available months
        available_months = self._get_available_historical_months()

        return Response({
            "success": True,
            "timestamp": now.isoformat(),
            "days_remaining": days_remaining,
            "current_month": {
                "year": curr_year,
                "month": curr_month,
                "label": now.strftime("%B %Y"),
                "total_days": total_days_in_curr_month,
                "current_day": now.day,
            },
            "previous_month": {
                "year": prev_year,
                "month": prev_month,
                "label": date(prev_year, prev_month, 1).strftime("%B %Y"),
            },
            "waste_collection": curr_month_data["waste_collection"],
            "waste_comparison": comparison,
            "recycled_waste": curr_month_data["recycled_waste"],
            "task_status": curr_month_data["task_status"],
            "monthly_reports": available_months,
        }, status=status.HTTP_200_OK)

    def _calculate_month_analytics(self, year, month):
        month_date = date(year, month, 1)
        month_label = month_date.strftime("%B %Y")
        categories = ["Paper", "Plastic", "Glass", "Metal", "Organic", "Electronics", "Miscellaneous"]

        # 1. Waste Collection for this month from StaffMCFCollection
        mcf_totals = (
            StaffMCFCollection.objects
            .filter(date__year=year, date__month=month)
            .aggregate(
                total_paper=models.Sum("paper"),
                total_plastic=models.Sum("plastic"),
                total_glass=models.Sum("glass"),
                total_metal=models.Sum("metal"),
                total_organic=models.Sum("organic"),
                total_electronics=models.Sum("electronics"),
                total_miscellaneous=models.Sum("miscellaneous"),
                grand_total=models.Sum("total_quantity"),
            )
        )

        waste_cat_list = [
            {"category": "Paper", "collected_kg": float(mcf_totals["total_paper"] or 0)},
            {"category": "Plastic", "collected_kg": float(mcf_totals["total_plastic"] or 0)},
            {"category": "Glass", "collected_kg": float(mcf_totals["total_glass"] or 0)},
            {"category": "Metal", "collected_kg": float(mcf_totals["total_metal"] or 0)},
            {"category": "Organic", "collected_kg": float(mcf_totals["total_organic"] or 0)},
            {"category": "Electronics", "collected_kg": float(mcf_totals["total_electronics"] or 0)},
            {"category": "Miscellaneous", "collected_kg": float(mcf_totals["total_miscellaneous"] or 0)},
        ]
        total_collected_kg = float(mcf_totals["grand_total"] or 0)

        # 2. Recycled Waste for this month from MCFRecyclerAssignment (COMPLETED)
        completed_recycling = MCFRecyclerAssignment.objects.filter(status="COMPLETED")
        month_recycling_items = [
            item for item in completed_recycling
            if (item.completed_at.date() if item.completed_at else item.date).year == year
            and (item.completed_at.date() if item.completed_at else item.date).month == month
        ]

        recycled_map = {cat: 0.0 for cat in categories}
        total_recycled_kg = 0.0
        for item in month_recycling_items:
            cat_name = item.waste_type.capitalize() if item.waste_type else "Miscellaneous"
            matched_cat = next((c for c in categories if c.lower() == cat_name.lower()), "Miscellaneous")
            qty = float(item.recyclable_quantity if item.recyclable_quantity is not None else item.total_quantity or 0)
            recycled_map[matched_cat] += qty
            total_recycled_kg += qty

        recycled_cat_list = [
            {"category": cat, "recycled_kg": round(recycled_map[cat], 2)}
            for cat in categories
        ]

        # 3. Collection Task Status for this specific month from WastePickupRequest
        completed_pickups = (
            WastePickupRequest.objects.filter(
                status="COMPLETED",
                created_at__year=year,
                created_at__month=month
            ).count()
        )
        pending_pickups = (
            WastePickupRequest.objects.filter(
                status__in=["PENDING", "ASSIGNED"],
                created_at__year=year,
                created_at__month=month
            ).count()
        )
        total_pickups = completed_pickups + pending_pickups

        return {
            "year": year,
            "month": month,
            "month_label": month_label,
            "waste_collection": {
                "unit": "kg",
                "total_kg": round(total_collected_kg, 2),
                "categories": waste_cat_list,
            },
            "recycled_waste": {
                "unit": "kg",
                "total_recycled_kg": round(total_recycled_kg, 2),
                "categories": recycled_cat_list,
                "completed_assignments_count": len(month_recycling_items),
            },
            "task_status": {
                "completed": completed_pickups,
                "pending": pending_pickups,
                "total": total_pickups,
            },
        }

    def _get_available_historical_months(self):
        mcf_dates = StaffMCFCollection.objects.values_list("date", flat=True)
        recycling_dates = MCFRecyclerAssignment.objects.filter(status="COMPLETED").values_list("completed_at", "date")
        pickup_dates = WastePickupRequest.objects.values_list("created_at", flat=True)

        distinct_months = set()
        for d in mcf_dates:
            if d:
                distinct_months.add((d.year, d.month))

        for comp_at, d in recycling_dates:
            dt = comp_at.date() if comp_at else d
            if dt:
                distinct_months.add((dt.year, dt.month))

        for pt in pickup_dates:
            if pt:
                distinct_months.add((pt.year, pt.month))

        sorted_keys = sorted(distinct_months, key=lambda x: (x[0], x[1]), reverse=True)

        results = []
        for y, m in sorted_keys:
            data = self._calculate_month_analytics(y, m)
            has_data = (
                data["waste_collection"]["total_kg"] > 0 or
                data["recycled_waste"]["total_recycled_kg"] > 0 or
                data["task_status"]["total"] > 0
            )
            if has_data:
                results.append({
                    "year": y,
                    "month": m,
                    "label": data["month_label"],
                    "total_waste_collected_kg": data["waste_collection"]["total_kg"],
                    "total_recycled_kg": data["recycled_waste"]["total_recycled_kg"],
                    "completed_tasks": data["task_status"]["completed"],
                    "pending_tasks": data["task_status"]["pending"],
                })
        return results


# ============================================================
# STAFF REAL-TIME ANALYTICS VIEW
# ============================================================
class StaffAnalyticsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        staff = Staff.objects.filter(user=user).first()
        if not staff:
            return Response(
                {"success": False, "error": "No Staff profile associated with the current user."},
                status=status.HTTP_403_FORBIDDEN
            )

        now = timezone.now()
        curr_year = now.year
        curr_month = now.month

        # Query param for specific historical month report
        req_year = request.query_params.get("year")
        req_month = request.query_params.get("month")

        if req_year and req_month:
            try:
                target_year = int(req_year)
                target_month = int(req_month)
                month_report = self._calculate_month_analytics(staff, target_year, target_month)
                return Response({
                    "success": True,
                    "report": month_report
                }, status=status.HTTP_200_OK)
            except ValueError:
                return Response({
                    "success": False,
                    "error": "Invalid year or month query parameter."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Dynamic previous month calculation
        if curr_month == 1:
            prev_month = 12
            prev_year = curr_year - 1
        else:
            prev_month = curr_month - 1
            prev_year = curr_year

        total_days_in_curr_month = calendar.monthrange(curr_year, curr_month)[1]
        days_remaining = max(0, total_days_in_curr_month - now.day)

        curr_month_data = self._calculate_month_analytics(staff, curr_year, curr_month)
        prev_month_data = self._calculate_month_analytics(staff, prev_year, prev_month)

        prev_label = date(prev_year, prev_month, 1).strftime("%B %Y")
        curr_label = now.strftime("%B %Y")

        comparison = [
            {
                "status": "Completed",
                "prev_month": prev_month_data["task_analytics"]["completed"],
                "curr_month": curr_month_data["task_analytics"]["completed"],
            },
            {
                "status": "Pending",
                "prev_month": prev_month_data["task_analytics"]["pending"],
                "curr_month": curr_month_data["task_analytics"]["pending"],
            },
            {
                "status": "Rescheduled",
                "prev_month": prev_month_data["task_analytics"]["rescheduled"],
                "curr_month": curr_month_data["task_analytics"]["rescheduled"],
            },
        ]

        available_months = self._get_available_historical_months(staff)

        return Response({
            "success": True,
            "timestamp": now.isoformat(),
            "staff_id": staff.staff_id,
            "staff_name": staff.user.get_full_name() or staff.user.username,
            "days_remaining": days_remaining,
            "current_month": {
                "year": curr_year,
                "month": curr_month,
                "label": curr_label,
                "total_days": total_days_in_curr_month,
                "current_day": now.day,
            },
            "previous_month": {
                "year": prev_year,
                "month": prev_month,
                "label": prev_label,
            },
            "task_analytics": curr_month_data["task_analytics"],
            "task_comparison": comparison,
            "waste_collection": curr_month_data["waste_collection"],
            "monthly_reports": available_months,
        }, status=status.HTTP_200_OK)

    def _calculate_month_analytics(self, staff, year, month):
        month_date = date(year, month, 1)
        month_label = month_date.strftime("%B %Y")

        # Completed tasks: assigned_staff=staff, status='COMPLETED'
        completed_count = (
            WastePickupRequest.objects.filter(
                assigned_staff=staff,
                status="COMPLETED"
            ).filter(
                models.Q(collection__completed_at__year=year, collection__completed_at__month=month) |
                models.Q(updated_at__year=year, updated_at__month=month)
            ).distinct().count()
        )

        # Pending tasks: assigned_staff=staff, status='ASSIGNED'
        pending_count = (
            WastePickupRequest.objects.filter(
                assigned_staff=staff,
                status="ASSIGNED",
                created_at__year=year,
                created_at__month=month
            ).count()
        )

        # Rescheduled tasks: assigned_staff=staff, status='PENDING', staff_marked_pending=True
        rescheduled_count = (
            WastePickupRequest.objects.filter(
                assigned_staff=staff,
                status="PENDING",
                staff_marked_pending=True,
                updated_at__year=year,
                updated_at__month=month
            ).count()
        )

        total_tasks = completed_count + pending_count + rescheduled_count

        # Waste Collection for this month from StaffMCFCollection for this staff
        mcf_totals = (
            StaffMCFCollection.objects
            .filter(staff=staff, date__year=year, date__month=month)
            .aggregate(
                total_paper=models.Sum("paper"),
                total_plastic=models.Sum("plastic"),
                total_glass=models.Sum("glass"),
                total_metal=models.Sum("metal"),
                total_organic=models.Sum("organic"),
                total_electronics=models.Sum("electronics"),
                total_miscellaneous=models.Sum("miscellaneous"),
                grand_total=models.Sum("total_quantity"),
            )
        )

        waste_cat_list = [
            {"category": "Paper", "collected_kg": float(mcf_totals["total_paper"] or 0)},
            {"category": "Plastic", "collected_kg": float(mcf_totals["total_plastic"] or 0)},
            {"category": "Glass", "collected_kg": float(mcf_totals["total_glass"] or 0)},
            {"category": "Metal", "collected_kg": float(mcf_totals["total_metal"] or 0)},
            {"category": "Organic", "collected_kg": float(mcf_totals["total_organic"] or 0)},
            {"category": "Electronics", "collected_kg": float(mcf_totals["total_electronics"] or 0)},
            {"category": "Miscellaneous", "collected_kg": float(mcf_totals["total_miscellaneous"] or 0)},
        ]
        total_collected_kg = float(mcf_totals["grand_total"] or 0)

        return {
            "year": year,
            "month": month,
            "month_label": month_label,
            "task_analytics": {
                "completed": completed_count,
                "pending": pending_count,
                "rescheduled": rescheduled_count,
                "total": total_tasks,
            },
            "waste_collection": {
                "unit": "kg",
                "total_kg": round(total_collected_kg, 2),
                "categories": waste_cat_list,
            },
        }

    def _get_available_historical_months(self, staff):
        mcf_dates = StaffMCFCollection.objects.filter(staff=staff).values_list("date", flat=True)
        pickup_dates = WastePickupRequest.objects.filter(assigned_staff=staff).values_list("created_at", "updated_at")

        distinct_months = set()
        for d in mcf_dates:
            if d:
                distinct_months.add((d.year, d.month))

        for cr, up in pickup_dates:
            if cr:
                distinct_months.add((cr.year, cr.month))
            if up:
                distinct_months.add((up.year, up.month))

        sorted_keys = sorted(distinct_months, key=lambda x: (x[0], x[1]), reverse=True)

        results = []
        for y, m in sorted_keys:
            data = self._calculate_month_analytics(staff, y, m)
            has_data = (
                data["waste_collection"]["total_kg"] > 0 or
                data["task_analytics"]["total"] > 0
            )
            if has_data:
                results.append({
                    "year": y,
                    "month": m,
                    "label": data["month_label"],
                    "total_waste_collected_kg": data["waste_collection"]["total_kg"],
                    "total_recycled_kg": 0.0,
                    "completed_tasks": data["task_analytics"]["completed"],
                    "pending_tasks": data["task_analytics"]["pending"],
                    "rescheduled_tasks": data["task_analytics"]["rescheduled"],
                })
        return results


# ============================================================
# RECYCLER REAL-TIME ANALYTICS VIEW
# ============================================================
class RecyclerAnalyticsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recycler = get_recycler_for_user(request.user)
        if not recycler:
            return Response(
                {"success": False, "error": "Current authenticated user is not registered as a Recycler."},
                status=status.HTTP_403_FORBIDDEN
            )

        now = timezone.now()
        curr_year = now.year
        curr_month = now.month

        # Query param for specific historical month report
        req_year = request.query_params.get("year")
        req_month = request.query_params.get("month")

        if req_year and req_month:
            try:
                target_year = int(req_year)
                target_month = int(req_month)
                month_report = self._calculate_month_analytics(recycler, target_year, target_month)
                return Response({
                    "success": True,
                    "report": month_report
                }, status=status.HTTP_200_OK)
            except ValueError:
                return Response({
                    "success": False,
                    "error": "Invalid year or month query parameter."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Dynamic previous month calculation
        if curr_month == 1:
            prev_month = 12
            prev_year = curr_year - 1
        else:
            prev_month = curr_month - 1
            prev_year = curr_year

        total_days_in_curr_month = calendar.monthrange(curr_year, curr_month)[1]
        days_remaining = max(0, total_days_in_curr_month - now.day)

        curr_month_data = self._calculate_month_analytics(recycler, curr_year, curr_month)
        prev_month_data = self._calculate_month_analytics(recycler, prev_year, prev_month)

        prev_label = date(prev_year, prev_month, 1).strftime("%B %Y")
        curr_label = now.strftime("%B %Y")

        comparison = [
            {
                "metric": "Waste Received",
                "prev_month": prev_month_data["waste_assigned"]["total_assigned_kg"],
                "curr_month": curr_month_data["waste_assigned"]["total_assigned_kg"],
            },
            {
                "metric": "Waste Recycled",
                "prev_month": prev_month_data["recycled_waste"]["total_recycled_kg"],
                "curr_month": curr_month_data["recycled_waste"]["total_recycled_kg"],
            },
        ]

        available_months = self._get_available_historical_months(recycler)

        return Response({
            "success": True,
            "timestamp": now.isoformat(),
            "recycler_id": recycler.recycler_id,
            "organization": recycler.organization,
            "days_remaining": days_remaining,
            "current_month": {
                "year": curr_year,
                "month": curr_month,
                "label": curr_label,
                "total_days": total_days_in_curr_month,
                "current_day": now.day,
            },
            "previous_month": {
                "year": prev_year,
                "month": prev_month,
                "label": prev_label,
            },
            "waste_assigned": curr_month_data["waste_assigned"],
            "recycled_waste": curr_month_data["recycled_waste"],
            "recycler_comparison": comparison,
            "task_status": curr_month_data["task_status"],
            "monthly_reports": available_months,
        }, status=status.HTTP_200_OK)

    def _calculate_month_analytics(self, recycler, year, month):
        month_date = date(year, month, 1)
        month_label = month_date.strftime("%B %Y")
        categories = ["Paper", "Plastic", "Glass", "Metal", "Organic", "Electronics", "Miscellaneous"]

        # Waste Came for Recycling (Assigned to this recycler in date__year, date__month)
        assigned_qs = MCFRecyclerAssignment.objects.filter(
            recycler=recycler,
            date__year=year,
            date__month=month
        )

        assigned_map = {cat: 0.0 for cat in categories}
        total_assigned_kg = 0.0
        for item in assigned_qs:
            cat_name = item.waste_type.capitalize() if item.waste_type else "Miscellaneous"
            matched_cat = next((c for c in categories if c.lower() == cat_name.lower()), "Miscellaneous")
            qty = float(item.total_quantity or 0)
            assigned_map[matched_cat] += qty
            total_assigned_kg += qty

        assigned_cat_list = [
            {"category": cat, "assigned_kg": round(assigned_map[cat], 2)}
            for cat in categories
        ]

        # Recycled Waste (Completed by this recycler in completed_at or date)
        completed_qs = MCFRecyclerAssignment.objects.filter(
            recycler=recycler,
            status="COMPLETED"
        ).filter(
            models.Q(completed_at__year=year, completed_at__month=month) |
            models.Q(completed_at__isnull=True, date__year=year, date__month=month)
        )

        recycled_map = {cat: 0.0 for cat in categories}
        total_recycled_kg = 0.0
        for item in completed_qs:
            cat_name = item.waste_type.capitalize() if item.waste_type else "Miscellaneous"
            matched_cat = next((c for c in categories if c.lower() == cat_name.lower()), "Miscellaneous")
            qty = float(item.recyclable_quantity if item.recyclable_quantity is not None else item.total_quantity or 0)
            recycled_map[matched_cat] += qty
            total_recycled_kg += qty

        recycled_cat_list = [
            {"category": cat, "recycled_kg": round(recycled_map[cat], 2)}
            for cat in categories
        ]

        completed_tasks_count = completed_qs.count()
        pending_tasks_count = assigned_qs.filter(status="PENDING").count()

        return {
            "year": year,
            "month": month,
            "month_label": month_label,
            "waste_assigned": {
                "unit": "kg",
                "total_assigned_kg": round(total_assigned_kg, 2),
                "categories": assigned_cat_list,
            },
            "recycled_waste": {
                "unit": "kg",
                "total_recycled_kg": round(total_recycled_kg, 2),
                "categories": recycled_cat_list,
                "completed_count": completed_tasks_count,
            },
            "task_status": {
                "completed": completed_tasks_count,
                "pending": pending_tasks_count,
                "total": completed_tasks_count + pending_tasks_count,
            },
        }

    def _get_available_historical_months(self, recycler):
        assigned_dates = MCFRecyclerAssignment.objects.filter(recycler=recycler).values_list("date", "completed_at")

        distinct_months = set()
        for d, comp_at in assigned_dates:
            if d:
                distinct_months.add((d.year, d.month))
            if comp_at:
                distinct_months.add((comp_at.year, comp_at.month))

        sorted_keys = sorted(distinct_months, key=lambda x: (x[0], x[1]), reverse=True)

        results = []
        for y, m in sorted_keys:
            data = self._calculate_month_analytics(recycler, y, m)
            has_data = (
                data["waste_assigned"]["total_assigned_kg"] > 0 or
                data["recycled_waste"]["total_recycled_kg"] > 0 or
                data["task_status"]["total"] > 0
            )
            if has_data:
                results.append({
                    "year": y,
                    "month": m,
                    "label": data["month_label"],
                    "waste_received_kg": data["waste_assigned"]["total_assigned_kg"],
                    "total_recycled_kg": data["recycled_waste"]["total_recycled_kg"],
                    "completed_tasks": data["task_status"]["completed"],
                    "pending_tasks": data["task_status"]["pending"],
                })
        return results


