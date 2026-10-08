from django.db import models
from django.contrib.auth.models import User


class Ward(models.Model):

    ward_id = models.AutoField(
        primary_key=True
    )

    ward_number = models.PositiveIntegerField(
        unique=True,
        null=True,
        blank=True
    )

    ward_name = models.CharField(
        max_length=100,
        blank=True,
        default=""
    )

    location = models.CharField(
        max_length=200,
        blank=True,
        default=""
    )


    def __str__(self):
        return self.ward_name or f"Ward {self.ward_number or self.ward_id}"

class UserProfile(models.Model):

    ROLE_CHOICES=(

        ('CITIZEN','Citizen'),

        ('ADMIN','Admin'),

        ('STAFF','Staff'),

        ('RECYCLER','Recycler'),

    )


    user=models.OneToOneField(
        User,
        on_delete=models.CASCADE
    )


    name=models.CharField(
        max_length=100
    )


    phone = models.CharField(
    max_length=15,
    blank=True,
    null=True
   )


    address = models.TextField(
    blank=True,
    null=True
    )


    ward = models.ForeignKey(
    Ward,
    on_delete=models.CASCADE,
    blank=True,
    null=True
    )


    role=models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="CITIZEN"
    )
class Staff(models.Model):
    DESIGNATION_CHOICES = (
        ('STAFF', 'Staff'),
        ('DRIVER', 'Driver'),
    )

    staff_id = models.AutoField(
        primary_key=True
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE
    )

    phone = models.CharField(
        max_length=15,
        blank=True,
        null=True
    )

    address = models.TextField(
        blank=True,
        null=True
    )

    profile_photo = models.ImageField(
        upload_to='staff_profiles/',
        blank=True,
        null=True
    )

    designation = models.CharField(
        max_length=20,
        choices=DESIGNATION_CHOICES
    )

    date_of_joining = models.DateField()

    def __str__(self):
        return f"{self.user.email} - {self.designation}"
class Recycler(models.Model):
    WASTE_TYPE_CHOICES = (
        ('Plastic', 'Plastic'),
        ('Paper', 'Paper'),
        ('Glass', 'Glass'),
        ('Metal', 'Metal'),
        ('E-Waste', 'E-Waste'),
        ('Organic Waste', 'Organic Waste'),
        ('Mixed Waste', 'Mixed Waste'),
    )

    recycler_id = models.AutoField(
        primary_key=True
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE
    )

    address = models.TextField(
        blank=True,
        null=True
    )

    profile_photo = models.ImageField(
        upload_to='recycler_profiles/',
        blank=True,
        null=True
    )

    organization = models.CharField(
        max_length=200
    )

    waste_type = models.CharField(
        max_length=50,
        choices=WASTE_TYPE_CHOICES
    )

    date_of_registration = models.DateField()

    def __str__(self):
        return f"{self.organization} - {self.user.email}"