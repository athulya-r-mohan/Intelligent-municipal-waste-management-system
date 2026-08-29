from django.urls import path
from .views import (
    detect_waste,
    create_pickup_request,
    AdminPickupRequestListView,
    StaffByWardView,
    AssignPickupView,
    StaffAssignedTasksView,
    StaffTaskUpdateView,
    DashboardStatsView,
    UserPickupHistoryView,
    UserLatestPickupView,
)

urlpatterns = [
    path(
        "user/latest-pickup/",
        UserLatestPickupView.as_view(),
        name="user-latest-pickup"
    ),

    path(
        "user/pickup-history/",
        UserPickupHistoryView.as_view(),
        name="user-pickup-history"
    ),

    path(
        "detect-waste/",
        detect_waste,
        name="detect-waste"
    ),

    path(
        "create-pickup/",
        create_pickup_request,
        name="create-pickup"
    ),

    path(
        "pickup-requests/",
        AdminPickupRequestListView.as_view(),
        name="pickup-requests"
    ),

    path(
        "staff/by-ward/<int:ward_id>/",
        StaffByWardView.as_view(),
        name="staff-by-ward"
    ),

    path(
        "assign-pickup/",
        AssignPickupView.as_view(),
        name="assign-pickup"
    ),

    path(
        "staff/my-tasks/",
        StaffAssignedTasksView.as_view(),
        name="staff-my-tasks"
    ),

    path(
        "staff/task-update/<int:pk>/",
        StaffTaskUpdateView.as_view(),
        name="staff-task-update"
    ),

    path(
        "staff/tasks/<int:pk>/",
        StaffTaskUpdateView.as_view(),
        name="staff-task-detail"
    ),

    path(
        "dashboard-stats/",
        DashboardStatsView.as_view(),
        name="dashboard-stats"
    ),
]