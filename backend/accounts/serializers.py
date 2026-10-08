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
    user_count = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Ward
        fields = ["ward_id", "ward_number", "ward_name", "location", "user_count", "can_delete"]
        read_only_fields = ["ward_id"]

    def get_user_count(self, obj):
        return obj.userprofile_set.count()

    def get_can_delete(self, obj):
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