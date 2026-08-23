from django.contrib import admin

from .models import (
    WastePickupRequest,
    WastePickupImage,
)


# ============================================================
# WASTE PICKUP IMAGE ADMIN
# ============================================================

@admin.register(WastePickupImage)
class WastePickupImageAdmin(
    admin.ModelAdmin
):

    list_display = (
        "id",
        "pickup_request",
        "get_email",
        "get_name",
        "get_ward",
        "waste_type",
        "confidence",
        "created_at",
    )

    list_filter = (
        "waste_type",
        "created_at",
    )

    search_fields = (
        "pickup_request__user__email",
        "pickup_request__user__username",
        "pickup_request__user__userprofile__name",
        "waste_type",
    )

    readonly_fields = (
        "created_at",
    )


    def get_email(
        self,
        obj
    ):

        return obj.pickup_request.user.email


    get_email.short_description = "Email"


    def get_name(
        self,
        obj
    ):

        profile = getattr(
            obj.pickup_request.user,
            "userprofile",
            None
        )

        if profile:

            return profile.name

        return "-"


    get_name.short_description = "Name"


    def get_ward(
        self,
        obj
    ):

        profile = getattr(
            obj.pickup_request.user,
            "userprofile",
            None
        )

        if profile and profile.ward:

            return profile.ward.ward_id

        return "-"


    get_ward.short_description = "Ward ID"


# ============================================================
# WASTE PICKUP REQUEST ADMIN
# ============================================================

@admin.register(WastePickupRequest)
class WastePickupRequestAdmin(
    admin.ModelAdmin
):

    list_display = (
        "id",
        "get_email",
        "get_name",
        "get_ward",
        "location_name",
        "status",
        "get_image_count",
        "created_at",
    )

    list_filter = (
        "status",
        "created_at",
    )

    search_fields = (
        "user__email",
        "user__username",
        "user__userprofile__name",
        "location_name",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )


    def get_email(
        self,
        obj
    ):

        return obj.user.email


    get_email.short_description = "Email"


    def get_name(
        self,
        obj
    ):

        profile = getattr(
            obj.user,
            "userprofile",
            None
        )

        if profile:

            return profile.name

        return "-"


    get_name.short_description = "Name"


    def get_ward(
        self,
        obj
    ):

        profile = getattr(
            obj.user,
            "userprofile",
            None
        )

        if profile and profile.ward:

            return profile.ward.ward_id

        return "-"


    get_ward.short_description = "Ward ID"


    def get_image_count(
        self,
        obj
    ):

        return obj.waste_images.count()


    get_image_count.short_description = (
        "Images"
    )