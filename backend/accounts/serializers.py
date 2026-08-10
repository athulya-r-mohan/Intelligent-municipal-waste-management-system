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