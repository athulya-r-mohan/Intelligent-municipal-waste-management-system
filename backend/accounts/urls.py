from django.urls import path
from .views import (
    AddStaffView,
    LoginView,
    RegisterView,
    AddRecyclerView,
    ResidentDirectoryView,
    get_staff_by_ward,
    WardListCreateView,
    WardDetailView,
    UserProfileView,
    ChangePasswordView,
)


urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('login/', LoginView.as_view()),
    path('add-staff/', AddStaffView.as_view()),
    path('add-recycler/', AddRecyclerView.as_view()),
    path("resident-directory/", ResidentDirectoryView.as_view()),
    path("staff-by-ward/", get_staff_by_ward, name="staff-by-ward"),
    path("wards/", WardListCreateView.as_view(), name="ward-list-create"),
    path("wards/<int:pk>/", WardDetailView.as_view(), name="ward-detail"),
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    path("profile/change-password/", ChangePasswordView.as_view(), name="user-change-password"),
]
