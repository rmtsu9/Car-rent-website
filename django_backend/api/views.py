import json
import os
import uuid
from datetime import date, datetime, timedelta

from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import Q, Sum
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone
from django.utils.text import get_valid_filename

from .models import Booking, Car, CarImage, Notification, User


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
    "awaiting_deposit": "Confirm 30% deposit paid",
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

    if booking.order_stage in ("awaiting_contact", "awaiting_handover"):
        return None

    action_label = ORDER_STAGE_ACTION_TEXT.get(booking.order_stage)
    if not action_label:
        return None

    return {
        "label": action_label,
        "is_final_payment": booking.order_stage == "awaiting_full_payment",
    }


def _clean_text(value):
    if value is None:
        return ""
    return str(value).strip()


def _to_int(value, field_name, min_value=0, required=True):
    raw = _clean_text(value)
    if raw == "":
        if required:
            return None, f"{field_name} is required"
        return None, None

    try:
        parsed = int(raw)
    except (TypeError, ValueError):
        return None, f"{field_name} must be an integer"

    if parsed < min_value:
        return None, f"{field_name} must be at least {min_value}"

    return parsed, None


def _to_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _parse_payload(request):
    if request.content_type and "application/json" in request.content_type:
        try:
            body = request.body.decode("utf-8") if request.body else "{}"
            return json.loads(body or "{}"), None
        except json.JSONDecodeError:
            return None, JsonResponse(
                {"success": False, "message": "Invalid JSON payload"},
                status=400,
            )

    if request.POST:
        return request.POST.dict(), None

    if request.body:
        try:
            return json.loads(request.body.decode("utf-8")), None
        except json.JSONDecodeError:
            return None, JsonResponse(
                {"success": False, "message": "Invalid payload"},
                status=400,
            )

    return {}, None


def _require_admin_json(request):
    user = request.session.get("user")
    if not user or user.get("role") != "admin":
        return None, JsonResponse({"success": False, "message": "Unauthorized"}, status=401)
    return user, None


def _require_customer_json(request):
    user = request.session.get("user")
    if not user:
        return None, JsonResponse({"success": False, "message": "Unauthorized"}, status=401)
    if user.get("role") == "admin":
        return None, JsonResponse({"success": False, "message": "Forbidden"}, status=403)
    return user, None


def _serialize_user(user):
    return {
        "id": user.id,
        "fullName": user.fullName,
        "phoneNumber": user.phoneNumber,
        "username": user.username,
        "role": user.role,
    }


def _serialize_car_image(image):
    return {
        "id": image.id,
        "image_url": image.image_url,
        "caption": image.caption,
    }


def _serialize_car(car):
    return {
        "id": car.id,
        "name": car.name,
        "price_per_day": car.price_per_day,
        "fuel_type": car.fuel_type,
        "fuel_consumption": car.fuel_consumption,
        "car_type": car.car_type,
        "seat_capacity": car.seat_capacity,
        "engine_cc": car.engine_cc,
        "horsepower": car.horsepower,
        "is_active": car.is_active,
        "images": [_serialize_car_image(image) for image in car.images.all()],
    }


def _format_datetime(value):
    if not value:
        return ""
    return timezone.localtime(value).strftime("%Y-%m-%d %H:%M")


def _serialize_booking(booking):
    return {
        "id": booking.id,
        "customer": {
            "id": booking.user.id,
            "fullName": booking.user.fullName,
            "username": booking.user.username,
            "phoneNumber": booking.user.phoneNumber,
        },
        "car": {
            "id": booking.car.id,
            "name": booking.car.name,
        },
        "start_date": booking.start_date.strftime("%Y-%m-%d"),
        "end_date": booking.end_date.strftime("%Y-%m-%d"),
        "current_province": booking.current_province,
        "destination_province": booking.destination_province,
        "pickup_type": booking.pickup_type,
        "contact_number": booking.contact_number,
        "status": booking.status,
        "order_stage": booking.order_stage,
        "order_stage_display": booking.get_order_stage_display(),
        "total_price": booking.total_price,
        "created_at": _format_datetime(booking.created_at),
        "completed_at": _format_datetime(booking.completed_at),
    }


def _serialize_notification(notification):
    return {
        "id": notification.id,
        "booking_id": notification.booking_id,
        "title": notification.title,
        "message": notification.message,
        "is_read": notification.is_read,
        "created_at": _format_datetime(notification.created_at),
    }


