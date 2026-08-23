import json
import os
import tempfile

from django.http import JsonResponse

from rest_framework.decorators import (
    api_view,
    permission_classes,
)

from rest_framework.permissions import IsAuthenticated,AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import BasicAuthentication, SessionAuthentication

from .serializers import WastePickupRequestSerializer

from ultralytics import YOLO
from accounts.models import UserProfile,Staff


from .models import (
    WastePickupRequest,
    WastePickupImage,
)


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

        print("==========================================")


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
            )
            .order_by("-id")
        )

        serializer = WastePickupRequestSerializer(
            requests,
            many=True
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

        # Lookup staff by staff_id or user_id
        staff = None
        try:
            staff = Staff.objects.select_related(
                "user", "user__userprofile", "user__userprofile__ward"
            ).get(staff_id=staff_id)
        except (Staff.DoesNotExist, ValueError):
            try:
                staff = Staff.objects.select_related(
                    "user", "user__userprofile", "user__userprofile__ward"
                ).get(user_id=staff_id)
            except (Staff.DoesNotExist, ValueError):
                pass

        if not staff:
            return Response(
                {"success": False, "error": f"Staff member with ID {staff_id} not found."},
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

        # Save assignment and update status
        pickup_request.assigned_staff = staff
        pickup_request.status = "ASSIGNED"
        pickup_request.save(update_fields=["assigned_staff", "status", "updated_at"])

        staff_name = staff_user_profile.name if staff_user_profile and staff_user_profile.name else staff.user.username
        serializer = WastePickupRequestSerializer(pickup_request)

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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        try:
            staff = Staff.objects.get(user=user)
        except Staff.DoesNotExist:
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
            )
            .order_by("-id")
        )

        serializer = WastePickupRequestSerializer(tasks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)