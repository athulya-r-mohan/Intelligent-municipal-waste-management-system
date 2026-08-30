from rest_framework import serializers
from django.utils.timesince import timesince
from .models import Notification, PushSubscription


class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()
    recipient_email = serializers.CharField(source="recipient.email", read_only=True)
    recipient_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "related_pickup",
            "related_complaint",
            "action_url",
            "is_read",
            "created_at",
            "updated_at",
            "time_ago",
            "recipient_email",
            "recipient_name",
        ]
        read_only_fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "related_pickup",
            "related_complaint",
            "action_url",
            "created_at",
            "updated_at",
            "time_ago",
            "recipient_email",
            "recipient_name",
        ]

    def get_time_ago(self, obj):
        try:
            return f"{timesince(obj.created_at).split(',')[0]} ago"
        except Exception:
            return ""

    def get_recipient_name(self, obj):
        try:
            profile = getattr(obj.recipient, "userprofile", None)
            if profile and profile.name:
                return profile.name
            return obj.recipient.username
        except Exception:
            return obj.recipient.username


class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = [
            "id",
            "endpoint",
            "p256dh",
            "auth",
            "user_agent",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "is_active", "created_at"]
