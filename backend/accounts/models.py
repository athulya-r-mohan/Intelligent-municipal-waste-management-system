from django.db import models
from django.contrib.auth.models import User


class Ward(models.Model):

    ward_id=models.AutoField(
        primary_key=True
    )

    ward_name=models.CharField(
        max_length=100
    )

    location=models.CharField(
        max_length=200
    )


    def __str__(self):
        return self.ward_name

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


    phone=models.CharField(
        max_length=15
    )


    address=models.TextField()


    ward=models.ForeignKey(
        Ward,
        on_delete=models.CASCADE
    )


    role=models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="CITIZEN"
    )