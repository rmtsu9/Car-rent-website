import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="car",
            name="car_type",
            field=models.CharField(default="", max_length=50),
        ),
        migrations.AddField(
            model_name="car",
            name="engine_cc",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="car",
            name="fuel_consumption",
            field=models.CharField(default="", max_length=50),
        ),
        migrations.AddField(
            model_name="car",
            name="fuel_type",
            field=models.CharField(default="", max_length=50),
        ),
        migrations.AddField(
            model_name="car",
            name="horsepower",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="car",
            name="seat_capacity",
            field=models.PositiveSmallIntegerField(default=4),
        ),
        migrations.CreateModel(
            name="CarImage",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image_url", models.CharField(max_length=500)),
                ("caption", models.CharField(blank=True, default="", max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("car", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="images", to="api.car")),
            ],
        ),
    ]