def _create_user_notification(user, booking, title, message):
    if user is None:
        return

    Notification.objects.create(
        user=user,
        booking=booking,
        title=title,
        message=message,
    )


def _apply_booking_search(queryset, keyword):
    query = _clean_text(keyword)
    if not query:
        return queryset

    conditions = (
        Q(user__fullName__icontains=query)
        | Q(user__username__icontains=query)
        | Q(user__phoneNumber__icontains=query)
        | Q(car__name__icontains=query)
        | Q(contact_number__icontains=query)
    )

    if query.isdigit():
        conditions |= Q(id=int(query))

    return queryset.filter(conditions)


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


def model_page(request):
    user = request.session.get("user")
    is_admin = bool(user and user.get("role") == "admin")
    return render(
        request,
        "model.html",
        {
            "user": user,
            "is_admin": is_admin,
        },
    )


# Approve booking view
def approve_booking(request, booking_id):
    user = request.session.get("user")

    if not user or user.get("role") != "admin":
        return HttpResponse("Unauthorized", status=401)

    booking = Booking.objects.filter(id=booking_id).first()
    if booking is None:
        return HttpResponse("Booking not found", status=404)

    booking.status = "approved"
    booking.save(update_fields=["status"])

    return redirect("admin")


# Reject booking view
def reject_booking(request, booking_id):
    user = request.session.get("user")

    if not user or user.get("role") != "admin":
        return HttpResponse("Unauthorized", status=401)

    booking = Booking.objects.filter(id=booking_id).first()
    if booking is None:
        return HttpResponse("Booking not found", status=404)

    booking.status = "rejected"
    booking.save(update_fields=["status"])

    return redirect("admin")


def admin_dashboard_api(request):
    _, error = _require_admin_json(request)
    if error:
        return error

    if request.method != "GET":
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    completed_revenue = (
        Booking.objects.filter(order_stage="completed").aggregate(total=Sum("total_price"))["total"]
        or 0
    )

    data = {
        "total_users": User.objects.filter(role="customer").count(),
        "total_admins": User.objects.filter(role="admin").count(),
        "total_cars": Car.objects.count(),
        "active_cars": Car.objects.filter(is_active=True).count(),
        "total_orders": Booking.objects.count(),
        "incoming_orders": Booking.objects.exclude(order_stage="completed").count(),
        "pending_orders": Booking.objects.filter(status="pending").count(),
        "completed_orders": Booking.objects.filter(order_stage="completed").count(),
        "completed_revenue": completed_revenue,
    }

    return JsonResponse({"success": True, "data": data})


