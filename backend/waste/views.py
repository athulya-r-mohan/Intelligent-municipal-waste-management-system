import json
import os
import tempfile

from django.db import models
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

from datetime import datetime, date

from .serializers import (
    WastePickupRequestSerializer,
    WasteComplaintSerializer,
    StaffMCFCollectionSerializer,
    MCFRecyclerAssignmentSerializer,
    RecyclerOptionSerializer,
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
            "RUNNING YOLO..."
        )


        results = model.predict(
            source=temp_file.name,
            conf=0.50,
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
            # BEST DETECTION
            # =================================================

            if image_detections:

                def get_confidence(
                    detection
                ):

                    try:

                        return float(
                            detection.get(
                                "confidence",
                                0
                            )
                        )

                    except (
                        ValueError,
                        TypeError
                    ):

                        return 0.0


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
            # SAVE IMAGE RECORD
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
                    profile.ward.ward_name
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
                        f"Ward '{staff_ward.ward_name}', but pickup request #{pickup_request.id} "
                        f"is in Ward '{pickup_ward.ward_name}'."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update manual waste type if provided (e.g. when AI detection failed)
        manual_waste_type = data.get("waste_type")
        if manual_waste_type and str(manual_waste_type).strip():
            clean_waste_type = str(manual_waste_type).strip()
            pickup_request.waste_images.all().update(waste_type=clean_waste_type)

        # Save assignment and update status
        pickup_request.assigned_staff = staff
        pickup_request.status = "ASSIGNED"
        pickup_request.save(update_fields=["assigned_staff", "status", "updated_at"])

        staff_name = staff_user_profile.name if staff_user_profile and staff_user_profile.name else staff.user.username
        
        # Trigger Notifications
        try:
            create_notification(
                recipient=staff.user,
                title="New Pickup Task Assigned",
                message=f"You have been assigned pickup request #{pickup_request.id} at {pickup_request.location_name}.",
                notification_type="TASK_ASSIGNED",
                related_pickup=pickup_request,
                action_url="/stafftask",
            )
            create_notification(
                recipient=pickup_request.user,
                title="Staff Assigned to Your Pickup",
                message=f"Field staff {staff_name} has been assigned to your waste pickup request #{pickup_request.id}.",
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
                "message": f"Pickup request #{pickup_request.id} successfully assigned to {staff_name}.",
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

        staff = Staff.objects.filter(user=user).first()
        if not staff:
            return Response(
                {"success": False, "error": "No Staff profile associated with the current user."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Return ONLY requests assigned to this specific staff member
        tasks = (
            WastePickupRequest.objects
            .filter(assigned_staff=staff)
            .select_related(
                "user",
                "user__userprofile",
                "user__userprofile__ward",
                "assigned_staff",
                "assigned_staff__user",
                "assigned_staff__user__userprofile",
                "collection",
            )
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
                "tasks": serializer.data
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

        # 2. Task lookup
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
                .get(id=pk)
            )
        except WastePickupRequest.DoesNotExist:
            return Response(
                {"success": False, "error": f"Task #{pk} not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 3. Ownership / assignment verification
        if task.assigned_staff_id != staff.staff_id:
            return Response(
                {
                    "success": False,
                    "error": "You are not authorized to update this task because it is assigned to another staff member."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # 4. Status extraction & normalization
        status_input = request.data.get("status") or request.POST.get("status") or ""
        new_status = str(status_input).strip().upper()

        if new_status not in ["PENDING", "COMPLETED"]:
            return Response(
                {"success": False, "error": "Invalid status. Must be 'PENDING' or 'COMPLETED'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ====================================================
        # CASE 1: PENDING (Explicitly marked by assigned staff)
        # ====================================================
        if new_status == "PENDING":
            task.status = "PENDING"
            task.staff_marked_pending = True
            task.save(update_fields=["status", "staff_marked_pending", "updated_at"])

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
        assigned_count = WastePickupRequest.objects.filter(status="ASSIGNED").count()
        total_requests = WastePickupRequest.objects.count()

        return Response(
            {
                "success": True,
                "stats": {
                    "pending_count": pending_count,
                    "completed_count": completed_count,
                    "assigned_count": assigned_count,
                    "total_requests": total_requests,
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
        if status_param != "ALL":
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
            ward_name = profile.ward.ward_name if profile and profile.ward else "General Ward"
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



