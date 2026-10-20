import json
import logging
import os
from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from pywebpush import webpush, WebPushException
from py_vapid import Vapid

from .models import Notification, PushSubscription

logger = logging.getLogger(__name__)


def _get_vapid_key_object(raw_key):
    """
    Safely resolves the VAPID private key into a Vapid object or supported structure.
    Handles PEM formatted strings ('-----BEGIN PRIVATE KEY-----...'), file paths,
    and raw base64url strings without exposing key material.
    """
    if not raw_key:
        return None
    if isinstance(raw_key, Vapid):
        return raw_key
    if isinstance(raw_key, str):
        stripped = raw_key.strip()
        if stripped.startswith("-----BEGIN"):
            try:
                return Vapid.from_pem(stripped.encode("utf-8"))
            except Exception as pem_err:
                logger.error(f"Failed to parse VAPID private key from PEM: {pem_err}")
                return None
        elif os.path.exists(stripped):
            try:
                return Vapid.from_file(stripped)
            except Exception as file_err:
                logger.error(f"Failed to load VAPID private key file: {file_err}")
                return None
        else:
            try:
                return Vapid.from_string(stripped)
            except Exception as str_err:
                logger.error(f"Failed to parse VAPID private key string: {str_err}")
                return None
    return raw_key


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

    vapid_key_obj = _get_vapid_key_object(vapid_private_key)
    if not vapid_key_obj:
        logger.warning("Invalid VAPID_PRIVATE_KEY format. Skipping push delivery.")
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
            vapid_private_key=vapid_key_obj,
            vapid_claims={"sub": vapid_admin_email},
            ttl=86400,
        )
        return True
    except WebPushException as ex:
        logger.warning(f"WebPush delivery failed for subscription #{subscription.id}: {ex}")
        status_code = getattr(getattr(ex, "response", None), "status_code", None)
        err_str = str(ex).lower()
        if (status_code in [404, 410]) or ("410 gone" in err_str) or ("404 not found" in err_str):
            subscription.is_active = False
            subscription.save(update_fields=["is_active", "updated_at"])
            logger.info(f"Deactivated expired PushSubscription #{subscription.id}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending web push for subscription #{subscription.id}: {e}")
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