def admin_users_api(request):
    _, error = _require_admin_json(request)
    if error:
        return error

    if request.method == "GET":
        keyword = _clean_text(request.GET.get("q"))
        users = User.objects.filter(role="customer").order_by("-id")
        if keyword:
            users = users.filter(
                Q(fullName__icontains=keyword)
                | Q(username__icontains=keyword)
                | Q(phoneNumber__icontains=keyword)
            )

        return JsonResponse({"success": True, "data": [_serialize_user(user) for user in users]})

    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    payload, payload_error = _parse_payload(request)
    if payload_error:
        return payload_error

    full_name = _clean_text(payload.get("fullName"))
    phone_number = _clean_text(payload.get("phoneNumber"))
    username = _clean_text(payload.get("username"))
    password = _clean_text(payload.get("password"))

    if not full_name or not phone_number or not username or not password:
        return JsonResponse(
            {"success": False, "message": "fullName, phoneNumber, username and password are required"},
            status=400,
        )

    if not phone_number.isdigit() or len(phone_number) != 10:
        return JsonResponse({"success": False, "message": "phoneNumber must be 10 digits"}, status=400)

    if len(password) < 4:
        return JsonResponse({"success": False, "message": "password must be at least 4 characters"}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({"success": False, "message": "username already exists"}, status=400)

    if User.objects.filter(phoneNumber=phone_number).exists():
        return JsonResponse({"success": False, "message": "phoneNumber already exists"}, status=400)

    user = User.objects.create(
        fullName=full_name,
        phoneNumber=phone_number,
        username=username,
        password=password,
        role="customer",
    )

    return JsonResponse({"success": True, "data": _serialize_user(user)})


def admin_user_detail_api(request, user_id):
    _, error = _require_admin_json(request)
    if error:
        return error

    user = User.objects.filter(id=user_id, role="customer").first()
    if user is None:
        return JsonResponse({"success": False, "message": "User not found"}, status=404)

    if request.method == "GET":
        return JsonResponse({"success": True, "data": _serialize_user(user)})

    if request.method in ("PUT", "PATCH"):
        payload, payload_error = _parse_payload(request)
        if payload_error:
            return payload_error

        update_fields = []

        if "fullName" in payload:
            full_name = _clean_text(payload.get("fullName"))
            if not full_name:
                return JsonResponse({"success": False, "message": "fullName is required"}, status=400)
            user.fullName = full_name
            update_fields.append("fullName")

        if "phoneNumber" in payload:
            phone_number = _clean_text(payload.get("phoneNumber"))
            if not phone_number.isdigit() or len(phone_number) != 10:
                return JsonResponse({"success": False, "message": "phoneNumber must be 10 digits"}, status=400)
            if User.objects.filter(phoneNumber=phone_number).exclude(id=user.id).exists():
                return JsonResponse({"success": False, "message": "phoneNumber already exists"}, status=400)
            user.phoneNumber = phone_number
            update_fields.append("phoneNumber")

        if "username" in payload:
            username = _clean_text(payload.get("username"))
            if not username:
                return JsonResponse({"success": False, "message": "username is required"}, status=400)
            if User.objects.filter(username=username).exclude(id=user.id).exists():
                return JsonResponse({"success": False, "message": "username already exists"}, status=400)
            user.username = username
            update_fields.append("username")

        if "password" in payload:
            password = _clean_text(payload.get("password"))
            if password:
                if len(password) < 4:
                    return JsonResponse(
                        {"success": False, "message": "password must be at least 4 characters"},
                        status=400,
                    )
                user.password = password
                update_fields.append("password")

        if not update_fields:
            return JsonResponse({"success": False, "message": "No valid fields to update"}, status=400)

        user.save(update_fields=update_fields)
        return JsonResponse({"success": True, "data": _serialize_user(user)})

    if request.method == "DELETE":
        if Booking.objects.filter(user=user).exists():
            return JsonResponse(
                {
                    "success": False,
                    "message": "Cannot delete this user because there are existing bookings",
                },
                status=400,
            )

        user.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)


