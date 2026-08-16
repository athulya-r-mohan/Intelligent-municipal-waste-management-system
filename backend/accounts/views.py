from django.contrib.auth.models import User
from django.db import IntegrityError
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import UserProfile, Ward,Staff,Recycler


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

            "ward_id": profile.ward.ward_id if profile.ward else None

        })
class AddStaffView(APIView):

    def post(self, request):

        data = request.data

        try:

            ward = Ward.objects.get(
                ward_id=data['ward_id']
            )

            if User.objects.filter(
                username=data['email']
            ).exists():

                return Response(
                    {
                        "error": "Email already exists"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create temporary password
            import secrets
            import string

            characters = string.ascii_letters + string.digits
            temporary_password = ''.join(
                secrets.choice(characters)
                for _ in range(10)
            )

            # Create login account
            user = User.objects.create_user(
                username=data['email'],
                email=data['email'],
                password=temporary_password
            )

            # Create UserProfile
            UserProfile.objects.create(
                user=user,
                name=data['name'],
                phone="",
                address="",
                ward=ward,
                role="STAFF"
            )

            # Create Staff record
            Staff.objects.create(
                user=user,
                designation=data['designation'],
                date_of_joining=data['dateOfJoining']
            )

            return Response(
                {
                    "message": "Staff added successfully",
                    "email": data['email'],
                    "temporary_password": temporary_password
                },
                status=status.HTTP_201_CREATED
            )

        except Ward.DoesNotExist:

            return Response(
                {
                    "error": "Invalid ward"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        except KeyError as e:

            return Response(
                {
                    "error": f"Missing field: {str(e)}"
                },
                status=status.HTTP_400_BAD_REQUEST
            )
class AddRecyclerView(APIView):

    def post(self, request):

        data = request.data

        try:

            # Check whether email already exists
            if User.objects.filter(
                username=data['email']
            ).exists():

                return Response(
                    {
                        "error": "Email already exists"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Generate temporary password
            import secrets
            import string

            characters = string.ascii_letters + string.digits

            temporary_password = ''.join(
                secrets.choice(characters)
                for _ in range(10)
            )

            # Create login account
            user = User.objects.create_user(
                username=data['email'],
                email=data['email'],
                password=temporary_password
            )

            # Create UserProfile
            UserProfile.objects.create(
                user=user,
                name=data['name'],
                phone=data['phone'],
                address="",
                ward=None,
                role="RECYCLER"
            )

            # Create Recycler record
            Recycler.objects.create(
                user=user,
                organization=data['organization'],
                waste_type=data['waste_type'],
                date_of_registration=data[
                    'date_of_registration'
                ]
            )

            return Response(
                {
                    "message": "Recycler added successfully",
                    "email": data['email'],
                    "temporary_password": temporary_password
                },
                status=status.HTTP_201_CREATED
            )

        except KeyError as e:

            return Response(
                {
                    "error": f"Missing field: {str(e)}"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        except IntegrityError:

            return Response(
                {
                    "error": "Email already exists"
                },
                status=status.HTTP_400_BAD_REQUEST
            )
class ResidentDirectoryView(APIView):

    def get(self, request):

        residents = UserProfile.objects.filter(
            role="CITIZEN"
        ).select_related(
            "user",
            "ward"
        )

        data = []

        for profile in residents:

            data.append({
                "id": profile.id,
                "name": profile.name,
                "email": profile.user.email,
                "phone": profile.phone,
                "address": profile.address,
                "ward": (
                    profile.ward.ward_name
                    if profile.ward
                    else "Not Assigned"
                )
            })

        return Response(data, status=status.HTTP_200_OK)