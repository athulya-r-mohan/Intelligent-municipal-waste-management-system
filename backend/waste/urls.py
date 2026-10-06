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
    StaffMCFTodayView,
    StaffMCFCollectionSubmitView,
    AdminMCFDailyListView,
    AdminMCFDateDetailsView,
    AdminMCFAssignRecyclerView,
    ExistingRecyclerListView,
    RecyclerTasksView,
    RecyclerCompleteTaskView,
    PaymentDetailByPickupView,
    PaymentCreateOrderView,
    PaymentVerifyView,
    AdminPaymentListView,
    AdminRequestPaymentReminderView,
    UserPaymentsListView,
    AdminRecyclingHistoryMonthsView,
    AdminRecyclingHistoryCategoriesView,
    AdminRecyclingHistoryRecordsView,
    RewardSubmissionCreateView,
    AdminRewardSubmissionListView,
    AdminAssignRewardView,
    UserRewardListView,
    UserClaimRewardView,
    AdminAnalyticsView,
    StaffAnalyticsView,
    RecyclerAnalyticsView,
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

    # ============================================================
    # MCF (MATERIAL COLLECTION FACILITY) DAILY COLLECTION & RECYCLER
    # ============================================================
    path(
        "mcf/today/",
        StaffMCFTodayView.as_view(),
        name="staff-mcf-today"
    ),
    path(
        "mcf/submit/",
        StaffMCFCollectionSubmitView.as_view(),
        name="staff-mcf-submit"
    ),
    path(
        "mcf/admin/daily-totals/",
        AdminMCFDailyListView.as_view(),
        name="admin-mcf-daily-totals"
    ),
    path(
        "mcf/admin/daily-details/",
        AdminMCFDateDetailsView.as_view(),
        name="admin-mcf-daily-details"
    ),
    path(
        "mcf/admin/assign-recycler/",
        AdminMCFAssignRecyclerView.as_view(),
        name="admin-mcf-assign-recycler"
    ),
    path(
        "mcf/recyclers/",
        ExistingRecyclerListView.as_view(),
        name="mcf-recyclers"
    ),
    path(
        "mcf/recycler/tasks/",
        RecyclerTasksView.as_view(),
        name="mcf-recycler-tasks"
    ),
    path(
        "mcf/recycler/complete-task/",
        RecyclerCompleteTaskView.as_view(),
        name="mcf-recycler-complete-task"
    ),

    # ============================================================
    # FIXED ₹50 PICKUP PAYMENT SYSTEM
    # ============================================================
    path(
        "payments/my/",
        UserPaymentsListView.as_view(),
        name="user-payments-list"
    ),
    path(
        "payments/pickup/<int:pickup_id>/",
        PaymentDetailByPickupView.as_view(),
        name="payment-detail-by-pickup"
    ),
    path(
        "payments/create-order/",
        PaymentCreateOrderView.as_view(),
        name="payment-create-order"
    ),
    path(
        "payments/verify/",
        PaymentVerifyView.as_view(),
        name="payment-verify"
    ),
    path(
        "payments/admin/",
        AdminPaymentListView.as_view(),
        name="admin-payments-list"
    ),
    path(
        "payments/<int:pk>/request-payment/",
        AdminRequestPaymentReminderView.as_view(),
        name="admin-request-payment-reminder-pk"
    ),
    path(
        "payments/request-payment/",
        AdminRequestPaymentReminderView.as_view(),
        name="admin-request-payment-reminder"
    ),

    # ============================================================
    # ADMIN RECYCLED WASTE HISTORY ROUTES
    # ============================================================
    path(
        "admin/recycling-history/months/",
        AdminRecyclingHistoryMonthsView.as_view(),
        name="admin-recycling-history-months"
    ),
    path(
        "admin/recycling-history/categories/",
        AdminRecyclingHistoryCategoriesView.as_view(),
        name="admin-recycling-history-categories"
    ),
    path(
        "admin/recycling-history/records/",
        AdminRecyclingHistoryRecordsView.as_view(),
        name="admin-recycling-history-records"
    ),

    # ============================================================
    # REWARD SUBMISSION ROUTES
    # ============================================================
    path(
        "reward-submissions/submit/",
        RewardSubmissionCreateView.as_view(),
        name="reward-submission-submit"
    ),
    path(
        "reward-submissions/admin/",
        AdminRewardSubmissionListView.as_view(),
        name="reward-submission-admin-list"
    ),
    path(
        "reward-submissions/<int:pk>/assign-reward/",
        AdminAssignRewardView.as_view(),
        name="reward-submission-assign-reward"
    ),
    path(
        "user/rewards/",
        UserRewardListView.as_view(),
        name="user-rewards"
    ),
    path(
        "reward-submissions/<int:pk>/claim/",
        UserClaimRewardView.as_view(),
        name="reward-submission-claim"
    ),
    path(
        "admin/analytics/",
        AdminAnalyticsView.as_view(),
        name="admin-analytics"
    ),
    path(
        "staff/analytics/",
        StaffAnalyticsView.as_view(),
        name="staff-analytics"
    ),
    path(
        "recycler/analytics/",
        RecyclerAnalyticsView.as_view(),
        name="recycler-analytics"
    ),
]