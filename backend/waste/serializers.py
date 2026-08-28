from rest_framework import serializers
from .models import WastePickupRequest, WastePickupImage, WasteCollection
from accounts.models import UserProfile


# ============================================================
# WASTE COLLECTION SERIALIZER
# ============================================================

class WasteCollectionSerializer(serializers.ModelSerializer):

    staff_name = serializers.SerializerMethodField()
    staff_id = serializers.IntegerField(
        source="staff.staff_id",
        read_only=True
    )
    completion_image_url = serializers.SerializerMethodField()
    completed_at_formatted = serializers.DateTimeField(
        source="completed_at",
        format="%Y-%m-%d %H:%M:%S",
        read_only=True
    )

    class Meta:
        model = WasteCollection
        fields = [
            "id",
            "pickup_request",
            "staff",
            "staff_id",
            "staff_name",
            "completion_image",
            "completion_image_url",
            "estimated_weight",
            "completed_at",
            "completed_at_formatted",
        ]

    def get_staff_name(self, obj):
        try:
            if obj.staff:
                profile = getattr(obj.staff.user, "userprofile", None)
                if profile and profile.name:
                    return profile.name
                return (
                    obj.staff.user.get_full_name() or
                    obj.staff.user.username or
                    obj.staff.user.email
                )
        except Exception:
            pass
        return None

    def get_completion_image_url(self, obj):
        try:
            if obj.completion_image:
                request = self.context.get("request")
                if request:
                    return request.build_absolute_uri(obj.completion_image.url)
                return obj.completion_image.url
        except Exception:
            pass
        return None


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
    # COLLECTION DETAILS
    # ========================================================

    collection = WasteCollectionSerializer(
        read_only=True
    )
    completion_image = serializers.SerializerMethodField()
    estimated_weight = serializers.SerializerMethodField()
    completed_at = serializers.SerializerMethodField()
    payment_qr_data = serializers.SerializerMethodField()

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
            "staff_marked_pending",

            "collection",
            "completion_image",
            "estimated_weight",
            "completed_at",
            "payment_qr_data",
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

    # ========================================================
    # GET COMPLETION IMAGE
    # ========================================================

    def get_completion_image(self, obj):
        try:
            if hasattr(obj, "collection") and obj.collection and obj.collection.completion_image:
                request = self.context.get("request")
                if request:
                    return request.build_absolute_uri(obj.collection.completion_image.url)
                return obj.collection.completion_image.url
        except Exception:
            pass
        return None

    # ========================================================
    # GET ESTIMATED WEIGHT
    # ========================================================

    def get_estimated_weight(self, obj):
        try:
            if hasattr(obj, "collection") and obj.collection:
                return float(obj.collection.estimated_weight)
        except Exception:
            pass
        return None

    # ========================================================
    # GET COMPLETED AT
    # ========================================================

    def get_completed_at(self, obj):
        try:
            if hasattr(obj, "collection") and obj.collection and obj.collection.completed_at:
                return obj.collection.completed_at.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            pass
        return None

    # ========================================================
    # GET PAYMENT QR DATA
    # ========================================================

    def get_payment_qr_data(self, obj):
        try:
            # Payment QR is ONLY available after completion
            if obj.status == "COMPLETED" and hasattr(obj, "collection") and obj.collection:
                weight = float(obj.collection.estimated_weight)
                # Calculate demo rate e.g., ₹15 per kg or minimum ₹50
                amount = max(50.0, round(weight * 15.0, 2))
                return {
                    "upi_id": "ecopulse@upi",
                    "payee_name": "EcoPulse Municipal Waste Management",
                    "amount": amount,
                    "currency": "INR",
                    "request_id": obj.id,
                    "weight_kg": weight,
                    "qr_string": f"upi://pay?pa=ecopulse@upi&pn=EcoPulse%20Waste%20Management&am={amount}&cu=INR&tn=Waste%20Pickup%20Request%20%23{obj.id}",
                }
        except Exception:
            pass
        return None