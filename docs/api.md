# Mini Ola API Documentation

This document provides a high-level reference of the Mini Ola Backend API endpoints. All endpoints are prefixed with `/api` (e.g. `/api/auth/login`).

---

## Authentication

### POST /api/auth/register
- Public
- Body: { name, email, phone, password, role? }
- Response: 201 with `accessToken` and `refreshToken` on success

### POST /api/auth/register-driver
- Public
- Body: { name, email, phone, password, vehicleType, vehicleNumber, vehicleModel, vehicleColor, licenseNumber, licenseExpiry }
- Response: 201 with `accessToken` and `refreshToken`

### POST /api/auth/login
- Public
- Body: { email | phone, password }
- Response: 200 with `accessToken` and `refreshToken`

### POST /api/auth/login-driver
- Public
- Body: { email | phone, password }
- Response: 200 with `accessToken` and `refreshToken`

### POST /api/auth/refresh
- Public
- Body: { refreshToken }
- Response: 200 with new `accessToken` and `refreshToken`

### POST /api/auth/logout
- Public (requires refresh token in body)
- Body: { refreshToken }
- Response: 200

### GET /api/auth/profile
- Private (Authorization: Bearer <accessToken>)
- Response: 200 with user profile

### PUT /api/auth/profile
- Private
- Body: fields to update (email/phone/name/profilePicture)
- Response: 200

### PUT /api/auth/change-password
- Private
- Body: { currentPassword, newPassword }
- Response: 200

### POST /api/auth/forgot-password
- Public
- Body: { username, email, newPassword }
- Response: 200

### DELETE /api/auth/account
- Private
- Soft-deletes user or driver account (masks email/phone)
- Response: 200

---

## Rides

### POST /api/rides/estimate
- Private
- Body: { pickupLat, pickupLng, dropoffLat, dropoffLng, rideType, isGroupRide }
- Response: fare estimate breakdown

### POST /api/rides/request
- Private
- Body: { pickupLat, pickupLng, pickupAddress, dropoffLat, dropoffLng, dropoffAddress, rideType, isGroupRide, scheduledTime }
- Response: 201 with ride, otp, nearbyDriversCount

### GET /api/rides/:id
- Private
- Response: ride object

### PUT /api/rides/:id/cancel
- Private
- Body: { reason }
- Response: ride object

### POST /api/rides/:id/rate
- Private
- Body: { rating, feedback }
- Response: ride object

### GET /api/rides/active
- Private
- Response: active ride for the current user

### GET /api/rides/history
- Private
- Query params: page, limit, status
- Response: paginated history

---

## Drivers

### PUT /api/drivers/availability
- Private (driver)
- Body: { isAvailable, latitude, longitude, address }
- Notes: KYC must be approved to go online
- Response: driver

### PUT /api/drivers/location
- Private (driver)
- Body: { latitude, longitude, address }
- Response: driver location

### GET /api/drivers/ride-requests
- Private (driver)
- Poll for ride requests within 5km & matching vehicle type
- Response: list of candidate rides

### PUT /api/drivers/rides/:id/accept
- Private (driver)
- Body: { otp }
- Response: ride object

### PUT /api/drivers/rides/:id/reject
- Private (driver)
- Body: { reason }
- Response: ride object

### PUT /api/drivers/rides/:id/arrive
- Private (driver)
- Response: ride object

### PUT /api/drivers/rides/:id/start
- Private (driver)
- Body: { otp }
- Response: ride object

### PUT /api/drivers/rides/:id/complete
- Private (driver)
- Body: { finalFare? }
- Response: ride object

### GET /api/drivers/earnings
- Private (driver)
- Response: driver earnings and recent rides

### GET /api/drivers/stats
- Private (driver)
- Response: driver statistics

### GET /api/drivers/documents
### PUT /api/drivers/documents
- Private (driver)
- Manage KYC documents

### GET /api/drivers/bank
### PUT /api/drivers/bank
- Private (driver)
- Manage bank details

---

## Payments

### POST /api/payments/process
- Private
- Body: { rideId, method } (method: wallet|upi|cash)
- Response: payment object

### GET /api/payments/:rideId
- Private
- Response: payment/receipt

### GET /api/payments/history
- Private
- Response: paginated payment history

### POST /api/payments/:rideId/refund
- Private (admin or rider)
- Body: { reason, amount? }
- Response: payment object

### POST /api/payments/wallet/topup
- Private
- Body: { amount, method } (method: upi | cash)
- Response: new wallet balance

---

## Authentication & Headers
- All private routes require `Authorization: Bearer <accessToken>` header.
- The `refresh` endpoint accepts `{ refreshToken }` in the body.

---

## Example (curl)
```bash
curl -X POST \
  http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password123"}'
```

---

## Error Format
All error responses use the format:
```json
{
  "success": false,
  "message": "<description>",
  "statusCode": 400,
  "errors": null,
  "timestamp": "..."
}
```

## Success Format
```json
{
  "success": true,
  "message": "<description>",
  "data": { ... }
}
```

---

## Notes
- Use the `authorize` middleware for role-based access (e.g., `driver` endpoints)
- Some endpoints return additional developer-oriented data when `NODE_ENV` is `development` for debugging