def admin_admins_api(request):
    _, error = _require_admin_json(request)
    if error:
        return error

    if request.method == "GET":
        keyword = _clean_text(request.GET.get("q"))
        admins = User.objects.filter(role="admin").order_by("-id")
        if keyword:
            admins = admins.filter(
                Q(fullName__icontains=keyword)
                | Q(username__icontains=keyword)
                | Q(phoneNumber__icontains=keyword)
            )

        return JsonResponse({"success": True, "data": [_serialize_user(admin) for admin in admins]})

    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    payload, payload_error = _parse_payload(request)
    if payload_error:
        return payload_error

    full_name = _clean_text(payload.get("fullName"))
    phone_number = _clean_text(payload.get("phoneNumber"))
    username = _clean_text(payload.get("username"))
    password = _clean_text(payload.get("password"))

    if not full_name or not phone_number or not username or not password:
        return JsonResponse(
            {"success": False, "message": "fullName, phoneNumber, username and password are required"},
            status=400,
        )

    if not phone_number.isdigit() or len(phone_number) != 10:
        return JsonResponse({"success": False, "message": "phoneNumber must be 10 digits"}, status=400)

    if len(password) < 4:
        return JsonResponse({"success": False, "message": "password must be at least 4 characters"}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({"success": False, "message": "username already exists"}, status=400)

    if User.objects.filter(phoneNumber=phone_number).exists():
        return JsonResponse({"success": False, "message": "phoneNumber already exists"}, status=400)

    admin = User.objects.create(
        fullName=full_name,
        phoneNumber=phone_number,
        username=username,
        password=password,
        role="admin",
    )

    return JsonResponse({"success": True, "data": _serialize_user(admin)})


def admin_admin_detail_api(request, user_id):
    current_user, error = _require_admin_json(request)
    if error:
        return error

    admin = User.objects.filter(id=user_id, role="admin").first()
    if admin is None:
        return JsonResponse({"success": False, "message": "Admin not found"}, status=404)

    if request.method == "GET":
        return JsonResponse({"success": True, "data": _serialize_user(admin)})

    if request.method in ("PUT", "PATCH"):
        payload, payload_error = _parse_payload(request)
        if payload_error:
            return payload_error

        update_fields = []

        if "fullName" in payload:
            full_name = _clean_text(payload.get("fullName"))
            if not full_name:
                return JsonResponse({"success": False, "message": "fullName is required"}, status=400)
            admin.fullName = full_name
            update_fields.append("fullName")

        if "phoneNumber" in payload:
            phone_number = _clean_text(payload.get("phoneNumber"))
            if not phone_number.isdigit() or len(phone_number) != 10:
                return JsonResponse({"success": False, "message": "phoneNumber must be 10 digits"}, status=400)
            if User.objects.filter(phoneNumber=phone_number).exclude(id=admin.id).exists():
                return JsonResponse({"success": False, "message": "phoneNumber already exists"}, status=400)
            admin.phoneNumber = phone_number
            update_fields.append("phoneNumber")

        if "username" in payload:
            username = _clean_text(payload.get("username"))
            if not username:
                return JsonResponse({"success": False, "message": "username is required"}, status=400)
            if User.objects.filter(username=username).exclude(id=admin.id).exists():
                return JsonResponse({"success": False, "message": "username already exists"}, status=400)
            admin.username = username
            update_fields.append("username")

        if "password" in payload:
            password = _clean_text(payload.get("password"))
            if password:
                if len(password) < 4:
                    return JsonResponse(
                        {"success": False, "message": "password must be at least 4 characters"},
                        status=400,
                    )
                admin.password = password
                update_fields.append("password")

        if not update_fields:
            return JsonResponse({"success": False, "message": "No valid fields to update"}, status=400)

        admin.save(update_fields=update_fields)

        if current_user.get("id") == admin.id:
            request.session["user"]["fullName"] = admin.fullName
            request.session["user"]["phoneNumber"] = admin.phoneNumber
            request.session["user"]["username"] = admin.username
            request.session.modified = True

        return JsonResponse({"success": True, "data": _serialize_user(admin)})

    if request.method == "DELETE":
        if current_user.get("id") == admin.id:
            return JsonResponse({"success": False, "message": "You cannot delete your own admin account"}, status=400)

        if Booking.objects.filter(user=admin).exists():
            return JsonResponse(
                {
                    "success": False,
                    "message": "Cannot delete this admin because there are existing bookings",
                },
                status=400,
            )

        admin.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)


def public_cars_api(request):
    if request.method != "GET":
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    keyword = _clean_text(request.GET.get("q"))
    cars = Car.objects.filter(is_active=True).prefetch_related("images").order_by("id")

    if keyword:
        cars = cars.filter(
            Q(name__icontains=keyword)
            | Q(car_type__icontains=keyword)
            | Q(fuel_type__icontains=keyword)
        )

    return JsonResponse({"success": True, "data": [_serialize_car(car) for car in cars]})


