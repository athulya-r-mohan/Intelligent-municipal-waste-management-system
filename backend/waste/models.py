from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class WastePickupRequest(models.Model):

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("ASSIGNED", "Assigned"),
        ("COLLECTED", "Collected"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="waste_pickup_requests"
    )

    location_name = models.CharField(
        max_length=500
    )

    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7
    )

    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    assigned_staff = models.ForeignKey(
        "accounts.Staff",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_pickups"
    )

    staff_marked_pending = models.BooleanField(
        default=False,
        help_text="True if the assigned staff member explicitly marked this task as PENDING."
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"Pickup Request #{self.id}"


class WastePickupImage(models.Model):

    pickup_request = models.ForeignKey(
        WastePickupRequest,
        on_delete=models.CASCADE,
        related_name="waste_images"
    )

    image = models.ImageField(
        upload_to="waste_pickups/"
    )

    waste_type = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    confidence = models.FloatField(
        blank=True,
        null=True,
        default=0.0
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return (
            f"Pickup #{self.pickup_request.id} - "
            f"{self.waste_type}"
        )


class WasteCollection(models.Model):
    pickup_request = models.OneToOneField(
        WastePickupRequest,
        on_delete=models.CASCADE,
        related_name="collection"
    )

    staff = models.ForeignKey(
        "accounts.Staff",
        on_delete=models.CASCADE,
        related_name="collections"
    )

    completion_image = models.ImageField(
        upload_to="waste_collections/"
    )

    estimated_weight = models.DecimalField(
        max_digits=8,
        decimal_places=2
    )

    completed_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"Collection for Pickup #{self.pickup_request.id} ({self.estimated_weight}kg)"


class WasteComplaint(models.Model):

    PRIORITY_CHOICES = [
        ("HIGH", "High"),
        ("MEDIUM", "Medium"),
        ("LOW", "Low"),
    ]

    STATUS_CHOICES = [
        ("NEW", "New"),
        ("ASSIGNED", "Assigned"),
        ("IN_PROGRESS", "In Progress"),
        ("RESOLVED", "Resolved"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="waste_complaints"
    )

    image = models.ImageField(
        upload_to="complaint_images/",
        blank=True,
        null=True
    )

    location_name = models.CharField(
        max_length=500
    )

    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        blank=True,
        null=True
    )

    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        blank=True,
        null=True
    )

    description = models.TextField()

    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default="LOW"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="NEW"
    )

    assigned_staff = models.ForeignKey(
        "accounts.Staff",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_complaints"
    )

    proof_image = models.ImageField(
        upload_to="complaint_proofs/",
        blank=True,
        null=True
    )

    resolved_at = models.DateTimeField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"Complaint #{self.id} - {self.priority} ({self.status})"


class StaffMCFCollection(models.Model):
    staff = models.ForeignKey(
        "accounts.Staff",
        on_delete=models.CASCADE,
        related_name="mcf_collections",
        db_index=True
    )
    date = models.DateField(
        default=timezone.now,
        db_index=True
    )
    paper = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00
    )
    plastic = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00
    )
    glass = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00
    )
    metal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00
    )
    organic = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00
    )
    electronics = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00
    )
    miscellaneous = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00
    )
    total_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        unique_together = ("staff", "date")
        ordering = ["-date", "-updated_at"]
        verbose_name = "Staff MCF Daily Collection"
        verbose_name_plural = "Staff MCF Daily Collections"

    def save(self, *args, **kwargs):
        self.total_quantity = (
            (self.paper or 0) +
            (self.plastic or 0) +
            (self.glass or 0) +
            (self.metal or 0) +
            (self.organic or 0) +
            (self.electronics or 0) +
            (self.miscellaneous or 0)
        )
        super().save(*args, **kwargs)

    def __str__(self):
        staff_name = self.staff.user.username if self.staff and self.staff.user else f"Staff #{self.staff_id}"
        return f"MCF Collection: {staff_name} on {self.date} ({self.total_quantity} kg)"


class MCFRecyclerAssignment(models.Model):
    date = models.DateField(
        db_index=True
    )
    waste_type = models.CharField(
        max_length=50,
        db_index=True
    )
    total_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00
    )
    recycler = models.ForeignKey(
        "accounts.Recycler",
        on_delete=models.CASCADE,
        related_name="mcf_assignments"
    )
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mcf_assignments_made"
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        unique_together = ("date", "waste_type")
        ordering = ["-date", "waste_type"]
        verbose_name = "MCF Recycler Assignment"
        verbose_name_plural = "MCF Recycler Assignments"

    def __str__(self):
        return f"MCF Assignment: {self.waste_type} ({self.total_quantity}kg) -> {self.recycler.organization} on {self.date}"


