from django.db import models


class User(models.Model):
    ROLE_CHOICES = (
        ("admin", "Admin"),
        ("customer", "Customer"),
    )

    fullName = models.CharField(max_length=100)
    phoneNumber = models.CharField(max_length=15, unique=True)
    username = models.CharField(max_length=50, unique=True)
    password = models.CharField(max_length=255)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="customer")

    def __str__(self):
        return self.username


class Car(models.Model):
    name = models.CharField(max_length=100)
    price_per_day = models.IntegerField()
    fuel_type = models.CharField(max_length=50, default="")
    fuel_consumption = models.CharField(max_length=50, default="")
    car_type = models.CharField(max_length=50, default="")
    seat_capacity = models.PositiveSmallIntegerField(default=4)
    engine_cc = models.PositiveIntegerField(default=0)
    horsepower = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class CarImage(models.Model):
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="images")
    image_url = models.CharField(max_length=500)
    caption = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.car.name} image #{self.id}"


class Booking(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    )

    ORDER_STAGE_CHOICES = (
        ("awaiting_contact", "Waiting for callback"),
        ("awaiting_deposit", "Pay 30% deposit"),
        ("awaiting_handover", "Waiting for pickup or delivery"),
        ("awaiting_full_payment", "Pay full amount"),
        ("completed", "Completed"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    car = models.ForeignKey(Car, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    current_province = models.CharField(max_length=100)
    destination_province = models.CharField(max_length=100)
    pickup_type = models.CharField(max_length=20)
    total_price = models.IntegerField(default=0)
    contact_number = models.CharField(max_length=15)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    order_stage = models.CharField(max_length=30, choices=ORDER_STAGE_CHOICES, default="awaiting_contact")
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def deposit(self):
        return int(self.total_price * 0.30)

    @property
    def remaining_amount(self):
        return self.total_price - self.deposit


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=120)
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"Notification #{self.id} for {self.user.username}"
