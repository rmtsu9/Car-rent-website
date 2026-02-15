# API Integration - Quick Start Guide

## ✅ สิ่งที่ได้เสร็จแล้ว

ระบบการเช่ารถได้ถูกปรับปรุงให้รองรับการเชื่อมต่อกับ Python backend API แล้ว:

### ✨ ไฟล์ API ที่สร้างใหม่
- **`js/api.js`** - Central API management module
- **`js/login.js`** - Updated with API integration
- **`js/booking.js`** - Vehicle booking with API support
- **`js/profile.js`** - User profile management
- **`js/history.js`** - Rental history with API
- **`js/order.js`** - Order tracking system
- **`js/admin.js`** - Admin dashboard with API

### 🔄 ไฟล์ที่อัปเดต
- **Login.html** - ใช้ api.js
- **signup.html** - Added API registration
- **Booking.html** - External JS files
- **Profile.html** - External JS files
- **History.html** - External JS files  
- **Order.html** - External JS files
- **admin.html** - Added API support

---

## 🚀 การเริ่มต้นใช้งาน

### ตัวเลือก 1: ใช้งานแบบ Local (Default)
ไม่ต้องทำอะไร! ระบบจะใช้ localStorage และข้อมูล fallback:
- Username: `user` / Password: `1234` (regular user)
- Username: `admin` / Password: `1234` (admin)

### ตัวเลือก 2: เชื่อมต่อกับ Python Backend

#### ขั้นที่ 1: สร้าง Python API Server

```python
# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    # Your authentication logic
    return jsonify({
        'token': 'your_token',
        'userId': 1,
        'role': 'user'
    })

# Add all other endpoints...

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

#### ขั้นที่ 2: อัปเดต Configuration

แก้ไข `js/api.js`:

```javascript
const API_CONFIG = {
    BASE_URL: 'http://localhost:5000/api',  // เปลี่ยนเป็น URL ของคุณ
    TIMEOUT: 10000,
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};
```

#### ขั้นที่ 3: ทดสอบการเชื่อมต่อ

เปิด Developer Console (F12) และรัน:

```javascript
// ตรวจสอบ API health
try {
    const response = await fetch('http://localhost:5000/api/health');
    const data = await response.json();
    console.log('API Connected:', data);
} catch (error) {
    console.log('API not available - using local mode');
}
```

---

## 📋 API Endpoints ที่ต้องสร้าง

### การตรวจสอบ Health Status
```
GET /api/health
```

### Authentication
```
POST /api/auth/login          → Login user
POST /api/auth/signup         → Register new user
POST /api/auth/logout         → Logout user
GET  /api/auth/verify-token   → Verify token validity
```

### User Profile
```
GET  /api/user/profile        → Get user profile
PUT  /api/user/profile        → Update phone number
PUT  /api/user/password       → Change password
```

### Vehicles
```
GET  /api/vehicles            → Get all vehicles
GET  /api/vehicles/available  → Get available vehicles for date
GET  /api/vehicles/:id        → Get vehicle details
```

### Bookings
```
POST /api/bookings            → Create booking
GET  /api/bookings            → Get all bookings
GET  /api/bookings/:id        → Get booking details
PUT  /api/bookings/:id        → Update booking
PUT  /api/bookings/:id/step   → Update booking step
```

### Orders
```
GET  /api/orders/user/:userId → Get user's orders
GET  /api/orders/:id          → Get order details
POST /api/orders              → Create order
PUT  /api/orders/:id/step     → Update order step
GET  /api/orders/:id/timeline → Get order timeline
```

### History
```
GET  /api/history/user/:userId → Get rental history
GET  /api/history/:id         → Get history details
POST /api/history             → Add to history
```

### Admin
```
GET  /api/admin/dashboard     → Get dashboard stats
GET  /api/admin/users         → Get all users
GET  /api/admin/bookings      → Get all bookings
GET  /api/admin/orders        → Get all orders
POST /api/admin/users         → Add new user
DELETE /api/admin/users/:id   → Delete user
```

---

## 🔧 การใช้งาน API Functions

### ตัวอย่าง: Login
```javascript
const result = await authAPI.login('user', 'password');
if (result.success) {
    console.log('Logged in:', result.data);
} else {
    console.error('Login failed:', result.error);
}
```

### ตัวอย่าง: Get Vehicles
```javascript
const result = await vehicleAPI.getAvailable('2026-02-15');
if (result.success) {
    result.data.forEach(vehicle => {
        console.log(vehicle.name, vehicle.price);
    });
}
```

### ตัวอย่าง: Create Booking
```javascript
const bookingData = {
    vehicleId: 1,
    date: '2026-02-15',
    zone: 'Bangkok',
    contactNumber: '0891234567'
};

