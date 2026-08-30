from django.contrib import admin
from .models import Notification, PushSubscription


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "recipient", "title", "notification_type", "is_read", "created_at")
    list_filter = ("notification_type", "is_read", "created_at")
    search_fields = ("recipient__username", "recipient__email", "title", "message")
    ordering = ("-created_at",)


@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "is_active", "created_at", "user_agent")
    list_filter = ("is_active", "created_at")
    search_fields = ("user__username", "user__email", "endpoint")
    ordering = ("-created_at",)
