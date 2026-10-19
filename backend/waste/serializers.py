from rest_framework import serializers
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
from accounts.models import UserProfile, Recycler


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

    scheduled_pickup_date = serializers.DateField(
        format="%Y-%m-%d",
        read_only=True,
        allow_null=True
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
    completed_date = serializers.SerializerMethodField()
    completed_time = serializers.SerializerMethodField()
    ai_confidence = serializers.SerializerMethodField()
    payment_qr_data = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    payment_amount = serializers.SerializerMethodField()
    payment_id = serializers.SerializerMethodField()
    payment_date = serializers.SerializerMethodField()
    transaction_id = serializers.SerializerMethodField()
    has_paid = serializers.SerializerMethodField()

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
            "location_name",
            "latitude",
            "longitude",

            "waste_type",
            "ai_confidence",
            "images",

            "status",
            "date",
            "scheduled_pickup_date",

            "assigned_staff",
            "assigned_staff_id",
            "staff_marked_pending",
            "pending_reason",

            "collection",
            "completion_image",
            "estimated_weight",
            "completed_at",
            "completed_date",
            "completed_time",
            "payment_qr_data",
            "payment_status",
            "payment_amount",
            "payment_id",
            "payment_date",
            "transaction_id",
            "has_paid",
        ]

    # ========================================================
    # GET WARD
    # ========================================================

    def get_ward(self, obj):

        try:

            profile = obj.user.userprofile

            if profile.ward:

                return profile.ward.ward_name or f"Ward {profile.ward.ward_number or profile.ward.ward_id}"

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
    # GET AI CONFIDENCE
    # ========================================================

    def get_ai_confidence(self, obj):

        try:

            image = (
                WastePickupImage.objects
                .filter(
                    pickup_request=obj
                )
                .order_by("id")
                .first()
            )

            if image and image.confidence:
                return round(float(image.confidence) * 100, 1)

        except Exception:

            pass

        return None

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
    # GET COMPLETED DATE
    # ========================================================

    def get_completed_date(self, obj):
        try:
            if hasattr(obj, "collection") and obj.collection and obj.collection.completed_at:
                return obj.collection.completed_at.strftime("%B %d, %Y")
        except Exception:
            pass
        return None

    # ========================================================
    # GET COMPLETED TIME
    # ========================================================

    def get_completed_time(self, obj):
        try:
            if hasattr(obj, "collection") and obj.collection and obj.collection.completed_at:
                return obj.collection.completed_at.strftime("%I:%M %p")
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
                amount = 50.0
                return {
                    "upi_id": "ecopulse@upi",
                    "payee_name": "EcoPulse Municipal Waste Management",
                    "amount": 50.0,
                    "currency": "INR",
                    "request_id": obj.id,
                    "weight_kg": weight,
                    "qr_string": f"upi://pay?pa=ecopulse@upi&pn=EcoPulse%20Waste%20Management&am=50&cu=INR&tn=Waste%20Pickup%20Request%20%23{obj.id}",
                }
        except Exception:
            pass
        return None

    def get_payment_status(self, obj):
        try:
            if hasattr(obj, "payment") and obj.payment:
                return obj.payment.payment_status
            if obj.status == "COMPLETED":
                return "PENDING"
        except Exception:
            pass
        return "N/A"

    def get_payment_amount(self, obj):
        return 50.00

    def get_payment_id(self, obj):
        try:
            if hasattr(obj, "payment") and obj.payment:
                return obj.payment.payment_id
        except Exception:
            pass
        return None

    def get_payment_date(self, obj):
        try:
            if hasattr(obj, "payment") and obj.payment and obj.payment.payment_date:
                return obj.payment.payment_date.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            pass
        return None

    def get_transaction_id(self, obj):
        try:
            if hasattr(obj, "payment") and obj.payment:
                return obj.payment.transaction_id
        except Exception:
            pass
        return None

    def get_has_paid(self, obj):
        try:
            if hasattr(obj, "payment") and obj.payment:
                return obj.payment.payment_status == "COMPLETED"
        except Exception:
            pass
        return False


# ============================================================
# WASTE COMPLAINT SERIALIZER
# ============================================================

