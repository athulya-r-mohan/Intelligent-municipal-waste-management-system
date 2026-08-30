from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import SessionAuthentication

from .models import Notification, PushSubscription
from .serializers import NotificationSerializer, PushSubscriptionSerializer


class NotificationListView(APIView):
    """
    GET: Retrieve all notifications for the authenticated user.
    Supports ?status=unread / ?status=read, ?limit=50, ?offset=0
    """
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        queryset = Notification.objects.filter(recipient=user).select_related("recipient")

        status_param = request.query_params.get("status", "").strip().lower()
        if status_param == "unread":
            queryset = queryset.filter(is_read=False)
        elif status_param == "read":
            queryset = queryset.filter(is_read=True)

        type_param = request.query_params.get("type", "").strip()
        if type_param:
            queryset = queryset.filter(notification_type=type_param)

        total_count = queryset.count()
        unread_count = Notification.objects.filter(recipient=user, is_read=False).count()

        # Optional pagination
        try:
            limit = int(request.query_params.get("limit", 100))
            offset = int(request.query_params.get("offset", 0))
            queryset = queryset[offset: offset + limit]
        except (ValueError, TypeError):
            queryset = queryset[:100]

        serializer = NotificationSerializer(queryset, many=True)
        return Response(
            {
                "success": True,
                "total_count": total_count,
                "unread_count": unread_count,
                "notifications": serializer.data,
            },
            status=status.HTTP_200_OK
        )


class NotificationUnreadCountView(APIView):
    """
    GET: Return the count of unread notifications for the authenticated user.
    """
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)


class NotificationMarkReadView(APIView):
    """
    PATCH / POST: Mark a specific notification as read.
    """
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        return self._mark_read(request, pk)

    def post(self, request, pk):
        return self._mark_read(request, pk)

    def _mark_read(self, request, pk):
        try:
            notification = Notification.objects.get(id=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response(
                {"success": False, "error": f"Notification #{pk} not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        notification.is_read = True
        notification.save(update_fields=["is_read", "updated_at"])

        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        serializer = NotificationSerializer(notification)

        return Response(
            {
                "success": True,
                "message": f"Notification #{pk} marked as read.",
                "unread_count": unread_count,
                "notification": serializer.data,
            },
            status=status.HTTP_200_OK
        )


class NotificationMarkAllReadView(APIView):
    """
    POST / PATCH: Mark all notifications for the authenticated user as read.
    """
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return self._mark_all_read(request)

    def patch(self, request):
        return self._mark_all_read(request)

    def _mark_all_read(self, request):
        updated_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(is_read=True)

        return Response(
            {
                "success": True,
                "message": f"Marked {updated_count} notification(s) as read.",
                "unread_count": 0,
            },
            status=status.HTTP_200_OK
        )


class NotificationDeleteView(APIView):
    """
    DELETE: Permanently delete a single notification belonging to the authenticated user.
    """
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            notification = Notification.objects.get(id=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response(
                {"success": False, "error": f"Notification #{pk} not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        notification.delete()
        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()

        return Response(
            {
                "success": True,
                "message": f"Notification #{pk} permanently deleted.",
                "unread_count": unread_count,
            },
            status=status.HTTP_200_OK
        )


class NotificationClearAllView(APIView):
    """
    DELETE: Permanently delete all notifications belonging to the authenticated user.
    """
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        deleted_count, _ = Notification.objects.filter(recipient=request.user).delete()
        return Response(
            {
                "success": True,
                "message": f"Deleted all ({deleted_count}) notification(s).",
                "unread_count": 0,
            },
            status=status.HTTP_200_OK
        )


class PushSubscribeView(APIView):
    """
    POST: Register or update a browser push subscription for the authenticated user.
    """
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        endpoint = data.get("endpoint")
        keys = data.get("keys", {})
        p256dh = keys.get("p256dh") or data.get("p256dh")
        auth = keys.get("auth") or data.get("auth")
        user_agent = request.META.get("HTTP_USER_AGENT", "") or data.get("user_agent", "")

        if not endpoint or not p256dh or not auth:
            return Response(
                {"success": False, "error": "endpoint, p256dh, and auth are required for push subscription."},
                status=status.HTTP_400_BAD_REQUEST
            )

        subscription, created = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                "user": request.user,
                "p256dh": p256dh,
                "auth": auth,
                "user_agent": user_agent[:500],
                "is_active": True,
            }
        )

        return Response(
            {
                "success": True,
                "message": "Push notification subscription registered successfully.",
                "subscription_id": subscription.id,
                "created": created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class PushUnsubscribeView(APIView):
    """
    POST / DELETE: Deactivate a browser push subscription for the authenticated user.
    """
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return self._unsubscribe(request)

    def delete(self, request):
        return self._unsubscribe(request)

    def _unsubscribe(self, request):
        endpoint = request.data.get("endpoint")
        if endpoint:
            PushSubscription.objects.filter(endpoint=endpoint, user=request.user).update(is_active=False)
        else:
            # Deactivate all active subscriptions for this user
            PushSubscription.objects.filter(user=request.user).update(is_active=False)

        return Response(
            {
                "success": True,
                "message": "Successfully unsubscribed from push notifications.",
            },
            status=status.HTTP_200_OK
        )


class PushStatusView(APIView):
    """
    GET: Check if the authenticated user has an active push subscription.
    """
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        has_active = PushSubscription.objects.filter(user=request.user, is_active=True).exists()
        return Response(
            {
                "success": True,
                "is_subscribed": has_active,
            },
            status=status.HTTP_200_OK
        )


class VapidPublicKeyView(APIView):
    """
    GET: Return the VAPID public key needed by the browser to subscribe to push notifications.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        public_key = getattr(settings, "VAPID_PUBLIC_KEY", "")
        return Response(
            {
                "success": True,
                "public_key": public_key,
            },
            status=status.HTTP_200_OK
        )
