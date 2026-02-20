# TripCraft Car Rent (Django + PostgreSQL)

Car rental web application with public browsing, customer booking flow, admin dashboard, order-stage approvals, notifications, and map-based delivery pin.

## Latest Update (2026-02-20)
- Booking province list expanded for all provinces in `Central`, `North`, and `Northeast`.
- Model page now supports client-side filter + sorting:
  - Search by name/type/fuel
  - Filter by `Fuel Type`, `Type`, `Seat`
  - Sort by `Price per day`, `Fuel Type`, `Type`, `Seat`
- `Open map` now supports both pickup types:
  - `Self Pickup` -> shop location map
  - `Delivery` -> customer pinned location map
- Cancel flow is complete on both sides:
  - Customer can cancel from Order page
  - Admin can cancel from Incoming Orders
  - Cancelled orders move to History
- Notifications improved:
  - Real-time toast + popup notification on Order page
  - Notifications linked to `completed/rejected` orders are auto-removed
- Navigation consistency:
  - `Back to Booking` button style is now aligned across Profile/Order/History

## Highlights
- Public pages without login: `Index`, `Model`
- Role-based access for admin operations
- Customer flow: signup, login, booking, order tracking, history, profile update
- Admin flow: manage users/admins/cars, approve required order stages, view history
- Car management supports image URL and direct image import from device
- Map integration with Leaflet.js + OpenStreetMap (no Google Maps API key required)
- `Open map` is available for both `Self Pickup` and `Delivery` orders
- Model page supports search, filter, and sorting

## Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Django 5.x
- Database: PostgreSQL
- Map: Leaflet.js (bundled in project static) + OpenStreetMap tiles

## Architecture
`HTML -> JavaScript -> Django -> PostgreSQL`

## Access Model
- Public:
  - `/api/` (home)
  - `/api/model/` (car list in public mode)
- Customer session required:
  - `/api/booking/`
  - `/api/order/`
  - `/api/history/`
  - `/api/profile/`
- Admin role required:
  - `/api/admin/`
  - `/api/admin/api/*`

## Order Stage Flow
1. `Waiting for callback` (admin approval required)
2. `Pay 30% deposit` (customer confirms)
3. `Waiting for pickup or delivery` (admin approval required)
4. `Pay full amount` (customer confirms, then order moves to History)

Notifications are auto-created for customer when admin approves stage 1 and stage 3.

Order can be cancelled by customer or admin before completion. Completed and cancelled orders are stored in History.

## Project Structure
```text
Car-rent-website/
|- README.md
|- requirements.txt
|- SQLrequirements.txt
`- django_backend/
   |- manage.py
   |- backend/
   |  |- settings.py
   |  `- urls.py
   |- api/
   |  |- models.py
   |  |- views.py
   |  |- urls.py
   |  |- migrations/
   |  `- templates/
   `- media/
```

## Prerequisites
- Python 3.10+
- PostgreSQL 13+
- `psql` CLI recommended

## Install PostgreSQL (Windows)
1. Download installer from `https://www.postgresql.org/download/windows/`
2. Install PostgreSQL with Command Line Tools (`psql`)
3. Keep the superuser password for account `postgres`
4. Verify installation:
```powershell
psql --version
```

## Quick Start (Windows / PowerShell)
1. Clone and enter project
```powershell
git clone <your-repo-url>
cd Car-rent-website
```

2. Create virtual environment
```powershell
cd django_backend
python -m venv .venv
.\.venv\Scripts\Activate
```

3. Install dependencies
```powershell
python -m pip install --upgrade pip
pip install -r ..\requirements.txt
```

4. Bootstrap PostgreSQL (create DB user + DB)
```powershell
psql -U postgres -h localhost -f ..\SQLrequirements.txt
```

5. Configure database in `django_backend/backend/settings.py`
```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "car_rent",
        "USER": "car_rent_user",
        "PASSWORD": "car_rent_pass",
        "HOST": "localhost",
        "PORT": "5432",
    }
}
```

6. Run migrations
```powershell
python manage.py migrate
python manage.py check
```

7. Seed demo users/admin/cars (run SQL script again after migrations)
```powershell
psql -U postgres -h localhost -f ..\SQLrequirements.txt
```

8. Run server
```powershell
python manage.py runserver
```

## Main URLs
- `http://127.0.0.1:8000/` -> redirects to `/api/`
- `http://127.0.0.1:8000/logout/` -> redirects to `/api/logout/`
- `http://127.0.0.1:8000/api/` -> Home
- `http://127.0.0.1:8000/api/model/` -> Public model page
- `http://127.0.0.1:8000/api/login/` -> Login
- `http://127.0.0.1:8000/api/admin/` -> Admin dashboard

## Demo Credentials
- Admin:
  - Username: `admin`
  - Password: `pass`
- Customer:
  - Username: `demo`
  - Password: `pass`

## Shop Location and Map Config
Shop location for `Self Pickup` comes from these settings:
- `SHOP_NAME`
- `SHOP_ADDRESS`
- `SHOP_LAT`
- `SHOP_LNG`

Default location is configured in `django_backend/backend/settings.py`.

You can override at runtime:
```powershell
$env:SHOP_NAME="TripCraft Car Rent Pickup Center"
$env:SHOP_ADDRESS="123 Example Road, Bangkok 10110"
$env:SHOP_LAT="13.7563"
$env:SHOP_LNG="100.5018"
python manage.py runserver
```

## Province Coverage (Booking Step 2)
Both fields below now include all provinces in:
- `Central`
- `North`
- `Northeast`

