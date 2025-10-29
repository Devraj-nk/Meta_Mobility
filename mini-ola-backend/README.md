# Mini Ola Backend - Meta-Mobility

## Project Overview
Backend system for a web-based cab aggregator platform similar to Ola/Uber. Built as part of the Software Engineering course project.

## Team Members
- **Devraj Ishwar Naik** (Leader) - PES2UG23CS167
- **Chinthan K** - PES2UG23CS155
- **Christananda B** - PES2UG23CS158
- **Chethan S** - PES2UG23CS150

## Features Implemented (Based on SRS)

### Functional Requirements
- ✅ **CAB-F-001**: User Registration & Authentication (JWT-based)
- ✅ **CAB-F-002**: Ride Booking System
- ✅ **CAB-F-003**: Driver Matching Algorithm
- ✅ **CAB-F-004**: Fare Estimation
- ✅ **CAB-F-005**: Group Ride Support
- ✅ **CAB-F-006**: Payment Processing
- ✅ **CAB-F-007**: Driver Availability Management
- ✅ **CAB-F-008**: Live Ride Tracking
- ✅ **CAB-F-009**: Ride History & Receipts

### Security Requirements (CAB-SR-001 to CAB-SR-004)
- HTTPS/TLS 1.2+ support
- Password hashing with bcrypt
- JWT token-based authentication
- Input validation and sanitization

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Real-time**: Socket.io (for live tracking)
- **Security**: Helmet, CORS, express-validator

## Project Structure
```
mini-ola-backend/
├── src/
│   ├── config/         # Database and app configuration
│   ├── models/         # Mongoose schemas (User, Driver, Ride, Payment)
│   ├── controllers/    # Business logic handlers
│   ├── routes/         # API route definitions
│   ├── middleware/     # Auth, validation, error handling
│   ├── utils/          # Helper functions (fare calculation, etc.)
│   └── server.js       # Main application entry point
├── .env.example        # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)
- npm or yarn

### Steps
1. **Clone the repository**
   ```bash
   cd mini-ola-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   ```

5. **Run the server**
   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user/driver
- `POST /api/auth/login` - Login user/driver
- `GET /api/auth/profile` - Get current user profile (protected)

### Rides (Rider)
- `POST /api/rides/request` - Request a new ride
- `GET /api/rides/estimate` - Get fare estimate
- `GET /api/rides/:id` - Get ride details
- `GET /api/rides/history` - Get ride history
- `PUT /api/rides/:id/cancel` - Cancel a ride
- `POST /api/rides/:id/rate` - Rate completed ride

### Driver
- `PUT /api/drivers/availability` - Toggle online/offline status
- `GET /api/drivers/rides/active` - Get current active ride
- `PUT /api/drivers/rides/:id/accept` - Accept ride request
- `PUT /api/drivers/rides/:id/reject` - Reject ride request
- `PUT /api/drivers/rides/:id/start` - Start ride
- `PUT /api/drivers/rides/:id/complete` - Complete ride
- `GET /api/drivers/earnings` - View earnings dashboard

### Payments
- `POST /api/payments/process` - Process payment for ride
- `GET /api/payments/:rideId` - Get payment receipt

### Admin (Optional)
- `GET /api/admin/users` - List all users
- `GET /api/admin/rides` - List all rides
- `GET /api/admin/stats` - System statistics

## Database Models

### User/Rider Schema
- name, email, phone, password (hashed)
- role (rider/driver/admin)
- location (coordinates)
- ratings, ridesCompleted

### Driver Schema
- Extends User
- vehicleType, vehicleNumber, licenseNumber
- isAvailable, currentLocation
- earnings, totalRides

### Ride Schema
- rider, driver (refs)
- pickupLocation, dropoffLocation
- status (requested, accepted, in-progress, completed, cancelled)
- fare, distance, duration
- rideType (mini, sedan, bike)
- timestamps

### Payment Schema
- ride (ref), amount, method
- status (pending, completed, failed)
- transactionId, timestamp

## Testing
Run tests (once implemented):
```bash
npm test
```

## Security Measures
- Password hashing using bcrypt (10 rounds)
- JWT-based stateless authentication
- Input validation on all endpoints
- CORS configuration
- Helmet for secure HTTP headers
- Rate limiting (recommended for production)

## Future Enhancements
- Integration with real Maps API (Google Maps/Mapbox)
- Payment gateway integration (Stripe/Razorpay)
- SMS/Email notifications
- Advanced driver matching algorithm
- Group ride optimization
- Admin dashboard
- Real-time WebSocket updates

## License
MIT

## Contact
For queries related to this project, contact the team members listed above.
