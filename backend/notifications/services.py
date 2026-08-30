import json
import logging
from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from pywebpush import webpush, WebPushException

from .models import Notification, PushSubscription

logger = logging.getLogger(__name__)


def send_web_push(subscription, payload_data):
    """
    Sends a Web Push notification to a specific PushSubscription record.
    If the subscription is invalid/expired (410 Gone / 404 Not Found), deactivates it.
    """
    if not subscription or not subscription.is_active:
        return False

    vapid_private_key = getattr(settings, "VAPID_PRIVATE_KEY", None)
    vapid_admin_email = getattr(settings, "VAPID_ADMIN_EMAIL", "mailto:admin@ecopulse.local")

    if not vapid_private_key:
        logger.warning("VAPID_PRIVATE_KEY not configured. Skipping push delivery.")
        return False

    subscription_info = {
        "endpoint": subscription.endpoint,
        "keys": {
            "p256dh": subscription.p256dh,
            "auth": subscription.auth,
        },
    }

    try:
        payload_json = json.dumps(payload_data)
        webpush(
            subscription_info=subscription_info,
            data=payload_json,
            vapid_private_key=vapid_private_key,
            vapid_claims={"sub": vapid_admin_email},
            ttl=86400,
        )
        return True
    except WebPushException as ex:
        logger.warning(f"WebPush delivery failed: {ex}")
        # Response code 404 or 410 means subscription is no longer valid or user unsubscribed
        if ex.response and ex.response.status_code in [404, 410]:
            subscription.is_active = False
            subscription.save(update_fields=["is_active", "updated_at"])
            logger.info(f"Deactivated expired PushSubscription #{subscription.id}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending web push: {e}")
        return False


def create_notification(
    recipient,
    title,
    message,
    notification_type="GENERAL",
    related_pickup=None,
    related_complaint=None,
    action_url="",
    send_push=True,
):
    """
    Central helper function to:
    1. Persist notification in PostgreSQL database for the recipient.
    2. Dispatch browser push notifications to all active subscriptions of the recipient.
    3. Safely catch errors so main application operations never fail.
    """
    if not recipient or not isinstance(recipient, User):
        logger.warning("create_notification called with invalid recipient.")
        return None

    try:
        # 1. Create database record
        notification = Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
            related_pickup=related_pickup,
            related_complaint=related_complaint,
            action_url=action_url,
        )

        # 2. Dispatch push notifications if enabled
        if send_push:
            active_subscriptions = PushSubscription.objects.filter(
                user=recipient,
                is_active=True
            )

            push_payload = {
                "id": notification.id,
                "title": title,
                "body": message,
                "notification_type": notification_type,
                "action_url": action_url or "/notifications",
                "created_at": notification.created_at.isoformat(),
            }

            for sub in active_subscriptions:
                try:
                    send_web_push(sub, push_payload)
                except Exception as push_err:
                    logger.error(f"Push send error for sub #{sub.id}: {push_err}")

        return notification
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")
        return None


def notify_admins(
    title,
    message,
    notification_type="GENERAL",
    related_pickup=None,
    related_complaint=None,
    action_url="/admin",
    send_push=True,
):
    """
    Helper to create notifications for all system administrators and staff with ADMIN role.
    """
    try:
        admin_users = User.objects.filter(
            models.Q(is_superuser=True) |
            models.Q(is_staff=True) |
            models.Q(userprofile__role="ADMIN")
        ).distinct()

        notifications = []
        for admin in admin_users:
            n = create_notification(
                recipient=admin,
                title=title,
                message=message,
                notification_type=notification_type,
                related_pickup=related_pickup,
                related_complaint=related_complaint,
                action_url=action_url,
                send_push=send_push,
            )
            if n:
                notifications.append(n)
        return notifications
    except Exception as e:
        logger.error(f"Failed to notify admins: {e}")
        return []
