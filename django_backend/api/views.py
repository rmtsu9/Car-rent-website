
from django.http import HttpResponse
from django.shortcuts import render
from .models import Booking, Car, User
from django.shortcuts import redirect
from datetime import datetime, date, timedelta
from django.db.models import Q
from datetime import date, timedelta

# Index view
def index(request):
    return render(request, 'index.html')

# Login view
def login(request):
    if request.method == "POST":
        identifier = request.POST.get("username")
        password = request.POST.get("password")

        if identifier.isdigit():
            user = User.objects.filter(phoneNumber=identifier).first()
        else:
            user = User.objects.filter(username=identifier).first()

        if user and user.password == password:

            request.session['user'] = {
                "id": user.id,
                "fullName": user.fullName,
                "phoneNumber": user.phoneNumber,
                "username": user.username,
                "role": user.role
            }

            if user.role == "admin":
                return redirect("admin")
            else:
                return redirect("booking")

        else:
            return HttpResponse("ไม่พบผู้ใช้")

    return render(request, "login.html")

# Signup view
def signup(request):

    if request.method == "POST":
        fullname = request.POST.get("fullName")
        phoneNumber = request.POST.get("phoneNumber")
        username = request.POST.get("username")
        password = request.POST.get("password")

        User.objects.create(
            fullName=fullname,
            phoneNumber=phoneNumber,
            username=username,
            password=password,
            role="customer"
        )
        return redirect("login")

    return render(request, "signup.html")

# Admin view
def admin_page(request):
    user = request.session.get('user')

    # not login
    if not user:
        return redirect("login")

    # Fales admin
    if user.get("role") != "admin":
        return HttpResponse("Unauthorized", status=401)

    # True admin 
    return render(request, "admin.html", {"user": user})

# Approve booking view
def approve_booking(request, booking_id):
    user = request.session.get("user")

    if not user or user.get("role") != "admin":
        return HttpResponse("Unauthorized", status=401)

    booking = Booking.objects.get(id=booking_id)
    booking.status = "approved"
    booking.save()

    return redirect("admin")

# Reject booking view
def booking(request):
    user_session = request.session.get('user')
    tomorrow = date.today() + timedelta(days=1)

    if not user_session:
        return redirect("login")

    if request.method == "POST":
        car_id = request.POST.get("car_id")
        start_date_str = request.POST.get("start_date")
        end_date_str = request.POST.get("end_date")
        pickup_type = request.POST.get("pickup_type")
        current_province = request.POST.get("current_province")
        destination_province = request.POST.get("destination_province")

        user = User.objects.get(id=user_session["id"])
        car = Car.objects.get(id=car_id)

        # 🔥 แปลง string → date ก่อน
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()

        # 🔥 1. ต้องจองล่วงหน้าอย่างน้อย 1 วัน
        if start_date <= date.today():
            return HttpResponse("ต้องจองล่วงหน้าอย่างน้อย 1 วัน")

        # 🔥 2. วันคืนต้องมากกว่าวันรับ
        if end_date < start_date:
            return HttpResponse("วันคืนรถต้องมากกว่าวันรับรถ")

        # 🔥 3. เช็ควันซ้อน
        overlapping = Booking.objects.filter(
            car=car,
            status="approved"
        ).filter(
            Q(start_date__lte=end_date) &
            Q(end_date__gte=start_date)
        ).exists()

        if overlapping:
            return HttpResponse("รถคันนี้ถูกจองในช่วงเวลานี้แล้ว")

        # 🔥 คำนวณราคารวม
        total_days = (end_date - start_date).days + 1
        total_price = car.price_per_day * total_days

        Booking.objects.create(
            user=user,
            car=car,
            start_date=start_date,
            end_date=end_date,
            current_province=current_province,
            destination_province=destination_province,
            pickup_type=pickup_type,
            total_price=total_price,
            status="pending"
        )

        return redirect("order")
    
    cars = Car.objects.filter(is_active=True)
    return render(request, "Booking.html", {
            "cars": cars,
            "tomorrow": tomorrow
        })


# History view
def history(request):
    user = request.session.get('user')

    # not login
    if not user:
        return redirect("login")

    return render(request, "history.html", {"user": user})

# Order view
def order(request):
    user_session = request.session.get('user')

    if not user_session:
        return redirect("login")

    bookings = Booking.objects.filter(user_id=user_session["id"])

    return render(request, "order.html", {"bookings": bookings})

# Profile view
def profile(request):
    user = request.session.get('user')

    # not login
    if not user:
        return redirect("login")

    return render(request, "profile.html", {"user": user})

