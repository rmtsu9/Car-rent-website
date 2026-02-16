from django.db import models

# user model
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

# model for car
class Car(models.Model):
    name = models.CharField(max_length=100)
    price_per_day = models.IntegerField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

# model for booking
class Booking(models.Model):

    STATUS_CHOICES = (
        ("pending", "รออนุมัติ"),
        ("approved", "อนุมัติแล้ว"),
        ("rejected", "ปฏิเสธ"),
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
    
    @property
    def deposit(self):
        return int(self.total_price * 0.30)

    @property
    def remaining_amount(self):
        return self.total_price - self.deposit

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)


