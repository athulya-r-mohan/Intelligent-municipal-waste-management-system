from django.contrib.auth.models import User
from django.db import IntegrityError
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import UserProfile, Ward


class RegisterView(APIView):

    def post(self, request):

        data = request.data

        try:

            ward = Ward.objects.get(
                ward_id=data['ward_id']
            )


            user = User.objects.create_user(

                username=data['email'],

                email=data['email'],

                password=data['password']

            )


            UserProfile.objects.create(

                user=user,

                name=data['name'],

                phone=data['phone'],

                address=data['address'],

                ward=ward,

                role="CITIZEN"

            )


            return Response(
                {
                    "message":
                    "Registration successful"
                },
                status=status.HTTP_201_CREATED
            )


        except Ward.DoesNotExist:

            return Response(
                {
                    "error":
                    "Invalid ward"
                },
                status=400
            )


        except IntegrityError:

            return Response(
                {
                    "error":
                    "Email already exists"
                },
                status=400
            )
class LoginView(APIView):

    def post(self, request):

        email = request.data.get("email")
        password = request.data.get("password")


        user = authenticate(
            username=email,
            password=password
        )


        if user is None:
            return Response(
                {
                    "error":"Invalid email or password"
                },
                status=400
            )


        refresh = RefreshToken.for_user(user)


        profile = UserProfile.objects.get(
            user=user
        )


        return Response({

            "refresh": str(refresh),

            "access": str(refresh.access_token),

            "user_id": user.id,

            "name": profile.name,

            "role": profile.role,

            "ward_id": profile.ward.ward_id

        })