def admin_cars_api(request):
    _, error = _require_admin_json(request)
    if error:
        return error

    if request.method == "GET":
        keyword = _clean_text(request.GET.get("q"))
        cars = Car.objects.all().prefetch_related("images").order_by("-id")

        if keyword:
            cars = cars.filter(
                Q(name__icontains=keyword)
                | Q(car_type__icontains=keyword)
                | Q(fuel_type__icontains=keyword)
            )

        return JsonResponse({"success": True, "data": [_serialize_car(car) for car in cars]})

    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    payload, payload_error = _parse_payload(request)
    if payload_error:
        return payload_error

    name = _clean_text(payload.get("name"))
    fuel_type = _clean_text(payload.get("fuel_type"))
    fuel_consumption = _clean_text(payload.get("fuel_consumption"))
    car_type = _clean_text(payload.get("car_type"))

    price_per_day, error_message = _to_int(payload.get("price_per_day"), "price_per_day", min_value=0)
    if error_message:
        return JsonResponse({"success": False, "message": error_message}, status=400)

    seat_capacity, error_message = _to_int(payload.get("seat_capacity"), "seat_capacity", min_value=1)
    if error_message:
        return JsonResponse({"success": False, "message": error_message}, status=400)

    engine_cc, error_message = _to_int(payload.get("engine_cc"), "engine_cc", min_value=0)
    if error_message:
        return JsonResponse({"success": False, "message": error_message}, status=400)

    horsepower, error_message = _to_int(payload.get("horsepower"), "horsepower", min_value=0)
    if error_message:
        return JsonResponse({"success": False, "message": error_message}, status=400)

    if not name or not fuel_type or not fuel_consumption or not car_type:
        return JsonResponse(
            {
                "success": False,
                "message": "name, fuel_type, fuel_consumption and car_type are required",
            },
            status=400,
        )

    car = Car.objects.create(
        name=name,
        price_per_day=price_per_day,
        fuel_type=fuel_type,
        fuel_consumption=fuel_consumption,
        car_type=car_type,
        seat_capacity=seat_capacity,
        engine_cc=engine_cc,
        horsepower=horsepower,
        is_active=_to_bool(payload.get("is_active"), default=True),
    )

    raw_images = payload.get("images") or []
    if isinstance(raw_images, list):
        for item in raw_images:
            if isinstance(item, dict):
                image_url = _clean_text(item.get("image_url"))
                caption = _clean_text(item.get("caption"))
            else:
                image_url = _clean_text(item)
                caption = ""

            if image_url:
                CarImage.objects.create(car=car, image_url=image_url, caption=caption)

    car = Car.objects.prefetch_related("images").get(id=car.id)
    return JsonResponse({"success": True, "data": _serialize_car(car)})


def admin_car_detail_api(request, car_id):
    _, error = _require_admin_json(request)
    if error:
        return error

    car = Car.objects.filter(id=car_id).prefetch_related("images").first()
    if car is None:
        return JsonResponse({"success": False, "message": "Car not found"}, status=404)

    if request.method == "GET":
        return JsonResponse({"success": True, "data": _serialize_car(car)})

    if request.method in ("PUT", "PATCH"):
        payload, payload_error = _parse_payload(request)
        if payload_error:
            return payload_error

        update_fields = []

        if "name" in payload:
            name = _clean_text(payload.get("name"))
            if not name:
                return JsonResponse({"success": False, "message": "name is required"}, status=400)
            car.name = name
            update_fields.append("name")

        if "price_per_day" in payload:
            price_per_day, error_message = _to_int(payload.get("price_per_day"), "price_per_day", min_value=0)
            if error_message:
                return JsonResponse({"success": False, "message": error_message}, status=400)
            car.price_per_day = price_per_day
            update_fields.append("price_per_day")

        if "fuel_type" in payload:
            fuel_type = _clean_text(payload.get("fuel_type"))
            if not fuel_type:
                return JsonResponse({"success": False, "message": "fuel_type is required"}, status=400)
            car.fuel_type = fuel_type
            update_fields.append("fuel_type")

        if "fuel_consumption" in payload:
            fuel_consumption = _clean_text(payload.get("fuel_consumption"))
            if not fuel_consumption:
                return JsonResponse({"success": False, "message": "fuel_consumption is required"}, status=400)
            car.fuel_consumption = fuel_consumption
            update_fields.append("fuel_consumption")

        if "car_type" in payload:
            car_type = _clean_text(payload.get("car_type"))
            if not car_type:
                return JsonResponse({"success": False, "message": "car_type is required"}, status=400)
            car.car_type = car_type
            update_fields.append("car_type")

        if "seat_capacity" in payload:
            seat_capacity, error_message = _to_int(payload.get("seat_capacity"), "seat_capacity", min_value=1)
            if error_message:
                return JsonResponse({"success": False, "message": error_message}, status=400)
            car.seat_capacity = seat_capacity
            update_fields.append("seat_capacity")

        if "engine_cc" in payload:
            engine_cc, error_message = _to_int(payload.get("engine_cc"), "engine_cc", min_value=0)
            if error_message:
                return JsonResponse({"success": False, "message": error_message}, status=400)
            car.engine_cc = engine_cc
            update_fields.append("engine_cc")

        if "horsepower" in payload:
            horsepower, error_message = _to_int(payload.get("horsepower"), "horsepower", min_value=0)
            if error_message:
                return JsonResponse({"success": False, "message": error_message}, status=400)
            car.horsepower = horsepower
            update_fields.append("horsepower")

        if "is_active" in payload:
            car.is_active = _to_bool(payload.get("is_active"), default=car.is_active)
            update_fields.append("is_active")

        if not update_fields:
            return JsonResponse({"success": False, "message": "No valid fields to update"}, status=400)

        car.save(update_fields=update_fields)
        car.refresh_from_db()
        return JsonResponse({"success": True, "data": _serialize_car(car)})

    if request.method == "DELETE":
        if Booking.objects.filter(car=car).exists():
            car.is_active = False
            car.save(update_fields=["is_active"])
            return JsonResponse(
                {
                    "success": True,
                    "message": "Car has booking history, so it was deactivated instead of deleted",
                }
            )

        car.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)


