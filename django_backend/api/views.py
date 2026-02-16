from datetime import date, datetime, timedelta

from django.db.models import Q
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect, render

from .models import Booking, Car, User


BOOKING_BLOCKING_STATUSES = ["pending", "approved"]


def _has_overlapping_booking(car, start_date, end_date):
    return Booking.objects.filter(
        car=car,
        status__in=BOOKING_BLOCKING_STATUSES,
    ).filter(
        Q(start_date__lte=end_date) & Q(end_date__gte=start_date)
    ).exists()


# Index view
def index(request):
    return render(request, "index.html")


# Login view
def login(request):
    if request.method == "POST":
        identifier = request.POST.get("username", "")
        password = request.POST.get("password", "")

        if identifier.isdigit():
            user = User.objects.filter(phoneNumber=identifier).first()
        else:
            user = User.objects.filter(username=identifier).first()

        if user and user.password == password:
            request.session["user"] = {
                "id": user.id,
                "fullName": user.fullName,
                "phoneNumber": user.phoneNumber,
                "username": user.username,
                "role": user.role,
            }
            request.session.set_expiry(86400)  # 24 hours

            if user.role == "admin":
                return redirect("admin")
            return redirect("booking")

        return HttpResponse("User not found or password is incorrect")

    return render(request, "login.html")


# Signup view
def signup(request):
    if request.method == "POST":
        fullname = request.POST.get("fullName")
        phone_number = request.POST.get("phoneNumber")
        username = request.POST.get("username")
        password = request.POST.get("password")

        User.objects.create(
            fullName=fullname,
            phoneNumber=phone_number,
            username=username,
            password=password,
            role="customer",
        )
        return redirect("login")

    return render(request, "signup.html")


# Admin view
def admin_page(request):
    user = request.session.get("user")

    if not user:
        return redirect("login")

    if user.get("role") != "admin":
        return HttpResponse("Unauthorized", status=401)

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
def reject_booking(request, booking_id):
    user = request.session.get("user")

    if not user or user.get("role") != "admin":
        return HttpResponse("Unauthorized", status=401)

    booking = Booking.objects.get(id=booking_id)
    booking.status = "rejected"
    booking.save()

    return redirect("admin")


# Booking page + create booking
def booking(request):
    user_session = request.session.get("user")
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
        contact_number = request.POST.get("contact_number")

        if not all(
            [
                car_id,
                start_date_str,
                end_date_str,
                pickup_type,
                current_province,
                destination_province,
                contact_number,
            ]
        ):
            return HttpResponse("Please fill all required fields")

        if pickup_type not in ("self", "delivery"):
            return HttpResponse("Invalid pickup type")

        if not contact_number.isdigit() or len(contact_number) != 10:
            return HttpResponse("Please provide a 10-digit contact number")

        try:
            user = User.objects.get(id=user_session["id"])
            car = Car.objects.get(id=car_id, is_active=True)
        except (User.DoesNotExist, Car.DoesNotExist):
            return HttpResponse("User or selected car not found")

        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        except ValueError:
            return HttpResponse("Invalid date format")

        if start_date <= date.today():
            return HttpResponse("Booking must be at least 1 day in advance")

        if end_date < start_date:
            return HttpResponse("End date must be greater than or equal to start date")

        if _has_overlapping_booking(car, start_date, end_date):
            return HttpResponse("This car is already booked for the selected dates")

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
            contact_number=contact_number,
            status="pending",
        )

        return redirect("order")

    cars = Car.objects.filter(is_active=True).order_by("id")
    return render(
        request,
        "Booking.html",
        {
            "cars": cars,
            "tomorrow": tomorrow,
        },
    )


# API for availability by date range
def booking_availability(request):
    user_session = request.session.get("user")
    if not user_session:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    start_date_str = request.GET.get("start_date")
    end_date_str = request.GET.get("end_date")

    if not start_date_str or not end_date_str:
        return JsonResponse({"error": "Missing start_date or end_date"}, status=400)

    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"error": "Invalid date format, expected YYYY-MM-DD"}, status=400)

    if start_date <= date.today():
        return JsonResponse({"error": "Booking must start at least 1 day in advance"}, status=400)

    if end_date < start_date:
        return JsonResponse({"error": "end_date must be greater than or equal to start_date"}, status=400)

    cars = list(Car.objects.filter(is_active=True).order_by("id"))
    overlapping_car_ids = set(
        Booking.objects.filter(
            status__in=BOOKING_BLOCKING_STATUSES,
            start_date__lte=end_date,
            end_date__gte=start_date,
            car__in=cars,
        ).values_list("car_id", flat=True)
    )

    payload = []
    for car in cars:
        payload.append(
            {
                "id": car.id,
                "name": car.name,
                "price_per_day": car.price_per_day,
                "is_available": car.id not in overlapping_car_ids,
            }
        )

    return JsonResponse(
        {
            "start_date": start_date_str,
            "end_date": end_date_str,
            "days": (end_date - start_date).days + 1,
            "cars": payload,
        }
    )


# History view
def history(request):
    user = request.session.get("user")

    if not user:
        return redirect("login")

    return render(request, "history.html", {"user": user})


# Order view
def order(request):
    user_session = request.session.get("user")

    if not user_session:
        return redirect("login")

    bookings = (
        Booking.objects.filter(user_id=user_session["id"])
        .select_related("car")
        .order_by("-created_at")
    )

    return render(request, "order.html", {"bookings": bookings})


# Profile view
def profile(request):
    user = request.session.get("user")

    if not user:
        return redirect("login")

    return render(request, "profile.html", {"user": user})


# Logout
def logout(request):
    if "user" in request.session:
        del request.session["user"]
    return redirect("login")
