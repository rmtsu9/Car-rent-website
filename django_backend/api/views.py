from datetime import date, datetime, timedelta

from django.db.models import Q
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone

from .models import Booking, Car, User


BOOKING_BLOCKING_STATUSES = ["pending", "approved"]
ORDER_STAGE_FLOW = [
    ("awaiting_contact", "1. Waiting for callback"),
    ("awaiting_deposit", "2. Pay 30% deposit"),
    ("awaiting_handover", "3. Waiting for pickup or delivery"),
    ("awaiting_full_payment", "4. Pay full amount"),
]
ORDER_STAGE_NEXT = {
    "awaiting_contact": "awaiting_deposit",
    "awaiting_deposit": "awaiting_handover",
    "awaiting_handover": "awaiting_full_payment",
    "awaiting_full_payment": "completed",
}
ORDER_STAGE_ACTION_TEXT = {
    "awaiting_contact": "Mark callback as completed",
    "awaiting_deposit": "Confirm 30% deposit paid",
    "awaiting_handover": "Confirm pickup/delivery completed",
    "awaiting_full_payment": "Confirm full payment and move to History",
}


def _has_overlapping_booking(car, start_date, end_date):
    return Booking.objects.filter(
        car=car,
        status__in=BOOKING_BLOCKING_STATUSES,
    ).filter(
        Q(start_date__lte=end_date) & Q(end_date__gte=start_date)
    ).exists()


def _build_order_progress(order_stage):
    stage_order = [code for code, _ in ORDER_STAGE_FLOW]
    current_index = stage_order.index(order_stage) + 1 if order_stage in stage_order else 1

    progress = []
    for step_index, (_, title) in enumerate(ORDER_STAGE_FLOW, start=1):
        if order_stage == "completed":
            step_status = "completed"
        elif step_index < current_index:
            step_status = "completed"
        elif step_index == current_index:
            step_status = "active"
        else:
            step_status = "pending"

        progress.append(
            {
                "index": step_index,
                "title": title,
                "status": step_status,
            }
        )

    return progress


def _get_stage_action(booking):
    if not booking:
        return None

    if booking.status == "rejected":
        return None

    action_label = ORDER_STAGE_ACTION_TEXT.get(booking.order_stage)
    if not action_label:
        return None

    return {
        "label": action_label,
        "is_final_payment": booking.order_stage == "awaiting_full_payment",
    }


# Index view
def index(request):
    return render(request, "index.html")


# Login view
def login(request):
    if request.method == "POST":
        identifier = (request.POST.get("username") or "").strip()
        password = (request.POST.get("password") or "").strip()

        if not identifier or not password:
            return render(
                request,
                "Login.html",
                {
                    "error": "Please enter username or phone number and password.",
                    "identifier": identifier,
                },
            )

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

        return render(
            request,
            "Login.html",
            {
                "error": "Invalid username/phone number or password.",
                "identifier": identifier,
            },
        )

    registered = request.GET.get("registered") == "1"
    return render(request, "Login.html", {"registered": registered})


# Signup view
def signup(request):
    if request.method == "POST":
        fullname = (request.POST.get("fullName") or "").strip()
        phone_number = (request.POST.get("phoneNumber") or "").strip()
        username = (request.POST.get("username") or "").strip()
        password = (request.POST.get("password") or "").strip()

        form_data = {
            "fullName": fullname,
            "phoneNumber": phone_number,
            "username": username,
        }

        if not fullname or not phone_number or not username or not password:
            return render(
                request,
                "signup.html",
                {
                    "error": "Please fill all required fields.",
                    "form_data": form_data,
                },
            )

        if not phone_number.isdigit() or len(phone_number) != 10:
            return render(
                request,
                "signup.html",
                {
                    "error": "Phone number must be exactly 10 digits.",
                    "form_data": form_data,
                },
            )

        if len(password) < 4:
            return render(
                request,
                "signup.html",
                {
                    "error": "Password must be at least 4 characters.",
                    "form_data": form_data,
                },
            )

        if User.objects.filter(username=username).exists():
            return render(
                request,
                "signup.html",
                {
                    "error": "This username is already in use.",
                    "form_data": form_data,
                },
            )

        if User.objects.filter(phoneNumber=phone_number).exists():
            return render(
                request,
                "signup.html",
                {
                    "error": "This phone number is already in use.",
                    "form_data": form_data,
                },
            )

        User.objects.create(
            fullName=fullname,
            phoneNumber=phone_number,
            username=username,
            password=password,
            role="customer",
        )
        return redirect(f"{reverse('login')}?registered=1")

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
    booking.save(update_fields=["status"])

    return redirect("admin")


