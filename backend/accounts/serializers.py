import re
from django.db import models
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Ward


class RegisterSerializer(serializers.Serializer):

    name = serializers.CharField()

    email = serializers.EmailField()

    phone = serializers.CharField()

    password = serializers.CharField(
        write_only=True
    )

    address = serializers.CharField()

    ward_id = serializers.IntegerField()


    def create(self, validated_data):

        ward = Ward.objects.get(
            ward_id=validated_data['ward_id']
        )


        user = User.objects.create_user(

            username=validated_data['email'],

            email=validated_data['email'],

            password=validated_data['password']

        )


        UserProfile.objects.create(

            user=user,

            name=validated_data['name'],

            phone=validated_data['phone'],

            address=validated_data['address'],

            ward=ward,

            role="CITIZEN"

        )

        return user


class WardSerializer(serializers.ModelSerializer):
    ward_number = serializers.IntegerField(required=True)
    ward_name = serializers.CharField(required=False, allow_blank=True, default="")
    location = serializers.CharField(required=False, allow_blank=True, default="")
    mcf_location_name = serializers.CharField(required=False, allow_blank=True, default="")
    mcf_latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    mcf_longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    user_count = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Ward
        fields = [
            "ward_id",
            "ward_number",
            "ward_name",
            "location",
            "mcf_location_name",
            "mcf_latitude",
            "mcf_longitude",
            "user_count",
            "can_delete",
        ]
        read_only_fields = ["ward_id"]

    def get_user_count(self, obj):
        # Accurate count of active registered citizen accounts assigned to this ward
        if hasattr(obj, "active_citizen_count"):
            return obj.active_citizen_count
        return obj.userprofile_set.filter(
            role="CITIZEN",
            user__is_active=True
        ).count()

    def get_can_delete(self, obj):
        # Safe guard: Prevent deletion if any user profile (citizen, staff, admin) is assigned
        if hasattr(obj, "total_user_count"):
            return obj.total_user_count == 0
        return obj.userprofile_set.count() == 0

    def validate_ward_number(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Ward number must be a positive integer.")
        qs = Ward.objects.filter(ward_number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Ward number {value} already exists.")
        return value

    def validate_ward_name(self, value):
        if value:
            return value.strip()
        return ""


class UserProfileDetailsSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    date_joined = serializers.DateTimeField(source="user.date_joined", read_only=True)
    ward_details = serializers.SerializerMethodField()
    role_specific_details = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "user_id",
            "username",
            "name",
            "email",
            "phone",
            "address",
            "role",
            "date_joined",
            "ward_details",
            "role_specific_details",
        ]
        read_only_fields = fields

    def get_ward_details(self, obj):
        if not obj.ward:
            return None
        return {
            "ward_id": obj.ward.ward_id,
            "ward_number": obj.ward.ward_number,
            "ward_name": obj.ward.ward_name,
            "location": obj.ward.location,
            "mcf_location_name": obj.ward.mcf_location_name,
        }

    def get_role_specific_details(self, obj):
        user = obj.user
        details = {}
        if obj.role == "STAFF" and hasattr(user, "staff"):
            staff = user.staff
            details["designation"] = staff.designation
            details["date_of_joining"] = str(staff.date_of_joining) if staff.date_of_joining else None
            details["staff_id"] = staff.staff_id
        elif obj.role == "RECYCLER" and hasattr(user, "recycler"):
            recycler = user.recycler
            details["organization"] = recycler.organization
            details["waste_type"] = recycler.waste_type
            details["date_of_registration"] = str(recycler.date_of_registration) if recycler.date_of_registration else None
            details["recycler_id"] = recycler.recycler_id
        return details


class ProfileUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=True)
    email = serializers.EmailField(required=True)
    address = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_name(self, value):
        val = value.strip()
        if len(val) < 2:
            raise serializers.ValidationError("Full name must be at least 2 characters.")
        if not re.match(r"^[a-zA-Z\s.'-]+$", val):
            raise serializers.ValidationError("Name can only contain letters, spaces, hyphens, and dots.")
        return val

    def validate_email(self, value):
        val = value.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+-]+@gmail\.com$", val):
            raise serializers.ValidationError("Please enter a valid Gmail address (@gmail.com).")
        
        request = self.context.get("request")
        current_user = request.user if request else None
        
        qs = User.objects.filter(
            models.Q(email__iexact=val) | models.Q(username__iexact=val)
        )
        if current_user and current_user.pk:
            qs = qs.exclude(pk=current_user.pk)
        
        if qs.exists():
            raise serializers.ValidationError("This email address is already in use by another account.")
        
        return val

    def validate_address(self, value):
        return value.strip() if value else ""


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_new_password = serializers.CharField(required=True, write_only=True)

    def validate_current_password(self, value):
        request = self.context.get("request")
        user = request.user if request else None
        if not user or not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        new_pass = attrs.get("new_password")
        confirm_pass = attrs.get("confirm_new_password")

        if new_pass != confirm_pass:
            raise serializers.ValidationError({"confirm_new_password": "New passwords do not match."})

        request = self.context.get("request")
        user = request.user if request else None

        # Format requirements: min 8 chars, uppercase, lowercase, number
        if len(new_pass) < 8:
            raise serializers.ValidationError({"new_password": "Password must be at least 8 characters long."})
        if not re.search(r"[A-Z]", new_pass) or not re.search(r"[a-z]", new_pass) or not re.search(r"\d", new_pass):
            raise serializers.ValidationError({
                "new_password": "Password must include at least one uppercase letter, one lowercase letter, and one number."
            })

        # Apply Django's built-in password validators
        try:
            from django.contrib.auth.password_validation import validate_password as django_validate_password
            django_validate_password(new_pass, user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"new_password": list(e.messages)})

        return attrs