def admin_car_images_api(request, car_id):
    _, error = _require_admin_json(request)
    if error:
        return error

    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    car = Car.objects.filter(id=car_id).first()
    if car is None:
        return JsonResponse({"success": False, "message": "Car not found"}, status=404)

    payload, payload_error = _parse_payload(request)
    if payload_error:
        return payload_error

    image_url = _clean_text(payload.get("image_url"))
    caption = _clean_text(payload.get("caption"))

    if not image_url:
        return JsonResponse({"success": False, "message": "image_url is required"}, status=400)

    image = CarImage.objects.create(car=car, image_url=image_url, caption=caption)
    return JsonResponse({"success": True, "data": _serialize_car_image(image)})


def admin_car_image_upload_api(request, car_id):
    _, error = _require_admin_json(request)
    if error:
        return error

    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    car = Car.objects.filter(id=car_id).first()
    if car is None:
        return JsonResponse({"success": False, "message": "Car not found"}, status=404)

    uploaded_file = request.FILES.get("image")
    if uploaded_file is None:
        return JsonResponse({"success": False, "message": "image file is required"}, status=400)

    if uploaded_file.size > 10 * 1024 * 1024:
        return JsonResponse({"success": False, "message": "Image size must not exceed 10 MB"}, status=400)

    content_type = (uploaded_file.content_type or "").lower()
    if content_type and not content_type.startswith("image/"):
        return JsonResponse({"success": False, "message": "Uploaded file must be an image"}, status=400)

    safe_name = get_valid_filename(uploaded_file.name or "upload")
    ext = os.path.splitext(safe_name)[1].lower()

    if not ext:
        ext_map = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
            "image/bmp": ".bmp",
        }
        ext = ext_map.get(content_type, ".jpg")

    allowed_ext = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
    if ext not in allowed_ext:
        return JsonResponse({"success": False, "message": "Unsupported image type"}, status=400)

    file_name = f"car_images/{uuid.uuid4().hex}{ext}"
    stored_path = default_storage.save(file_name, uploaded_file)
    image_url = default_storage.url(stored_path)

    caption = _clean_text(request.POST.get("caption"))
    image = CarImage.objects.create(car=car, image_url=image_url, caption=caption)

    return JsonResponse({"success": True, "data": _serialize_car_image(image)})


def admin_car_image_detail_api(request, car_id, image_id):
    _, error = _require_admin_json(request)
    if error:
        return error

    image = CarImage.objects.filter(id=image_id, car_id=car_id).first()
    if image is None:
        return JsonResponse({"success": False, "message": "Car image not found"}, status=404)

    if request.method in ("PUT", "PATCH"):
        payload, payload_error = _parse_payload(request)
        if payload_error:
            return payload_error

        update_fields = []

        if "image_url" in payload:
            image_url = _clean_text(payload.get("image_url"))
            if not image_url:
                return JsonResponse({"success": False, "message": "image_url is required"}, status=400)
            image.image_url = image_url
            update_fields.append("image_url")

        if "caption" in payload:
            image.caption = _clean_text(payload.get("caption"))
            update_fields.append("caption")

        if not update_fields:
            return JsonResponse({"success": False, "message": "No valid fields to update"}, status=400)

        image.save(update_fields=update_fields)
        return JsonResponse({"success": True, "data": _serialize_car_image(image)})

    if request.method == "DELETE":
        if image.image_url and settings.MEDIA_URL and image.image_url.startswith(settings.MEDIA_URL):
            relative_path = image.image_url[len(settings.MEDIA_URL):]
            if relative_path and default_storage.exists(relative_path):
                default_storage.delete(relative_path)
        image.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)


