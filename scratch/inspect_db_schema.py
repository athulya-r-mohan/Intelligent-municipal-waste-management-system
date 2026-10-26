import os
import sys
import django

# Setup Django environment
sys.path.insert(0, r"c:\Users\acer\OneDrive\Desktop\projects\waste-management-system\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from django.apps import apps
from django.db import connection

app_labels = ['accounts', 'waste', 'notifications']

print("=== APPS & MODELS INSPECTION ===")
for app_label in app_labels:
    app_config = apps.get_app_config(app_label)
    print(f"\n--- APP: {app_label} ---")
    for model in app_config.get_models():
        table_name = model._meta.db_table
        pk_name = model._meta.pk.name if model._meta.pk else 'None'
        print(f"\nTable: {table_name} (Model: {model.__name__}) | PK: {pk_name}")
        for field in model._meta.fields:
            col_name = field.column
            field_type = field.get_internal_type()
            is_pk = field.primary_key
            is_unique = field.unique
            is_null = field.null
            fk_to = f" -> {field.related_model._meta.db_table}({field.target_field.column})" if field.is_relation and field.related_model else ""
            print(f"  - {col_name}: {field_type} (PK={is_pk}, Unique={is_unique}, Null={is_null}){fk_to}")

# Also inspect auth_user
print("\n--- AUTH MODEL ---")
auth_user = apps.get_model('auth', 'User')
print(f"Table: {auth_user._meta.db_table} (Model: User)")
for field in auth_user._meta.fields:
    col_name = field.column
    field_type = field.get_internal_type()
    is_pk = field.primary_key
    is_unique = field.unique
    is_null = field.null
    print(f"  - {col_name}: {field_type} (PK={is_pk}, Unique={is_unique}, Null={is_null})")
