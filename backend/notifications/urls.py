from django.urls import path
from .views import (
    NotificationListView,
    NotificationUnreadCountView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationDeleteView,
    NotificationClearAllView,
    PushSubscribeView,
    PushUnsubscribeView,
    PushStatusView,
    VapidPublicKeyView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
    path("mark-all-read/", NotificationMarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("clear-all/", NotificationClearAllView.as_view(), name="notification-clear-all"),
    path("<int:pk>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
    path("<int:pk>/", NotificationDeleteView.as_view(), name="notification-delete"),
    
    # Push subscription routes
    path("subscribe/", PushSubscribeView.as_view(), name="push-subscribe"),
    path("unsubscribe/", PushUnsubscribeView.as_view(), name="push-unsubscribe"),
    path("subscription-status/", PushStatusView.as_view(), name="push-subscription-status"),
    path("vapid-public-key/", VapidPublicKeyView.as_view(), name="vapid-public-key"),
]
