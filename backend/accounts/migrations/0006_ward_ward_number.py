# Generated for Ward Management integration
from django.db import migrations, models

def populate_ward_numbers(apps, schema_editor):
    Ward = apps.get_model('accounts', 'Ward')
    for ward in Ward.objects.all():
        if ward.ward_number is None:
            ward.ward_number = ward.ward_id
        # Clear default placeholder labels if ward_name is 'Ward <number>' or 'Test Ward <number>'
        if ward.ward_name in [f"Ward {ward.ward_id}", f"Ward {ward.ward_number}", "Test Ward 1", "Test Ward 2"]:
            ward.ward_name = ""
        ward.save()

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_alter_userprofile_ward'),
    ]

    operations = [
        migrations.AddField(
            model_name='ward',
            name='ward_number',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='ward',
            name='ward_name',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AlterField(
            model_name='ward',
            name='location',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.RunPython(
            populate_ward_numbers,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='ward',
            name='ward_number',
            field=models.PositiveIntegerField(blank=True, null=True, unique=True),
        ),
    ]
