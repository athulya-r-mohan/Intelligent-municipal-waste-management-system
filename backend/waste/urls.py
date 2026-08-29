from django.urls import path
from .views import (
    detect_waste,
    create_pickup_request,
    AdminPickupRequestListView,
    StaffByWardView,
    AllStaffListView,
    AssignPickupView,
    StaffAssignedTasksView,
    StaffTaskUpdateView,
    DashboardStatsView,
    UserPickupHistoryView,
    UserLatestPickupView,
    WasteComplaintCreateView,
    UserComplaintListView,
    UserComplaintDetailView,
    AdminComplaintListView,
    AdminAssignComplaintView,
    StaffAssignedComplaintsView,
    StaffComplaintUpdateView,
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
        "staff/all/",
        AllStaffListView.as_view(),
        name="staff-all"
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

    # ============================================================
    # PUBLIC WASTE COMPLAINT ROUTES
    # ============================================================
    path(
        "complaints/",
        WasteComplaintCreateView.as_view(),
        name="create-complaint"
    ),

    path(
        "complaints/my/",
        UserComplaintListView.as_view(),
        name="user-complaints"
    ),

    path(
        "complaints/<int:pk>/",
        UserComplaintDetailView.as_view(),
        name="user-complaint-detail"
    ),


    path(
        "admin/complaints/",
        AdminComplaintListView.as_view(),
        name="admin-complaints"
    ),

    path(
        "admin/complaints/assign/",
        AdminAssignComplaintView.as_view(),
        name="admin-assign-complaint"
    ),

    path(
        "admin/complaints/<int:pk>/assign/",
        AdminAssignComplaintView.as_view(),
        name="admin-assign-complaint-pk"
    ),

    path(
        "assign-complaint/",
        AdminAssignComplaintView.as_view(),
        name="assign-complaint-legacy"
    ),

    path(
        "staff/my-complaints/",
        StaffAssignedComplaintsView.as_view(),
        name="staff-my-complaints"
    ),

    path(
        "staff/complaints/<int:pk>/update/",
        StaffComplaintUpdateView.as_view(),
        name="staff-complaint-update"
    ),
]