Fields:
- `Current Province (pickup point)`
- `Destination Province`

## Car Data Rules
Admin Car Form now enforces fixed values for these fields:

- `Fuel Type`:
  - `Diesel` (ดีเซล)
  - `EV` (ไฟฟ้า)
  - `Petrol` (เบนซิน)
  - `Hybrid` (เบนซินไฮบริด)
- `Car Type`:
  - `Sedan`
  - `Coupe`
  - `SUV`
  - `Hatchback`
  - `Convertible`

Server-side API validation also enforces these values for create/update car endpoints.

## Admin Capabilities
- Manage users:
  - Create, search, update, delete
- Manage admins:
  - Create, search, update, delete
- Manage cars:
  - Create, search, update, delete/deactivate
  - Edit details: name, fuel, consumption, type, seats, engine cc, horsepower, active flag
  - Add/edit/delete image by URL
  - Import image from local device
- Manage orders:
  - View incoming orders
  - Approve stage `Waiting for callback`
  - Approve stage `Waiting for pickup or delivery`
  - Cancel order
  - Open map on OpenStreetMap for both pickup types
- View completed and cancelled order history

## API Overview
Public/customer endpoints:
- `GET /api/cars/public/`
- `GET /api/booking/availability/`
- `GET /api/notifications/`
- `POST /api/notifications/mark-read/`
- `POST /api/order/<booking_id>/advance/`
- `POST /api/order/<booking_id>/cancel/`
- `POST /api/profile/update-phone/`
- `POST /api/profile/change-password/`

Admin endpoints:
- `GET /api/admin/api/dashboard/`
- `GET,POST /api/admin/api/users/`
- `GET,PUT,DELETE /api/admin/api/users/<id>/`
- `GET,POST /api/admin/api/admins/`
- `GET,PUT,DELETE /api/admin/api/admins/<id>/`
- `GET,POST /api/admin/api/cars/`
- `GET,PUT,DELETE /api/admin/api/cars/<id>/`
- `POST /api/admin/api/cars/<id>/images/`
- `POST /api/admin/api/cars/<id>/images/upload/`
- `PUT,DELETE /api/admin/api/cars/<id>/images/<image_id>/`
- `GET /api/admin/api/orders/`
- `POST /api/admin/api/orders/<booking_id>/approve-stage/`
- `POST /api/admin/api/orders/<booking_id>/cancel/`
- `GET /api/admin/api/history/`

## SQLrequirements Coverage
`SQLrequirements.txt` handles:
- Create PostgreSQL role: `car_rent_user`
- Create database: `car_rent`
- Seed demo records after migrations:
  - `api_user` (admin/customer)
  - `api_car` (sample cars + additional XLSX-based seed set)
  - `api_carimage` (sample images)
- Includes optional manual schema reference for `api_user` and `api_car`

Important:
- Django still creates all tables via migrations.
- If you run `SQLrequirements.txt` before migrations, seed steps are skipped safely.
- Run the same file again after `python manage.py migrate` to seed data.
- Admin is stored in `api_user` (`role='admin'`), not in a separate table.

## Media and Static
- Uploaded car images are stored under:
  - `django_backend/media/car_images/`
- Media is served by Django only when `DEBUG=True`.
- Static files are loaded from:
  - `STATICFILES_DIRS = [BASE_DIR / "api" / "templates"]`

## Troubleshooting

### `django.db.utils.ProgrammingError: relation "api_user" already exists`
Cause: tables were manually created before migrations.

Preferred fix (clean):
```powershell
psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS car_rent;"
psql -U postgres -h localhost -c "CREATE DATABASE car_rent;"
cd django_backend
python manage.py migrate
```

Alternative (keep existing initial tables):
```powershell
python manage.py migrate --fake-initial
```

### CSS/JS/Image under `/static/` return 404
- Start server from `django_backend` folder:
```powershell
cd django_backend
python manage.py runserver
```
- Ensure `DEBUG=True` while developing.

### `/logout/` 404
Use:
- `http://127.0.0.1:8000/logout/` (auto-redirects), or
- `http://127.0.0.1:8000/api/logout/`

### Map does not load
- Leaflet library is loaded from local static: `Env/vendor/leaflet/*`
- Ensure internet access to tile servers (OpenStreetMap/CARTO fallback)
- Hard refresh the browser (`Ctrl+F5`) after updating frontend assets

### Image upload fails
- Max file size is `10 MB`
- Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.bmp`

### SQL seed did not insert users/cars
Cause: SQL script was run before tables existed.

Fix:
```powershell
cd django_backend
python manage.py migrate
psql -U postgres -h localhost -f ..\SQLrequirements.txt
```

### Car API validation error for `fuel_type` or `car_type`
Cause: value is not in allowed set.

Use one of:
- `fuel_type`: `Diesel`, `EV`, `Petrol`, `Hybrid`
- `car_type`: `Sedan`, `Coupe`, `SUV`, `Hatchback`, `Convertible`

## Security Notes (Important)
- Passwords are stored as `SHA-256` hex in current implementation.
- Legacy plain-text passwords are auto-upgraded to `SHA-256` after successful login.
- Current hashing is intentionally simple (no salt); for production, use Django password hashers (`PBKDF2`/`Argon2`) instead.
- Session auth is custom and not using Django auth user model.
- `SECRET_KEY`, database credentials, and debug settings should be moved to environment variables before production.
- For production, add proper WSGI/ASGI deployment, reverse proxy, HTTPS, and hardened settings.

## License
This repository includes `LICENSE` (MIT).
