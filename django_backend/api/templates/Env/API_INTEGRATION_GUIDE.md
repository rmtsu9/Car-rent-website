# API Integration Documentation

## ภาพรวม
ระบบการเช่ารถนี้ได้ถูกออกแบบให้รองรับการเชื่อมต่อกับ Python backend API แล้ว ทำให้สามารถทำงานได้ในสองโหมด:

1. **สถานะ Fallback (Offline)** - ใช้ localStorage เก็บข้อมูลเมื่อไม่มี API
2. **สถานะ API Integration** - เชื่อมต่อกับ Python backend API

---

## โครงสร้างไฟล์

### ไฟล์หลัก API (`js/api.js`)
ไฟล์นี้ประกอบด้วย:
- `API_CONFIG` - ตั้งค่ากลาง API (Base URL, Timeout, Headers)
- `apiRequest()` - Generic function สำหรับทำ HTTP requests
- `authAPI` - Authentication endpoints
- `userAPI` - User profile endpoints
- `vehicleAPI` - Vehicle management endpoints
- `bookingAPI` - Booking endpoints
- `orderAPI` - Order tracking endpoints
- `historyAPI` - Rental history endpoints
- `adminAPI` - Admin dashboard endpoints

### ไฟล์การทำงาน
- `js/login.js` - Login logic with API fallback
- `js/booking.js` - Vehicle booking logic
- `js/profile.js` - User profile management
- `js/history.js` - Rental history display
- `js/order.js` - Order tracking workflow
- `js/admin.js` - Admin dashboard management

---

## การตั้งค่า Python Backend

### Step 1: สร้าง Flask Application

```python
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

# Auth endpoints
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    # Validate credentials
    return jsonify({'token': 'xxx', 'userId': 1, 'role': 'user'})

# ... more endpoints

if __name__ == '__main__':
    app.run(debug=True, host='localhost', port=5000)
```

### Step 2: ตั้งค่า CORS Headers
```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
```

---

## API Endpoints ที่ต้องสร้าง

### Authentication Endpoints
```
POST /api/auth/login
  Body: { username, password }
  Response: { token, userId, role }

POST /api/auth/signup
  Body: { fullName, phoneNumber, username, password }
  Response: { userId, message }

POST /api/auth/logout
  Response: { message }
```

### User Endpoints
```
GET /api/user/profile
  Response: { userId, username, phoneNumber, email }

PUT /api/user/profile
  Body: { phoneNumber }
  Response: { message }

PUT /api/user/password
  Body: { currentPassword, newPassword }
  Response: { message }
```

### Vehicle Endpoints
```
GET /api/vehicles
  Response: [{ id, name, price, availability }]

GET /api/vehicles/available?date=YYYY-MM-DD
  Response: [{ id, name, price }]

GET /api/vehicles/:id
  Response: { id, name, price, specs }
```

### Booking Endpoints
```
POST /api/bookings
  Body: { vehicleId, date, zone, contactNumber }
  Response: { bookingId, status }

GET /api/bookings
  Response: [{ id, vehicle, date, status }]

GET /api/bookings/user/:userId
  Response: [{ id, vehicle, date, status }]

PUT /api/bookings/:id/step
  Body: { step }
  Response: { message }
```

### Order Endpoints
```
GET /api/orders/user/:userId
  Response: [{ id, bookingId, timeline, currentStep }]

GET /api/orders/:id
  Response: { id, vehicle, timeline, status }

PUT /api/orders/:id/step
  Body: { step }
  Response: { message }
```

### History Endpoints
```
GET /api/history/user/:userId
  Response: [{ id, vehicle, dates, status }]

POST /api/history
  Body: { bookingId, vehicle, dates, totalPrice }
  Response: { historyId }
```