const result = await bookingAPI.create(bookingData);
if (result.success) {
    console.log('Booking ID:', result.data.bookingId);
}
```

---

## 🛡️ Automatic Fallback System

ระบบมี **built-in fallback** ที่อัตโนมัติ:

```
┌─────────────────────────────┐
│  Try API Connection         │
└──────────────┬──────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
   SUCCESS         FAIL/ERROR
       │              │
       ▼              ▼
   Use API Data   Use Local Data
       │          (localStorage)
       └─────┬─────┘
            ▼
        Continue Operation
```

**ประโยชน์:**
- ✅ ทำงานได้แม้ API ไม่ available
- ✅ User experience ไม่ขาดส่วน
- ✅ ข้อมูลเก่าสามารถ restore ได้

---

## 📊 Data Flow Example

### Booking Process
```
User Input
   ↓
js/booking.js (selectVehicle)
   ↓
bookingAPI.create() [TRY API]
   ↓
   ├─ Success → API response
   └─ Fail → localStorage fallback
   ↓
showSuccess() & Navigate
```

---

## 🔐 Security Features

1. **Token Management**
   - Tokens stored in localStorage
   - Can be changed to sessionStorage
   - Cleared on logout

2. **Role-Based Access**
   - User role checked on protected pages
   - Admin-only pages verified
   - Automatic redirect on auth failure

3. **CORS Enabled**
   - Requests include proper headers
   - Cross-origin requests allowed

---

## 🐛 Debugging Tips

### 1. Check API Availability
```javascript
console.log('API Base URL:', API_CONFIG.BASE_URL);
```

### 2. Monitor Network Requests
- Open DevTools (F12)
- Go to Network tab
- Perform an action (e.g., login)
- See HTTP requests and responses

### 3. Check localStorage
```javascript
console.log('Session Data:', localStorage.getItem('isLoggedIn'));
console.log('User Role:', localStorage.getItem('userRole'));
```

### 4. Test API Directly
```javascript
// Test login
const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'user', password: '1234' })
});
const data = await response.json();
console.log(data);
```

---

## 📝 Example Response Formats

### Login Response
```json
{
    "token": "eyJhbGc...",
    "userId": 1,
    "role": "user"
}
```

### Vehicle Response
```json
{
    "id": 1,
    "name": "Toyota Camry",
    "price": 1500
}
```

### Booking Response
```json
{
    "bookingId": "BK001",
    "status": "confirmed",
    "totalPrice": 4500
}
```

---

## ✨ Features Summary

- ✅ Full API integration ready
- ✅ Automatic fallback to local data
- ✅ All pages connected with JS modules
- ✅ Error handling built-in
- ✅ Token management system
- ✅ Role-based access control
- ✅ Support for all operations (CRUD)
- ✅ Responsive design maintained

---

## 📚 Files Reference

| ไฟล์ | ที่อยู่ | อธิบาย |
|------|--------|--------|
| api.js | js/ | Central API management |
| login.js | js/ | Login with API support |
| booking.js | js/ | Booking operations |
| profile.js | js/ | User profile management |
| history.js | js/ | Rental history display |
| order.js | js/ | Order tracking |
| admin.js | js/ | Admin operations |
| API_INTEGRATION_GUIDE.md | root | Detailed API documentation |

---

## 🚀 Ready to Deploy?

### For Production:
1. ✅ Change `BASE_URL` to production server
2. ✅ Use HTTPS instead of HTTP
3. ✅ Enable CORS on your server
4. ✅ Remove debug console.logs
5. ✅ Test thoroughly with real API
6. ✅ Setup error logging/monitoring

---

## 📞 Support

For detailed API endpoint specifications, see `API_INTEGRATION_GUIDE.md`

Happy coding! 🎉

