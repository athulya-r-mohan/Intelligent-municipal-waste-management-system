from rest_framework import serializers
from .models import WastePickupRequest, WastePickupImage
from accounts.models import UserProfile


# ============================================================
# WASTE IMAGE SERIALIZER
# ============================================================

class WastePickupImageSerializer(serializers.ModelSerializer):

    image_name = serializers.SerializerMethodField()

    class Meta:

        model = WastePickupImage

        fields = [
            "id",
            "image",
            "image_name",
            "waste_type",
            "confidence",
        ]

    # ========================================================
    # IMAGE NAME
    # ========================================================

    def get_image_name(self, obj):

        try:

            if obj.image:
                return obj.image.name.split("/")[-1]

        except Exception:

            pass

        return ""


# ============================================================
# PICKUP REQUEST SERIALIZER
# ============================================================

class WastePickupRequestSerializer(serializers.ModelSerializer):

    # ========================================================
    # REQUEST ID
    # ========================================================

    request_id = serializers.IntegerField(
        source="id",
        read_only=True
    )

    # ========================================================
    # USER ID
    # ========================================================

    user_id = serializers.IntegerField(
        source="user.id",
        read_only=True
    )

    # ========================================================
    # USER NAME
    # ========================================================

    user_name = serializers.CharField(
        source="user.userprofile.name",
        read_only=True
    )

    # ========================================================
    # EMAIL
    # ========================================================

    email = serializers.EmailField(
        source="user.email",
        read_only=True
    )

    # ========================================================
    # PHONE
    # ========================================================

    phone = serializers.CharField(
        source="user.userprofile.phone",
        read_only=True,
        allow_null=True
    )

    # ========================================================
    # WARD
    # ========================================================

    ward = serializers.SerializerMethodField()

    # ========================================================
    # WARD ID
    # ========================================================

    ward_id = serializers.SerializerMethodField()

    # ========================================================
    # PICKUP LOCATION
    # ========================================================

    pickup_location = serializers.CharField(
        source="location_name",
        read_only=True
    )

    # ========================================================
    # WASTE TYPE
    # ========================================================

    waste_type = serializers.SerializerMethodField()

    # ========================================================
    # IMAGES
    # ========================================================

    images = WastePickupImageSerializer(
        source="waste_images",
        many=True,
        read_only=True
    )

    # ========================================================
    # STATUS
    # ========================================================

    status = serializers.CharField(
        read_only=True
    )

    # ========================================================
    # DATE
    # ========================================================

    date = serializers.DateTimeField(
        source="created_at",
        format="%Y-%m-%d",
        read_only=True
    )

    # ========================================================
    # ASSIGNED STAFF
    # ========================================================

    assigned_staff = serializers.SerializerMethodField()
    assigned_staff_id = serializers.SerializerMethodField()

    # ========================================================
    # META
    # ========================================================

    class Meta:

        model = WastePickupRequest

        fields = [
            "request_id",

            "user_id",
            "user_name",
            "phone",
            "email",

            "ward",
            "ward_id",

            "pickup_location",

            "waste_type",
            "images",

            "status",
            "date",

            "assigned_staff",
            "assigned_staff_id",
        ]

    # ========================================================
    # GET WARD
    # ========================================================

    def get_ward(self, obj):

        try:

            profile = obj.user.userprofile

            if profile.ward:

                return profile.ward.ward_name

        except (
            UserProfile.DoesNotExist,
            AttributeError
        ):

            pass

        return ""

    # ========================================================
    # GET WARD ID
    # ========================================================

    def get_ward_id(self, obj):

        try:

            profile = obj.user.userprofile

            if profile.ward:

                return profile.ward.ward_id

        except (
            UserProfile.DoesNotExist,
            AttributeError
        ):

            pass

        return None

    # ========================================================
    # GET WASTE TYPE
    # ========================================================

    def get_waste_type(self, obj):

        try:

            image = (
                WastePickupImage.objects
                .filter(
                    pickup_request=obj
                )
                .order_by("id")
                .first()
            )

            if image:

                return image.waste_type or "Unknown"

        except Exception:

            pass

        return "Unknown"

    # ========================================================
    # GET ASSIGNED STAFF
    # ========================================================

    def get_assigned_staff(self, obj):

        try:

            if (
                hasattr(
                    obj,
                    "assigned_staff"
                )
                and obj.assigned_staff
            ):

                staff = obj.assigned_staff
                if hasattr(staff, "user"):
                    profile = getattr(staff.user, "userprofile", None)
                    if profile and profile.name:
                        return profile.name
                    return (
                        staff.user.get_full_name() or
                        staff.user.username or
                        staff.user.email
                    )
                elif hasattr(staff, "userprofile"):
                    return staff.userprofile.name
                return str(staff)

        except Exception:

            pass

        return None

    # ========================================================
    # GET ASSIGNED STAFF ID
    # ========================================================

    def get_assigned_staff_id(self, obj):

        try:

            if (
                hasattr(
                    obj,
                    "assigned_staff"
                )
                and obj.assigned_staff
            ):

                return obj.assigned_staff.staff_id

        except Exception:

            pass

        return None