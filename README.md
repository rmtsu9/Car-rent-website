# Car Rent Website (Django + PostgreSQL)

A car rental web application with customer pages and an admin panel for full data management.

## Website Overview
- Public pages: `Index` and `Model` can be opened without login.
- Customer features: sign up, login, book cars, track orders, view history, update profile.
- Admin features: manage `Users`, `Admins`, `Cars`, `Incoming Orders`, and `History`.
- 4-step order tracking flow:
1. Waiting for callback (requires Admin approval)
2. Pay 30% deposit
3. Waiting for pickup or delivery (requires Admin approval)
4. Pay full amount
- Automatic notifications: user receives in-app notifications when Admin approves required stages.

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Django
- Database: PostgreSQL

## Project Structure
- `django_backend/manage.py`
- `django_backend/backend/settings.py`
- `django_backend/api/models.py`
- `django_backend/api/views.py`
- `django_backend/api/templates/`

## Installation (Windows / PowerShell)
1. Clone repository
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
pip install django psycopg2-binary
```

4. Create PostgreSQL database
```sql
CREATE DATABASE car_rent;
```

5. Configure database in `django_backend/backend/settings.py`
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

7. Start development server
```powershell
python manage.py runserver
```

8. Open the app
- `http://127.0.0.1:8000/` (redirects to `/api/`)
- `http://127.0.0.1:8000/api/` (Home)
- `http://127.0.0.1:8000/api/model/` (Model / Cars)
- `http://127.0.0.1:8000/api/login/` (Login)
- `http://127.0.0.1:8000/api/admin/` (Admin page, requires role `admin`)

## Example SQL: Create Admin User
Run after `python manage.py migrate`.

```sql
INSERT INTO api_user ("fullName", "phoneNumber", "username", "password", "role")
VALUES ('System Admin', '0990000000', 'admin', 'pass', 'admin');
```

Verify:
```sql
SELECT id, "fullName", "phoneNumber", username, role
FROM api_user
ORDER BY id DESC;
```

## Important Notes
- Current project stores passwords as plain text (dev/test only).
- Before production, migrate to secure password hashing (for example Django auth system).
- Uploaded car images are stored under `django_backend/media/car_images/`.
