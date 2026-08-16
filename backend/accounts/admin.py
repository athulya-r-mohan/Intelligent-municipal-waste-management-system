from django.contrib import admin
from .models import Staff, UserProfile, Ward

admin.site.register(UserProfile)
admin.site.register(Ward)
admin.site.register(Staff)