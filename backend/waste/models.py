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
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("COMPLETED", "Completed"),
    ]

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
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING",
        db_index=True
    )
    recyclable_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        default=None
    )
    note = models.TextField(
        blank=True,
        null=True,
        default=""
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True
    )
    recycling_image = models.ImageField(
        upload_to="recycling_proofs/",
        null=True,
        blank=True
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


class Payment(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
    ]

    pickup_request = models.OneToOneField(
        WastePickupRequest,
        on_delete=models.CASCADE,
        related_name="payment"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="payments"
    )
    amount = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=50.00
    )
    payment_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING",
        db_index=True
    )
    payment_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True
    )
    transaction_id = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )
    order_id = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )
    payment_method = models.CharField(
        max_length=50,
        default="UPI / Online"
    )
    payment_date = models.DateTimeField(
        blank=True,
        null=True
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Pickup Payment"
        verbose_name_plural = "Pickup Payments"

    def save(self, *args, **kwargs):
        self.amount = 50.00
        if not self.payment_id:
            import uuid
            self.payment_id = f"PAY-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Payment #{self.payment_id} for Pickup #{self.pickup_request_id} - ₹{self.amount} ({self.payment_status})"


# ============================================================
# REWARD SUBMISSION MODEL
# ============================================================

class RewardSubmission(models.Model):
    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Active", "Active"),
        ("Reward Assigned", "Reward Assigned"),
        ("Claimed", "Claimed"),
        ("Expired", "Expired"),
        ("Approved", "Approved"),
        ("Rejected", "Rejected"),
    ]

    WASTE_TYPE_CHOICES = [
        ("Paper", "Paper"),
        ("Plastic", "Plastic"),
        ("Glass", "Glass"),
        ("Metal", "Metal"),
        ("Organic", "Organic"),
        ("Electronics", "Electronics"),
        ("Miscellaneous", "Miscellaneous"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reward_submissions"
    )

    photo = models.ImageField(
        upload_to="reward_photos/"
    )

    date = models.DateField(
        null=True,
        blank=True
    )

    bin_location = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    waste_type = models.CharField(
        max_length=50,
        choices=WASTE_TYPE_CHOICES,
        null=True,
        blank=True
    )

    estimated_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    reward_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    reward_assigned_at = models.DateTimeField(
        null=True,
        blank=True
    )

    reward_assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_reward_submissions"
    )

    points = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    valid_from = models.DateTimeField(
        null=True,
        blank=True
    )

    valid_till = models.DateTimeField(
        null=True,
        blank=True
    )

    claimed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=25,
        choices=STATUS_CHOICES,
        default="Pending"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Reward Submission"
        verbose_name_plural = "Reward Submissions"

    @property
    def bottle_count(self):
        return (self.points // 5) if self.points else 0

    @property
    def computed_status(self):
        if self.claimed_at is not None or self.status == "Claimed":
            return "Claimed"
        if self.points is not None and self.points > 0:
            if self.valid_till and timezone.now() >= self.valid_till:
                return "Expired"
            return "Active"
        if self.status == "Reward Assigned":
            return "Active"
        return self.status or "Pending"

    def __str__(self):
        return f"Reward Submission #{self.id} by {self.user.username} ({self.computed_status})"

