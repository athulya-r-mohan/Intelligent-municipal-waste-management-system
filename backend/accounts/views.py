from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
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
            if User.objects.filter(username=data['email']).exists():
                return Response(
                    {
                        "error": "Email already exists"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            ward = Ward.objects.get(
                ward_id=data['ward_id']
            )

            with transaction.atomic():
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
            ward_str = "Not Assigned"
            if profile.ward:
                num = profile.ward.ward_number or profile.ward.ward_id
                name = profile.ward.ward_name
                ward_str = f"Ward {num} - {name}" if name else f"Ward {num}"

            data.append({
                "id": profile.id,
                "name": profile.name,
                "email": profile.user.email,
                "phone": profile.phone,
                "address": profile.address,
                "ward": ward_str,
                "ward_id": profile.ward.ward_id if profile.ward else None,
                "ward_number": profile.ward.ward_number if profile.ward else None,
                "ward_name": profile.ward.ward_name if profile.ward else "",
            })

        return Response(data, status=status.HTTP_200_OK)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import SessionAuthentication
from django.shortcuts import get_object_or_404
from .serializers import (
    WardSerializer,
    UserProfileDetailsSerializer,
    ProfileUpdateSerializer,
    ChangePasswordSerializer,
)

from .models import Staff


def is_admin_user(request):
    if not request.user or not request.user.is_authenticated:
        return False
    if request.user.is_staff or request.user.is_superuser:
        return True
    profile = getattr(request.user, "userprofile", None)
    return bool(profile and profile.role == "ADMIN")


class WardListCreateView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request):
        from django.db.models import Count, Q

        wards = Ward.objects.annotate(
            active_citizen_count=Count(
                "userprofile",
                filter=Q(userprofile__role="CITIZEN", userprofile__user__is_active=True),
                distinct=True
            ),
            total_user_count=Count("userprofile", distinct=True)
        ).order_by("ward_number", "ward_id")
        serializer = WardSerializer(wards, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not is_admin_user(request):
            return Response(
                {"error": "Unauthorized. Only administrators can create wards."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = WardSerializer(data=request.data)
        if not serializer.is_valid():
            first_err = list(serializer.errors.values())[0]
            msg = first_err[0] if isinstance(first_err, list) else str(first_err)
            return Response(
                {"error": msg, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        ward = serializer.save()
        return Response(
            {
                "message": f"Ward {ward.ward_number} created successfully.",
                "ward": WardSerializer(ward).data
            },
            status=status.HTTP_201_CREATED
        )


class WardDetailView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, pk):
        from django.db.models import Count, Q

        ward = Ward.objects.annotate(
            active_citizen_count=Count(
                "userprofile",
                filter=Q(userprofile__role="CITIZEN", userprofile__user__is_active=True),
                distinct=True
            ),
            total_user_count=Count("userprofile", distinct=True)
        ).filter(pk=pk).first()
        if not ward:
            return Response({"error": "Ward not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = WardSerializer(ward)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        return self.patch(request, pk)

    def patch(self, request, pk):
        if not is_admin_user(request):
            return Response(
                {"error": "Unauthorized. Only administrators can update wards."},
                status=status.HTTP_403_FORBIDDEN
            )

        ward = get_object_or_404(Ward, pk=pk)
        serializer = WardSerializer(ward, data=request.data, partial=True)
        if not serializer.is_valid():
            first_err = list(serializer.errors.values())[0]
            msg = first_err[0] if isinstance(first_err, list) else str(first_err)
            return Response(
                {"error": msg, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        updated_ward = serializer.save()
        return Response(
            {
                "message": f"Ward {updated_ward.ward_number} updated successfully.",
                "ward": WardSerializer(updated_ward).data
            },
            status=status.HTTP_200_OK
        )

    def delete(self, request, pk):
        if not is_admin_user(request):
            return Response(
                {"error": "Unauthorized. Only administrators can delete wards."},
                status=status.HTTP_403_FORBIDDEN
            )

        ward = get_object_or_404(Ward, pk=pk)

        # Check safety: prevent deletion if active users or records depend on this ward
        user_count = UserProfile.objects.filter(ward=ward).count()
        if user_count > 0:
            return Response(
                {
                    "error": f"This ward is currently in use by {user_count} user(s) and cannot be deleted."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        ward_num = ward.ward_number or ward.ward_id
        ward.delete()
        return Response(
            {"message": f"Ward {ward_num} deleted successfully."},
            status=status.HTTP_200_OK
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_staff_by_ward(request):

    ward_id = request.GET.get("ward")

    if not ward_id:
        return Response(
            {
                "success": False,
                "message": "Ward is required."
            },
            status=400
        )

    staff = Staff.objects.filter(
        user__userprofile__ward__ward_id=ward_id
    ).select_related(
        "user",
        "user__userprofile"
    )

    data = []

    for staff_member in staff:

        profile = getattr(
            staff_member.user,
            "userprofile",
            None
        )

        data.append({
            "staff_id": staff_member.staff_id,
            "name": profile.name if profile else staff_member.user.username,
            "email": staff_member.user.email,
            "phone": staff_member.phone,
            "designation": staff_member.designation,
            "ward_id": profile.ward.ward_id if profile and profile.ward else None,
            "ward_number": profile.ward.ward_number if profile and profile.ward else None,
            "ward_name": profile.ward.ward_name if profile and profile.ward else "",
        })

    return Response({
        "success": True,
        "staff": data
    })


class UserProfileView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_or_create_profile(self, user):
        profile = UserProfile.objects.select_related("user", "ward").filter(user=user).first()
        if not profile:
            # Fallback for accounts created via createsuperuser or CLI
            role = "ADMIN" if (user.is_superuser or user.is_staff) else "CITIZEN"
            profile = UserProfile.objects.create(
                user=user,
                name=user.get_full_name() or user.username or "User",
                role=role,
                phone="",
                address="",
            )
            profile = UserProfile.objects.select_related("user", "ward").get(pk=profile.pk)
        return profile

    def get(self, request):
        profile = self._get_or_create_profile(request.user)
        serializer = UserProfileDetailsSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        return self.patch(request)

    def patch(self, request):
        profile = self._get_or_create_profile(request.user)
        serializer = ProfileUpdateSerializer(data=request.data, context={"request": request})

        if not serializer.is_valid():
            first_err = list(serializer.errors.values())[0]
            msg = first_err[0] if isinstance(first_err, list) else str(first_err)
            return Response(
                {"error": msg, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        validated_name = serializer.validated_data["name"]
        validated_email = serializer.validated_data["email"]
        validated_address = serializer.validated_data.get("address", "")

        user = request.user
        email_changed = user.email.lower() != validated_email.lower()

        with transaction.atomic():
            # Update User email and username atomically (system uses username=email for auth)
            if email_changed:
                user.email = validated_email
                user.username = validated_email
                user.save(update_fields=["email", "username"])

            # Update UserProfile name and address
            profile.name = validated_name
            profile.address = validated_address
            profile.save(update_fields=["name", "address"])

            # Keep address consistent across Staff and Recycler models if present
            if hasattr(user, "staff"):
                user.staff.address = validated_address
                user.staff.save(update_fields=["address"])

            if hasattr(user, "recycler"):
                user.recycler.address = validated_address
                user.recycler.save(update_fields=["address"])

        updated_profile = UserProfile.objects.select_related("user", "ward").get(pk=profile.pk)
        return Response({
            "message": "Profile updated successfully.",
            "profile": UserProfileDetailsSerializer(updated_profile).data,
        }, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})

        if not serializer.is_valid():
            first_err = list(serializer.errors.values())[0]
            msg = first_err[0] if isinstance(first_err, list) else str(first_err)
            return Response(
                {"error": msg, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        new_password = serializer.validated_data["new_password"]

        with transaction.atomic():
            user.set_password(new_password)
            user.save(update_fields=["password"])

        # Generate fresh JWT tokens so user session remains uninterrupted
        refresh = RefreshToken.for_user(user)

        return Response({
            "message": "Password changed successfully.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_200_OK)
