from django.urls import path
from .views import AddStaffView, LoginView, RegisterView, AddRecyclerView,  ResidentDirectoryView,get_staff_by_ward


urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('login/', LoginView.as_view()),
    path('add-staff/', AddStaffView.as_view()),
    path('add-recycler/', AddRecyclerView.as_view()),
    path("resident-directory/", ResidentDirectoryView.as_view()),
    path("staff-by-ward/",get_staff_by_ward,name="staff-by-ward"),

]