### Admin Endpoints
```
GET /api/admin/dashboard
  Response: { totalUsers, totalBookings, revenue }

GET /api/admin/users
  Response: [{ id, username, phone, role }]

GET /api/admin/bookings
  Response: [{ id, userId, vehicle, status }]

DELETE /api/admin/users/:id
  Response: { message }
```

---

## การอัพเดท Configuration

แก้ไขไฟล์ `js/api.js` เพื่อเปลี่ยน Base URL:

```javascript
const API_CONFIG = {
    BASE_URL: 'http://your-server:5000/api',  // เปลี่ยนเป็น URL ของคุณ
    TIMEOUT: 10000,
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};
```

---

## การทดสอบ API

### 1. ตรวจสอบสถานะ API
```javascript
// ใน Browser Console
try {
    const response = await fetch('http://localhost:5000/api/health');
    const data = await response.json();
    console.log(data);
} catch(error) {
    console.error('API not available:', error);
}
```

### 2. ทดสอบ Login
```javascript
const response = await authAPI.login('user', '1234');
console.log(response);
```

### 3. ตรวจสอบในเครือข่าย
เปิด Developer Tools (F12) → Network Tab → ทำการ Login
จะเห็น HTTP requests ไปยัง API

---

## Error Handling

ระบบได้มี built-in fallback mechanism:

```javascript
try {
    // ลองใช้ API
    const response = await authAPI.login(username, password);
    
    if (response.success) {
        // ใช้ข้อมูลจาก API
    } else {
        // ตกไป fallback (local auth)
        console.warn('API failed, using local auth');
    }
} catch (error) {
    // ใช้ fallback
    console.log('API not available, using local data');
}
```

---

## Fallback Data

เมื่อ API ไม่ available ระบบจะใช้:

- **Login Credentials**: `user/1234` หรือ `admin/1234`
- **Sample Vehicles**: 9 รถจากข้อมูล local
- **Sample History**: 5 บันทึกการเช่า
- **Sample Orders**: 2 orders ในตัวอย่าง

---

## Security Notes

1. **Token Management**: เก็บ token ใน `localStorage` (สามารถปรับเป็น sessionStorage ได้)
2. **CORS**: ต้องเปิด CORS ใน backend
3. **Authentication**: ใช้ Bearer token ใน Authorization header
4. **HTTPS**: แนะนำใช้ HTTPS ในสภาพแวดล้อม production

---

## ตัวอย่าง Python Backend (Flask)

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Mock database
users = [
    {'id': 1, 'username': 'user', 'password': '1234', 'role': 'user'},
    {'id': 2, 'username': 'admin', 'password': '1234', 'role': 'admin'}
]

vehicles = [
    {'id': 1, 'name': 'Toyota Camry', 'price': 1500},
    {'id': 2, 'name': 'Honda Accord', 'price': 1300}
]

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user = next((u for u in users if u['username'] == data['username']), None)
    
    if user and user['password'] == data['password']:
        return jsonify({
            'token': f'token_{user["id"]}',
            'userId': user['id'],
            'role': user['role']
        })
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/vehicles', methods=['GET'])
def get_vehicles():
    return jsonify(vehicles)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

---

## Troubleshooting

### ปัญหา: API responses ช้า
- ลด timeout value ใน `API_CONFIG.TIMEOUT`
- ตรวจสอบ network connection

### ปัญหา: CORS errors
```
Access-Control-Allow-Origin missing
```
วิธีแก้: เนื่องจากให้ CORS ใน Flask backend

### ปัญหา: 404 endpoints
- ตรวจสอบ URL ใน `API_CONFIG.BASE_URL`
- ตรวจสอบ endpoint paths

---

## สรุป

ระบบนี้พร้อมสำหรับ:
✅ การเชื่อมต่อกับ Python backend
✅ การทำงานแบบ offline (fallback)
✅ Error handling และ recovery
✅ Flexible configuration

สำหรับการเริ่มต้น แค่สร้าง Python API และเปลี่ยน `BASE_URL` ใน `js/api.js` ก็พร้อม!

