# Quick Setup Guide - Mini Ola Backend

## Prerequisites
- Node.js (v16 or higher)
- MongoDB (running locally or MongoDB Atlas)
- npm or yarn

## Installation Steps

### 1. Navigate to the backend folder
```powershell
cd mini-ola-backend
```

### 2. Install dependencies
```powershell
npm install
```

### 3. Setup Environment Variables
The `.env` file is already created with default values. You can modify it if needed.

### 4. Start MongoDB
If using local MongoDB:
```powershell
# Start MongoDB service (if installed)
net start MongoDB
```

Or use MongoDB Atlas (cloud):
- Update `MONGODB_URI` in `.env` with your Atlas connection string

### 5. Run the server

**Development mode (with auto-reload):**
```powershell
npm run dev
```

**Production mode:**
```powershell
npm start
```

The server will start at `http://localhost:5000`

## Verify Installation

Open your browser or use curl:
```powershell
curl http://localhost:5000/health
```

You should see:
```json
{
  "success": true,
  "message": "Mini Ola Backend API is running"
}
```

## Testing the API

### 1. Register a Rider
```powershell
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Test Rider\",\"email\":\"rider@test.com\",\"phone\":\"9876543210\",\"password\":\"test123\",\"role\":\"rider\"}'
```

### 2. Register a Driver
```powershell
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Test Driver\",\"email\":\"driver@test.com\",\"phone\":\"9876543211\",\"password\":\"test123\",\"role\":\"driver\",\"vehicleType\":\"sedan\",\"vehicleNumber\":\"KA01AB1234\",\"vehicleModel\":\"Honda City\",\"vehicleColor\":\"White\",\"licenseNumber\":\"DL1234567890\",\"licenseExpiry\":\"2026-12-31\"}'
```

### 3. Login
```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"rider@test.com\",\"password\":\"test123\"}'
```

Copy the token from the response and use it for authenticated requests.

## Project Structure

```
mini-ola-backend/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── models/
│   │   ├── User.js              # User schema (rider/driver/admin)
│   │   ├── Driver.js            # Driver profile schema
│   │   ├── Ride.js              # Ride schema
│   │   └── Payment.js           # Payment schema
│   ├── controllers/
│   │   ├── authController.js    # Auth logic
│   │   ├── rideController.js    # Ride booking logic
│   │   ├── driverController.js  # Driver operations
│   │   └── paymentController.js # Payment processing
│   ├── routes/
│   │   ├── authRoutes.js        # Auth endpoints
│   │   ├── rideRoutes.js        # Ride endpoints
│   │   ├── driverRoutes.js      # Driver endpoints
│   │   └── paymentRoutes.js     # Payment endpoints
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   ├── validator.js         # Input validation
│   │   └── errorHandler.js      # Error handling
│   ├── utils/
│   │   ├── fareCalculator.js    # Fare calculation logic
│   │   └── helpers.js           # Helper functions
│   └── server.js                # Main server file
├── .env                         # Environment variables
├── .gitignore
├── package.json
├── README.md
├── API_DOCUMENTATION.md
└── SETUP_GUIDE.md (this file)
```

## Common Issues & Solutions

### MongoDB Connection Error
**Error:** `MongoNetworkError: connect ECONNREFUSED`
**Solution:** Make sure MongoDB is running. Start it with `net start MongoDB` or update the connection string in `.env`

### Port Already in Use
**Error:** `EADDRINUSE: address already in use :::5000`
**Solution:** Change the `PORT` in `.env` file or kill the process using port 5000

### Module Not Found
**Error:** `Cannot find module 'express'`
**Solution:** Run `npm install` to install all dependencies

## API Testing Tools

1. **Postman** - Download from https://www.postman.com/
2. **Thunder Client** - VS Code extension
3. **cURL** - Command line (already available in PowerShell)

## Next Steps

1. Test all API endpoints using Postman or cURL
2. Build a frontend application (React/Vue/Angular)
3. Implement real-time tracking with Socket.io
4. Integrate actual Maps API (Google Maps/Mapbox)
5. Add payment gateway integration
6. Deploy to cloud (Heroku/AWS/Azure)

## Support

For issues or questions, contact the team members:
- Devraj Ishwar Naik (Leader) - PES2UG23CS167
- Chinthan K - PES2UG23CS155
- Christananda B - PES2UG23CS158
- Chethan S - PES2UG23CS150

## License
MIT
