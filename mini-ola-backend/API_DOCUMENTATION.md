# Mini Ola Backend - API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "password123",
  "role": "rider" // or "driver"
}
```

**For Driver Registration (additional fields):**
```json
{
  "name": "Driver Name",
  "email": "driver@example.com",
  "phone": "9876543210",
  "password": "password123",
  "role": "driver",
  "vehicleType": "sedan",
  "vehicleNumber": "KA01AB1234",
  "vehicleModel": "Honda City",
  "vehicleColor": "White",
  "licenseNumber": "DL1234567890",
  "licenseExpiry": "2026-12-31"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  }
}
```

---

### 2. Login
**POST** `/auth/login`

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

---

### 3. Get Profile
**GET** `/auth/profile`

**Headers:** `Authorization: Bearer <token>`

---

### 4. Update Profile
**PUT** `/auth/profile`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "Updated Name",
  "phone": "9876543210"
}
```

---

### 5. Change Password
**PUT** `/auth/change-password`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## Ride Endpoints (Rider)

### 1. Get Fare Estimate
**POST** `/rides/estimate`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "pickupLat": 12.9716,
  "pickupLng": 77.5946,
  "dropoffLat": 12.9352,
  "dropoffLng": 77.6245,
  "rideType": "sedan",
  "isGroupRide": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "baseFare": 80,
    "distanceFare": 48,
    "timeFare": 20,
    "surgeMultiplier": 1.0,
    "estimatedFare": 148,
    "breakdown": {
      "rideType": "sedan",
      "distance": "4 km",
      "estimatedTime": "10 min"
    }
  }
}
```

---

### 2. Request Ride
**POST** `/rides/request`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "pickupLat": 12.9716,
  "pickupLng": 77.5946,
  "pickupAddress": "MG Road, Bangalore",
  "dropoffLat": 12.9352,
  "dropoffLng": 77.6245,
  "dropoffAddress": "Indiranagar, Bangalore",
  "rideType": "sedan",
  "isGroupRide": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ride requested and driver assigned successfully",
  "data": {
    "ride": {
      "_id": "ride_id",
      "status": "accepted",
      "rider": { ... },
      "driver": { ... },
      "fare": { ... }
    },
    "otp": "1234"
  }
}
```

---

### 3. Get Active Ride
**GET** `/rides/active`

**Headers:** `Authorization: Bearer <token>`

---

### 4. Get Ride History
**GET** `/rides/history?page=1&limit=10&status=completed`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "rides": [ ... ],
    "totalPages": 5,
    "currentPage": 1,
    "totalRides": 45
  }
}
```

---

### 5. Get Ride Details
**GET** `/rides/:id`

**Headers:** `Authorization: Bearer <token>`

---

### 6. Cancel Ride
**PUT** `/rides/:id/cancel`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "reason": "Changed my mind"
}
```

---

### 7. Rate Ride
**POST** `/rides/:id/rate`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "rating": 5,
  "feedback": "Great ride!"
}
```

---

## Driver Endpoints

### 1. Toggle Availability
**PUT** `/drivers/availability`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "isAvailable": true,
  "latitude": 12.9716,
  "longitude": 77.5946,
  "address": "MG Road, Bangalore"
}
```

---

### 2. Update Location
**PUT** `/drivers/location`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "address": "Current location"
}
```

---

### 3. Get Active Ride
**GET** `/drivers/rides/active`

**Headers:** `Authorization: Bearer <token>`

---

### 4. Accept Ride
**PUT** `/drivers/rides/:id/accept`

**Headers:** `Authorization: Bearer <token>`

---

### 5. Reject Ride
**PUT** `/drivers/rides/:id/reject`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "reason": "Too far away"
}
```

---

### 6. Arrive at Pickup
**PUT** `/drivers/rides/:id/arrive`

**Headers:** `Authorization: Bearer <token>`

---

### 7. Start Ride (with OTP)
**PUT** `/drivers/rides/:id/start`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "otp": "1234"
}
```

---

### 8. Complete Ride
**PUT** `/drivers/rides/:id/complete`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "finalFare": 150
}
```

---

### 9. Get Earnings
**GET** `/drivers/earnings`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEarnings": 15000,
    "totalRides": 120,
    "todayEarnings": 500,
    "todayRides": 5,
    "recentRides": [ ... ]
  }
}
```

---

### 10. Get Stats
**GET** `/drivers/stats`

**Headers:** `Authorization: Bearer <token>`

---

## Payment Endpoints

### 1. Process Payment
**POST** `/payments/process`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "rideId": "ride_id_here"
}
```

**Note:** Payment is automatically processed via wallet deduction. User must have sufficient balance.

**Response:**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "payment": {
      "_id": "payment_id",
      "ride": "ride_id",
      "amount": 150,
      "method": "wallet",
      "status": "completed",
      "transactionId": "TXN-INTERNAL-...",
      "platformFee": 30,
      "driverEarnings": 120
    }
  }
}
```

---

### 2. Get Payment Receipt
**GET** `/payments/:rideId`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "receipt": {
      "receiptNumber": "REC-123456",
      "ride": { ... },
      "fareBreakdown": { ... },
      "payment": { ... }
    }
  }
}
```

---

### 3. Get Payment History
**GET** `/payments/history?page=1&limit=10`

**Headers:** `Authorization: Bearer <token>`

---

### 4. Refund Payment
**POST** `/payments/:rideId/refund`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "reason": "Cancelled ride",
  "amount": 100
}
```

---

## Error Response Format

```json
{
  "success": false,
  "message": "Error message here",
  "statusCode": 400,
  "errors": [ ... ],
  "timestamp": "2025-10-20T10:30:00.000Z"
}
```

---

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Testing the API

### Using cURL

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","phone":"9876543210","password":"test123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Get Profile (replace TOKEN)
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman

1. Import the endpoints
2. Set the Authorization header with Bearer token
3. Test each endpoint with sample data

---

## SRS Requirements Mapping

- **CAB-F-001**: Authentication - `/api/auth/*`
- **CAB-F-002**: Ride Booking - `/api/rides/request`
- **CAB-F-003**: Driver Matching - Automatic in `/api/rides/request`
- **CAB-F-004**: Fare Estimate - `/api/rides/estimate`
- **CAB-F-005**: Group Rides - `isGroupRide` parameter
- **CAB-F-006**: Payments - `/api/payments/*`
- **CAB-F-007**: Driver Availability - `/api/drivers/availability`
- **CAB-F-008**: Live Tracking - Real-time updates (WebSocket in future)
- **CAB-F-009**: Ride History - `/api/rides/history`

## Security Features (CAB-SR-001 to CAB-SR-004)

- ✅ TLS/HTTPS support with Helmet
- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Input validation and sanitization