def admin_order_stage_approve_api(request, booking_id):
    _, error = _require_admin_json(request)
    if error:
        return error

    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    booking = Booking.objects.select_related("user", "car").filter(id=booking_id).first()
    if booking is None:
        return JsonResponse({"success": False, "message": "Order not found"}, status=404)

    if booking.status == "rejected":
        return JsonResponse({"success": False, "message": "This order is rejected"}, status=400)

    if booking.order_stage == "completed":
        return JsonResponse({"success": False, "message": "This order is already completed"}, status=400)

    message = ""
    update_fields = []

    if booking.order_stage == "awaiting_contact":
        booking.order_stage = "awaiting_deposit"
        update_fields.append("order_stage")
        if booking.status != "approved":
            booking.status = "approved"
            update_fields.append("status")
        _create_user_notification(
            user=booking.user,
            booking=booking,
            title=f"Order #{booking.id}: Callback approved",
            message="Admin approved callback confirmation. You can now pay 30% deposit.",
        )
        message = "Callback approved. Customer can proceed to 30% deposit."
    elif booking.order_stage == "awaiting_handover":
        booking.order_stage = "awaiting_full_payment"
        update_fields.append("order_stage")
        _create_user_notification(
            user=booking.user,
            booking=booking,
            title=f"Order #{booking.id}: Pickup/Delivery approved",
            message="Admin confirmed pickup or delivery. You can now pay the full amount.",
        )
        message = "Pickup/delivery confirmed. Customer can proceed to full payment."
    else:
        return JsonResponse(
            {
                "success": False,
                "message": "This stage does not require admin approval",
            },
            status=400,
        )

    booking.save(update_fields=update_fields)
    booking.refresh_from_db()

    return JsonResponse(
        {
            "success": True,
            "message": message,
            "data": _serialize_booking(booking),
        }
    )


def admin_orders_api(request):
    _, error = _require_admin_json(request)
    if error:
        return error

    if request.method != "GET":
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    bookings = Booking.objects.select_related("user", "car").exclude(order_stage="completed").order_by("-created_at")

    status = _clean_text(request.GET.get("status"))
    stage = _clean_text(request.GET.get("stage"))

    if status:
        bookings = bookings.filter(status=status)

    if stage:
        bookings = bookings.filter(order_stage=stage)

    bookings = _apply_booking_search(bookings, request.GET.get("q"))

    return JsonResponse({"success": True, "data": [_serialize_booking(booking) for booking in bookings]})


def admin_history_api(request):
    _, error = _require_admin_json(request)
    if error:
        return error

    if request.method != "GET":
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    bookings = Booking.objects.select_related("user", "car").filter(order_stage="completed").order_by("-completed_at", "-created_at")
    bookings = _apply_booking_search(bookings, request.GET.get("q"))

    return JsonResponse({"success": True, "data": [_serialize_booking(booking) for booking in bookings]})


def user_notifications_api(request):
    user_session, error = _require_customer_json(request)
    if error:
        return error

    if request.method != "GET":
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    limit = request.GET.get("limit", "20")
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        limit = 20

    limit = max(1, min(limit, 50))
    queryset = Notification.objects.filter(user_id=user_session["id"]).select_related("booking")
    notifications = list(queryset[:limit])
    unread_count = queryset.filter(is_read=False).count()

    return JsonResponse(
        {
            "success": True,
            "data": {
                "notifications": [_serialize_notification(item) for item in notifications],
                "unread_count": unread_count,
            },
        }
    )


def user_notifications_mark_read_api(request):
    user_session, error = _require_customer_json(request)
    if error:
        return error

    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed"}, status=405)

    payload, payload_error = _parse_payload(request)
    if payload_error:
        return payload_error

    ids = payload.get("ids") or []
    if not isinstance(ids, list):
        return JsonResponse({"success": False, "message": "ids must be an array"}, status=400)

    notification_ids = []
    for item in ids:
        raw = _clean_text(item)
        if raw.isdigit():
            notification_ids.append(int(raw))

    if not notification_ids:
        return JsonResponse({"success": True, "data": {"updated": 0}})

    updated = Notification.objects.filter(
        user_id=user_session["id"],
        id__in=notification_ids,
        is_read=False,
    ).update(is_read=True)

    return JsonResponse({"success": True, "data": {"updated": updated}})


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

    if booking.order_stage in ("awaiting_contact", "awaiting_handover"):
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

