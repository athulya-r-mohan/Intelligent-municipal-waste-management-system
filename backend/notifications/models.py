from django.db import models
from django.contrib.auth.models import User


class Notification(models.Model):
    NOTIFICATION_TYPE_CHOICES = (
        ("PICKUP_CREATED", "Pickup Request Created"),
        ("TASK_ASSIGNED", "Task Assigned"),
        ("TASK_PENDING", "Task Marked Pending"),
        ("TASK_COMPLETED", "Task Completed"),
        ("COMPLAINT_CREATED", "Complaint Registered"),
        ("COMPLAINT_ASSIGNED", "Complaint Assigned"),
        ("COMPLAINT_IN_PROGRESS", "Complaint In Progress"),
        ("COMPLAINT_RESOLVED", "Complaint Resolved"),
        ("PAYMENT_UPDATE", "Payment Update"),
        ("RECYCLER_ALERT", "Recycler Alert"),
        ("GENERAL", "General Notification"),
    )

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=50,
        choices=NOTIFICATION_TYPE_CHOICES,
        default="GENERAL",
        db_index=True
    )
    related_pickup = models.ForeignKey(
        "waste.WastePickupRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications"
    )
    related_complaint = models.ForeignKey(
        "waste.WasteComplaint",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications"
    )
    action_url = models.CharField(max_length=255, blank=True, default="")
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self):
        return f"[{self.recipient.username}] {self.title} ({'Read' if self.is_read else 'Unread'})"


class PushSubscription(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="push_subscriptions",
        db_index=True
    )
    endpoint = models.TextField(unique=True)
    p256dh = models.TextField()
    auth = models.TextField()
    user_agent = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Push Subscription"
        verbose_name_plural = "Push Subscriptions"

    def __str__(self):
        return f"PushSubscription for {self.user.username} - Active: {self.is_active}"