class WasteComplaintSerializer(serializers.ModelSerializer):
    complaint_id = serializers.IntegerField(
        source="id",
        read_only=True
    )

    user_id = serializers.IntegerField(
        source="user.id",
        read_only=True
    )

    user_name = serializers.SerializerMethodField()
    email = serializers.EmailField(
        source="user.email",
        read_only=True
    )
    phone = serializers.SerializerMethodField()
    ward = serializers.SerializerMethodField()
    ward_id = serializers.SerializerMethodField()

    image_url = serializers.SerializerMethodField()
    proof_image_url = serializers.SerializerMethodField()

    assigned_staff_name = serializers.SerializerMethodField()
    assigned_staff_id = serializers.IntegerField(
        source="assigned_staff.staff_id",
        read_only=True,
        allow_null=True
    )
    assigned_staff_designation = serializers.CharField(
        source="assigned_staff.designation",
        read_only=True,
        allow_null=True
    )

    created_at_formatted = serializers.DateTimeField(
        source="created_at",
        format="%Y-%m-%d %H:%M:%S",
        read_only=True
    )

    resolved_at_formatted = serializers.DateTimeField(
        source="resolved_at",
        format="%Y-%m-%d %H:%M:%S",
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = WasteComplaint
        fields = [
            "id",
            "complaint_id",
            "user",
            "user_id",
            "user_name",
            "email",
            "phone",
            "ward",
            "ward_id",
            "image",
            "image_url",
            "proof_image",
            "proof_image_url",
            "location_name",
            "latitude",
            "longitude",
            "description",
            "priority",
            "status",
            "assigned_staff",
            "assigned_staff_id",
            "assigned_staff_name",
            "assigned_staff_designation",
            "created_at",
            "created_at_formatted",
            "resolved_at",
            "resolved_at_formatted",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "complaint_id",
            "user",
            "user_id",
            "priority",
            "created_at",
            "created_at_formatted",
            "resolved_at_formatted",
            "updated_at",
        ]

    def get_user_name(self, obj):
        try:
            profile = getattr(obj.user, "userprofile", None)
            if profile and profile.name:
                return profile.name
            return (
                obj.user.get_full_name() or
                obj.user.username or
                obj.user.email
            )
        except Exception:
            return ""

    def get_phone(self, obj):
        try:
            profile = getattr(obj.user, "userprofile", None)
            if profile and profile.phone:
                return profile.phone
        except Exception:
            pass
        return ""

    def get_ward(self, obj):
        try:
            profile = getattr(obj.user, "userprofile", None)
            if profile and profile.ward:
                return profile.ward.ward_name or f"Ward {profile.ward.ward_number or profile.ward.ward_id}"
        except Exception:
            pass
        return ""

    def get_ward_id(self, obj):
        try:
            profile = getattr(obj.user, "userprofile", None)
            if profile and profile.ward:
                return profile.ward.ward_id
        except Exception:
            pass
        return None

    def get_image_url(self, obj):
        try:
            if obj.image:
                request = self.context.get("request")
                if request:
                    return request.build_absolute_uri(obj.image.url)
                return obj.image.url
        except Exception:
            pass
        return None

    def get_proof_image_url(self, obj):
        try:
            if obj.proof_image:
                request = self.context.get("request")
                if request:
                    return request.build_absolute_uri(obj.proof_image.url)
                return obj.proof_image.url
        except Exception:
            pass
        return None

    def get_assigned_staff_name(self, obj):
        try:
            if obj.assigned_staff:
                profile = getattr(obj.assigned_staff.user, "userprofile", None)
                if profile and profile.name:
                    return profile.name
                return (
                    obj.assigned_staff.user.get_full_name() or
                    obj.assigned_staff.user.username or
                    obj.assigned_staff.user.email
                )
        except Exception:
            pass
        return None


# ============================================================
# STAFF MCF COLLECTION SERIALIZER
# ============================================================

class StaffMCFCollectionSerializer(serializers.ModelSerializer):
    staff_id = serializers.IntegerField(source="staff.staff_id", read_only=True)
    staff_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffMCFCollection
        fields = [
            "id",
            "staff",
            "staff_id",
            "staff_name",
            "date",
            "paper",
            "plastic",
            "glass",
            "metal",
            "organic",
            "electronics",
            "miscellaneous",
            "total_quantity",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "staff", "staff_id", "staff_name", "total_quantity", "created_at", "updated_at"]

    def get_staff_name(self, obj):
        try:
            if obj.staff and obj.staff.user:
                profile = getattr(obj.staff.user, "userprofile", None)
                if profile and profile.name:
                    return profile.name
                return obj.staff.user.get_full_name() or obj.staff.user.username
        except Exception:
            pass
        return f"Staff #{obj.staff_id}"


# ============================================================
# RECYCLER OPTION SERIALIZER (For Dropdown Selection)
# ============================================================

class RecyclerOptionSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.SerializerMethodField()

    class Meta:
        model = Recycler
        fields = [
            "recycler_id",
            "organization",
            "waste_type",
            "email",
            "phone",
            "address",
            "date_of_registration",
        ]

    def get_phone(self, obj):
        try:
            profile = getattr(obj.user, "userprofile", None)
            if profile and profile.phone:
                return profile.phone
        except Exception:
            pass
        return ""


# ============================================================
# MCF RECYCLER ASSIGNMENT SERIALIZER
# ============================================================

class MCFRecyclerAssignmentSerializer(serializers.ModelSerializer):
    recycler_id = serializers.IntegerField(source="recycler.recycler_id", read_only=True)
    recycler_organization = serializers.CharField(source="recycler.organization", read_only=True)
    recycler_waste_type = serializers.CharField(source="recycler.waste_type", read_only=True)
    recycler_email = serializers.EmailField(source="recycler.user.email", read_only=True)
    recycler_phone = serializers.SerializerMethodField()
    recycler_address = serializers.CharField(source="recycler.address", read_only=True)
    assigned_by_name = serializers.SerializerMethodField()
    recycling_image_url = serializers.SerializerMethodField()

    class Meta:
        model = MCFRecyclerAssignment
        fields = [
            "id",
            "date",
            "waste_type",
            "total_quantity",
            "recycler",
            "recycler_id",
            "recycler_organization",
            "recycler_waste_type",
            "recycler_email",
            "recycler_phone",
            "recycler_address",
            "assigned_by",
            "assigned_by_name",
            "status",
            "recyclable_quantity",
            "note",
            "recycling_image",
            "recycling_image_url",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "total_quantity",
            "recycler_id",
            "recycler_organization",
            "recycler_waste_type",
            "recycler_email",
            "recycler_phone",
            "recycler_address",
            "assigned_by",
            "assigned_by_name",
            "recycling_image_url",
            "created_at",
            "updated_at",
        ]

    def get_recycling_image_url(self, obj):
        try:
            if obj.recycling_image:
                request = self.context.get("request")
                if request:
                    return request.build_absolute_uri(obj.recycling_image.url)
                return obj.recycling_image.url
        except Exception:
            pass
        return None

    def get_recycler_phone(self, obj):
        try:
            profile = getattr(obj.recycler.user, "userprofile", None)
            if profile and profile.phone:
                return profile.phone
        except Exception:
            pass
        return ""

    def get_assigned_by_name(self, obj):
        try:
            if obj.assigned_by:
                profile = getattr(obj.assigned_by, "userprofile", None)
                if profile and profile.name:
                    return profile.name
                return obj.assigned_by.get_full_name() or obj.assigned_by.username
        except Exception:
            pass
        return None


# ============================================================
# PAYMENT SERIALIZER
# ============================================================

class PaymentSerializer(serializers.ModelSerializer):
    pickup_id = serializers.IntegerField(source="pickup_request.id", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    user_name = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_phone = serializers.SerializerMethodField()
    ward = serializers.SerializerMethodField()
    ward_id = serializers.SerializerMethodField()
    waste_type = serializers.SerializerMethodField()
    pickup_location = serializers.CharField(source="pickup_request.location_name", read_only=True)
    pickup_date = serializers.DateTimeField(source="pickup_request.created_at", format="%Y-%m-%d", read_only=True)
    completed_date = serializers.SerializerMethodField()
    completed_weight = serializers.SerializerMethodField()
    assigned_staff_name = serializers.SerializerMethodField()
    completion_image = serializers.SerializerMethodField()
    payment_date_formatted = serializers.DateTimeField(source="payment_date", format="%Y-%m-%d %H:%M:%S", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "pickup_request",
            "pickup_id",
            "user",
            "user_id",
            "user_name",
            "user_email",
            "user_phone",
            "ward",
            "ward_id",
            "waste_type",
            "pickup_location",
            "pickup_date",
            "completed_date",
            "completed_weight",
            "assigned_staff_name",
            "completion_image",
            "amount",
            "payment_status",
            "payment_id",
            "transaction_id",
            "order_id",
            "payment_method",
            "payment_date",
            "payment_date_formatted",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "amount",
            "payment_id",
            "created_at",
            "updated_at",
        ]

    def get_user_name(self, obj):
        try:
            profile = getattr(obj.user, "userprofile", None)
            if profile and profile.name:
                return profile.name
            return obj.user.get_full_name() or obj.user.username
        except Exception:
            return ""

    def get_user_phone(self, obj):
        try:
            profile = getattr(obj.user, "userprofile", None)
            if profile and profile.phone:
                return profile.phone
        except Exception:
            pass
        return ""

    def get_ward(self, obj):
        try:
            profile = getattr(obj.user, "userprofile", None)
            if profile and profile.ward:
                return profile.ward.ward_name or f"Ward {profile.ward.ward_number or profile.ward.ward_id}"
        except Exception:
            pass
        return ""

    def get_ward_id(self, obj):
        try:
            profile = getattr(obj.user, "userprofile", None)
            if profile and profile.ward:
                return profile.ward.ward_id
        except Exception:
            pass
        return None

    def get_waste_type(self, obj):
        try:
            img = obj.pickup_request.waste_images.first()
            if img and img.waste_type:
                return img.waste_type
        except Exception:
            pass
        return "Waste"

    def get_completed_date(self, obj):
        try:
            if hasattr(obj.pickup_request, "collection") and obj.pickup_request.collection and obj.pickup_request.collection.completed_at:
                return obj.pickup_request.collection.completed_at.strftime("%B %d, %Y %I:%M %p")
        except Exception:
            pass
        return None

    def get_completed_weight(self, obj):
        try:
            if hasattr(obj.pickup_request, "collection") and obj.pickup_request.collection:
                return float(obj.pickup_request.collection.estimated_weight)
        except Exception:
            pass
        return None

    def get_assigned_staff_name(self, obj):
        try:
            staff = obj.pickup_request.assigned_staff
            if staff and staff.user:
                profile = getattr(staff.user, "userprofile", None)
                if profile and profile.name:
                    return profile.name
                return staff.user.get_full_name() or staff.user.username
        except Exception:
            pass
        return None

    def get_completion_image(self, obj):
        try:
            if hasattr(obj.pickup_request, "collection") and obj.pickup_request.collection and obj.pickup_request.collection.completion_image:
                request = self.context.get("request")
                if request:
                    return request.build_absolute_uri(obj.pickup_request.collection.completion_image.url)
                return obj.pickup_request.collection.completion_image.url
        except Exception:
            pass
        return None


# ============================================================
# REWARD SUBMISSION SERIALIZER
# ============================================================

class RewardSubmissionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    created_at_formatted = serializers.DateTimeField(
        source="created_at",
        format="%Y-%m-%d %H:%M:%S",
        read_only=True
    )
    reward_assigned_at_formatted = serializers.DateTimeField(
        source="reward_assigned_at",
        format="%Y-%m-%d %H:%M:%S",
        read_only=True
    )
    valid_from_formatted = serializers.DateTimeField(
        source="valid_from",
        format="%Y-%m-%d %H:%M:%S",
        read_only=True
    )
    valid_till_formatted = serializers.DateTimeField(
        source="valid_till",
        format="%Y-%m-%d %H:%M:%S",
        read_only=True
    )
    claimed_at_formatted = serializers.DateTimeField(
        source="claimed_at",
        format="%Y-%m-%d %H:%M:%S",
        read_only=True
    )
    reward_assigned_by_name = serializers.SerializerMethodField()
    bottle_count = serializers.IntegerField(read_only=True)
    computed_status = serializers.CharField(read_only=True)
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = RewardSubmission
        fields = [
            "id",
            "user",
            "user_name",
            "user_email",
            "photo",
            "photo_url",
            "date",
            "bin_location",
            "waste_type",
            "estimated_quantity",
            "reward_amount",
            "points",
            "bottle_count",
            "valid_from",
            "valid_from_formatted",
            "valid_till",
            "valid_till_formatted",
            "claimed_at",
            "claimed_at_formatted",
            "reward_assigned_at",
            "reward_assigned_at_formatted",
            "reward_assigned_by",
            "reward_assigned_by_name",
            "status",
            "computed_status",
            "days_remaining",
            "created_at",
            "created_at_formatted",
        ]
        read_only_fields = [
            "id",
            "user",
            "status",
            "points",
            "bottle_count",
            "valid_from",
            "valid_till",
            "claimed_at",
            "computed_status",
            "days_remaining",
            "created_at",
            "reward_assigned_at",
            "reward_assigned_by",
        ]

    def get_days_remaining(self, obj):
        if obj.computed_status in ["Claimed", "Pending", "Rejected", "Expired"]:
            return 0
        if not obj.valid_till:
            return 0
        from django.utils import timezone
        now = timezone.now()
        if now >= obj.valid_till:
            return 0
        diff = obj.valid_till - now
        total_secs = diff.total_seconds()
        days = int(total_secs // 86400)
        return days + 1 if total_secs % 86400 > 0 else max(0, days)

    def get_user_name(self, obj):
        try:
            if obj.user:
                profile = getattr(obj.user, "userprofile", None)
                if profile and profile.name:
                    return profile.name
                return obj.user.get_full_name() or obj.user.username
        except Exception:
            pass
        return "Citizen"

    def get_user_email(self, obj):
        return obj.user.email if obj.user else ""

    def get_photo_url(self, obj):
        try:
            if obj.photo:
                request = self.context.get("request")
                if request:
                    return request.build_absolute_uri(obj.photo.url)
                return obj.photo.url
        except Exception:
            pass
        return None

    def get_reward_assigned_by_name(self, obj):
        try:
            if obj.reward_assigned_by:
                profile = getattr(obj.reward_assigned_by, "userprofile", None)
                if profile and profile.name:
                    return profile.name
                return obj.reward_assigned_by.get_full_name() or obj.reward_assigned_by.username
        except Exception:
            pass
        return None
