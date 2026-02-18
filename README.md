# Car Rent Website (Django + PostgreSQL)

Car rental web app with public pages, customer booking flow, admin management, and order tracking.

## Features
- Public pages: `Index`, `Model` (no login required)
- Customer: signup, login, booking, order tracking, history, profile update
- Admin: manage `Users`, `Admins`, `Cars`, `Incoming Orders`, `History`
- 4-step order flow:
1. Waiting for callback (admin approval required)
2. Pay 30% deposit
3. Waiting for pickup or delivery (admin approval required)
4. Pay full amount
- In-app notifications when admin approves required stages

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Django
- Database: PostgreSQL

## Project Structure
- `django_backend/manage.py`
- `django_backend/backend/settings.py`
- `django_backend/backend/urls.py`
- `django_backend/api/models.py`
- `django_backend/api/views.py`
- `django_backend/api/urls.py`
- `django_backend/api/templates/`

## Prerequisites
- Python 3.10+ (recommended: 3.10 or 3.11)
- PostgreSQL 13+
- `psql` CLI (recommended for quick setup)

## Quick Start (Windows / PowerShell)
1. Clone project
```powershell
git clone <your-repo-url>
cd Car-rent-website
```

2. Create and activate virtual environment
```powershell
cd django_backend
python -m venv .venv
.\.venv\Scripts\Activate
```

3. Install dependencies
```powershell
python -m pip install --upgrade pip
pip install django psycopg2-binary
```

4. Create PostgreSQL database
```powershell
psql -U postgres -h localhost -c "CREATE DATABASE car_rent;"
```

5. Configure DB in `django_backend/backend/settings.py`
```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "car_rent",
        "USER": "postgres",
        "PASSWORD": "your_password",
        "HOST": "localhost",
        "PORT": "5432",
    }
}
```

6. Run migrations
```powershell
python manage.py migrate
```

7. Create demo admin (`admin/pass`)
```powershell
psql -U postgres -h localhost -d car_rent -c "INSERT INTO api_user (\"fullName\",\"phoneNumber\",username,password,role) VALUES ('System Admin','0990000000','admin','pass','admin') ON CONFLICT (username) DO UPDATE SET \"fullName\"=EXCLUDED.\"fullName\", \"phoneNumber\"=EXCLUDED.\"phoneNumber\", password=EXCLUDED.password, role=EXCLUDED.role;"
```

8. Run server
```powershell
python manage.py runserver
```

## Demo Login
- Username: `admin`
- Password: `pass`

## Main URLs
- `http://127.0.0.1:8000/` -> redirects to `/api/`
- `http://127.0.0.1:8000/api/` -> Home
- `http://127.0.0.1:8000/api/model/` -> Model
- `http://127.0.0.1:8000/api/login/` -> Login
- `http://127.0.0.1:8000/api/admin/` -> Admin page (requires role `admin`)

## Migration Rule (Important)
- Do not manually create `api_user` table before `python manage.py migrate`
- Let Django create tables first, then insert demo admin

## Troubleshooting

### Error: `relation "api_user" already exists`
Cause: `api_user` was created manually before migrations.

Recommended fix (clean setup):
1. Drop and recreate DB
```powershell
psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS car_rent;"
psql -U postgres -h localhost -c "CREATE DATABASE car_rent;"
```
2. Run migrations
```powershell
cd django_backend
python manage.py migrate
```
3. Reinsert demo admin
```powershell
psql -U postgres -h localhost -d car_rent -c "INSERT INTO api_user (\"fullName\",\"phoneNumber\",username,password,role) VALUES ('System Admin','0990000000','admin','pass','admin') ON CONFLICT (username) DO UPDATE SET \"fullName\"=EXCLUDED.\"fullName\", \"phoneNumber\"=EXCLUDED.\"phoneNumber\", password=EXCLUDED.password, role=EXCLUDED.role;"
```

### Static/CSS/JS not loading
- Make sure you run from `django_backend`
- Confirm `DEBUG = True` in `django_backend/backend/settings.py`

```powershell
cd django_backend
python manage.py runserver
```

## Security Notes
- Current project stores passwords in plain text (dev/test only)
- Before production, migrate to Django auth with hashed passwords
- Move `SECRET_KEY` and DB credentials to environment variables

## Media Uploads
- Uploaded car images are stored in `django_backend/media/car_images/`
