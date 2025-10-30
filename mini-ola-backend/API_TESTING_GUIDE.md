# API Testing Guide - Mini Ola Backend

## 🚀 Quick Start - Test All APIs

### **Step 1: Test Health Check** ✅
```powershell
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Mini Ola Backend API is running"
}
```

---

## 📝 **Test Sequence:**

### **1. Register a Rider**
```powershell
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Test Rider\",\"email\":\"rider@test.com\",\"phone\":\"9876543210\",\"password\":\"test123\",\"role\":\"rider\"}'
```

**Save the token from response!**

---

### **2. Register a Driver**
```powershell
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Test Driver\",\"email\":\"driver@test.com\",\"phone\":\"9876543211\",\"password\":\"test123\",\"role\":\"driver\",\"vehicleType\":\"sedan\",\"vehicleNumber\":\"KA01AB1234\",\"vehicleModel\":\"Honda City\",\"vehicleColor\":\"White\",\"licenseNumber\":\"DL1234567890\",\"licenseExpiry\":\"2026-12-31\"}'
```

**Save the driver token too!**

---

### **3. Login as Rider**
```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"rider@test.com\",\"password\":\"test123\"}'
```

**Copy the token from response - you'll need it for next steps!**

---

### **4. Get Profile (Protected Route)**
Replace `YOUR_TOKEN` with the token from login:
```powershell
curl -X GET http://localhost:5000/api/auth/profile `
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### **5. Get Fare Estimate**
```powershell
curl -X POST http://localhost:5000/api/rides/estimate `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -d '{\"pickupLat\":12.9716,\"pickupLng\":77.5946,\"dropoffLat\":12.9352,\"dropoffLng\":77.6245,\"rideType\":\"sedan\",\"isGroupRide\":false}'
```

---

### **6. Request a Ride**
```powershell
curl -X POST http://localhost:5000/api/rides/request `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_RIDER_TOKEN" `
  -d '{\"pickupLat\":12.9716,\"pickupLng\":77.5946,\"pickupAddress\":\"MG Road, Bangalore\",\"dropoffLat\":12.9352,\"dropoffLng\":77.6245,\"dropoffAddress\":\"Indiranagar, Bangalore\",\"rideType\":\"sedan\",\"isGroupRide\":false}'
```

**Save the ride ID and OTP from response!**

---

### **7. Driver - Toggle Availability (Online)**
```powershell
curl -X PUT http://localhost:5000/api/drivers/availability `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" `
  -d '{\"isAvailable\":true,\"latitude\":12.9716,\"longitude\":77.5946,\"address\":\"MG Road, Bangalore\"}'
```

---

### **8. Driver - Get Active Ride**
```powershell
curl -X GET http://localhost:5000/api/drivers/rides/active `
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN"
```

---

### **9. Driver - Start Ride (with OTP)**
Replace `RIDE_ID` and `OTP`:
```powershell
curl -X PUT http://localhost:5000/api/drivers/rides/RIDE_ID/start `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" `
  -d '{\"otp\":\"1234\"}'
```

---

### **10. Driver - Complete Ride**
```powershell
curl -X PUT http://localhost:5000/api/drivers/rides/RIDE_ID/complete `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" `
  -d '{\"finalFare\":150}'
```

---

### **11. Process Payment**
```powershell
curl -X POST http://localhost:5000/api/payments/process `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_RIDER_TOKEN" `
  -d '{\"rideId\":\"RIDE_ID\",\"method\":\"upi\"}'
```

---

### **12. Get Payment Receipt**
```powershell
curl -X GET http://localhost:5000/api/payments/RIDE_ID `
  -H "Authorization: Bearer YOUR_RIDER_TOKEN"
```

---

### **13. Get Ride History**
```powershell
curl -X GET "http://localhost:5000/api/rides/history?page=1&limit=10" `
  -H "Authorization: Bearer YOUR_RIDER_TOKEN"
```

---

### **14. Driver - Get Earnings**
```powershell
curl -X GET http://localhost:5000/api/drivers/earnings `
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN"
```

---

### **15. Rate a Ride**
```powershell
curl -X POST http://localhost:5000/api/rides/RIDE_ID/rate `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_RIDER_TOKEN" `
  -d '{\"rating\":5,\"feedback\":\"Great ride!\"}'
```

---

## 🎯 **Testing Tips:**

1. **Start with registration** - create rider and driver accounts
2. **Save tokens** - copy them to a text file
3. **Test in order** - follow the sequence above
4. **Driver must be online** - before requesting rides
5. **Use OTP** - from ride request response to start ride

---

## 📊 **Response Format:**

### Success Response:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2025-10-21T10:30:00.000Z"
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400,
  "errors": [ ... ],
  "timestamp": "2025-10-21T10:30:00.000Z"
}
```

---

## 🛠️ **Better Testing Tools:**

### **Option 1: Use Thunder Client (VS Code Extension)**
1. Install "Thunder Client" extension in VS Code
2. Import the requests
3. Click to test - no command line needed!

### **Option 2: Use Postman**
1. Download from https://www.postman.com
2. Create collection
3. Add requests
4. Save tokens automatically

### **Option 3: Use the test script below**

---

## ⚡ **Automated Test Script**

Save this as `test-api.ps1`:

```powershell
# Test Mini Ola APIs
$baseUrl = "http://localhost:5000"

# Colors for output
$green = "Green"
$red = "Red"
$yellow = "Yellow"

Write-Host "`n🚕 Testing Mini Ola Backend APIs`n" -ForegroundColor $yellow

# 1. Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor $yellow
$health = curl -s "$baseUrl/health"
Write-Host $health -ForegroundColor $green

# 2. Register Rider
Write-Host "`n2. Registering Rider..." -ForegroundColor $yellow
$riderResponse = curl -s -X POST "$baseUrl/api/auth/register" `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Test Rider\",\"email\":\"rider@test.com\",\"phone\":\"9876543210\",\"password\":\"test123\",\"role\":\"rider\"}'
Write-Host $riderResponse -ForegroundColor $green

# 3. Login Rider
Write-Host "`n3. Login Rider..." -ForegroundColor $yellow
$loginResponse = curl -s -X POST "$baseUrl/api/auth/login" `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"rider@test.com\",\"password\":\"test123\"}'
Write-Host $loginResponse -ForegroundColor $green

Write-Host "`n✅ Basic tests complete! Check responses above." -ForegroundColor $green
Write-Host "📝 Copy the token from login response to test protected routes.`n" -ForegroundColor $yellow
```

Run it:
```powershell
.\test-api.ps1
```

---

## 📝 **Sample Valid Tokens:**

After login, you'll get a token like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MTY...
```

Use it in headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MTY...
```

---

## 🎓 **Full Test Flow:**

```
Register Rider → Login → Get Profile
                     ↓
              Request Ride (save ID & OTP)
                     ↓
Register Driver → Login → Go Online
                     ↓
              Get Active Ride
                     ↓
              Start Ride (with OTP)
                     ↓
              Complete Ride
                     ↓
              Process Payment
                     ↓
         Get Receipt & Rate Ride
```

---

## 🔍 **Debugging Tips:**

### **Common Errors:**

**401 Unauthorized**
- Token missing or expired
- Login again to get new token

**400 Bad Request**
- Check JSON format
- Verify required fields

**404 Not Found**
- Check URL spelling
- Verify ride/payment ID exists

**500 Server Error**
- Check server logs
- Verify database connection

---

Ready to test? Start with Step 1! 🚀
