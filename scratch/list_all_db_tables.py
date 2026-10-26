import os
import sys
import django

sys.path.insert(0, r"c:\Users\acer\OneDrive\Desktop\projects\waste-management-system\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from django.db import connection

cursor = connection.cursor()
tables = sorted(connection.introspection.table_names())

print(f"Total tables: {len(tables)}\n")
for t in tables:
    cursor.execute(f'SELECT COUNT(*) FROM "{t}"')
    cnt = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM information_schema.columns WHERE table_name = %s', [t])
    col_cnt = cursor.fetchone()[0]
    print(f"{t:35} | Columns: {col_cnt:2} | Records: {cnt}")