# Reject booking view
def reject_booking(request, booking_id):
    user = request.session.get("user")

    if not user or user.get("role") != "admin":
        return HttpResponse("Unauthorized", status=401)

    booking = Booking.objects.get(id=booking_id)
    booking.status = "rejected"
    booking.save(update_fields=["status"])

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

        new_booking = Booking.objects.create(
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
            order_stage="awaiting_contact",
        )

        return redirect(f"{reverse('order')}?booking_id={new_booking.id}")

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

    history_bookings = (
        Booking.objects.filter(user_id=user["id"], order_stage="completed")
        .select_related("car")
        .order_by("-completed_at", "-created_at")
    )

    return render(
        request,
        "History.html",
        {
            "user": user,
            "history_bookings": history_bookings,
        },
    )


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

    booking_id = request.GET.get("booking_id", "")
    selected_booking = None
    if booking_id.isdigit():
        selected_booking = bookings.filter(id=int(booking_id)).first()

    if selected_booking is None:
        selected_booking = bookings.first()

    selected_progress = _build_order_progress(selected_booking.order_stage) if selected_booking else []
    stage_action = _get_stage_action(selected_booking)

    return render(
        request,
        "Order.html",
        {
            "bookings": bookings,
            "selected_booking": selected_booking,
            "selected_progress": selected_progress,
            "selected_stage_action": stage_action,
        },
    )


# Advance order stage
def advance_order_stage(request, booking_id):
    user_session = request.session.get("user")
    if not user_session:
        return redirect("login")

    if request.method != "POST":
        return HttpResponse("Method not allowed", status=405)

    booking = Booking.objects.filter(id=booking_id, user_id=user_session["id"]).first()
    if booking is None:
        return HttpResponse("Order not found", status=404)

    if booking.status == "rejected":
        return redirect(f"{reverse('order')}?booking_id={booking.id}")

    next_stage = ORDER_STAGE_NEXT.get(booking.order_stage)
    if not next_stage:
        return redirect(f"{reverse('order')}?booking_id={booking.id}")

    booking.order_stage = next_stage

    update_fields = ["order_stage"]
    if next_stage == "completed":
        booking.completed_at = timezone.now()
        update_fields.append("completed_at")
        if booking.status != "rejected":
            booking.status = "approved"
            update_fields.append("status")

    booking.save(update_fields=update_fields)
    return redirect(f"{reverse('order')}?booking_id={booking.id}")


# Profile view
def profile(request):
    user_session = request.session.get("user")

    if not user_session:
        return redirect("login")

    user = User.objects.filter(id=user_session["id"]).first()
    if user is None:
        return redirect("logout")

    return render(request, "Profile.html", {"user": user})


def profile_update_phone(request):
    user_session = request.session.get("user")
    if not user_session:
        return JsonResponse({"success": False, "message": "Unauthorized"}, status=401)

    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    phone_number = (request.POST.get("phone_number") or "").strip()

    if not phone_number.isdigit() or len(phone_number) != 10:
        return JsonResponse(
            {"success": False, "message": "Phone number must be 10 digits"},
            status=400,
        )

    user = User.objects.filter(id=user_session["id"]).first()
    if user is None:
        return JsonResponse({"success": False, "message": "User not found"}, status=404)

    if (
        User.objects.filter(phoneNumber=phone_number)
        .exclude(id=user.id)
        .exists()
    ):
        return JsonResponse(
            {"success": False, "message": "This phone number is already in use"},
            status=400,
        )

    user.phoneNumber = phone_number
    user.save(update_fields=["phoneNumber"])

    request.session["user"]["phoneNumber"] = phone_number
    request.session.modified = True

    return JsonResponse({"success": True, "message": "Phone number updated"})


def profile_change_password(request):
    user_session = request.session.get("user")
    if not user_session:
        return JsonResponse({"success": False, "message": "Unauthorized"}, status=401)

    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    current_password = request.POST.get("current_password") or ""
    new_password = request.POST.get("new_password") or ""
    confirm_password = request.POST.get("confirm_password") or ""

    if not current_password or not new_password or not confirm_password:
        return JsonResponse(
            {"success": False, "message": "Please fill all password fields"},
            status=400,
        )

    if len(new_password) < 4:
        return JsonResponse(
            {"success": False, "message": "New password must be at least 4 characters"},
            status=400,
        )

    if new_password != confirm_password:
        return JsonResponse(
            {"success": False, "message": "New password and confirm password do not match"},
            status=400,
        )

    user = User.objects.filter(id=user_session["id"]).first()
    if user is None:
        return JsonResponse({"success": False, "message": "User not found"}, status=404)

    if user.password != current_password:
        return JsonResponse(
            {"success": False, "message": "Current password is incorrect"},
            status=400,
        )

    user.password = new_password
    user.save(update_fields=["password"])

    return JsonResponse({"success": True, "message": "Password updated"})


# Logout
def logout(request):
    if "user" in request.session:
        del request.session["user"]
    return redirect("login")
