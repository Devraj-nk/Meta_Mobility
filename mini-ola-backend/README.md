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
- Node.js (v18+)
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### Steps
1. **Navigate to backend directory**
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
   # Edit .env with your MongoDB URI and JWT secret
   ```

   Required variables:
   ```env
   MONGODB_URI=mongodb+srv://your-connection-string
   JWT_SECRET=your-super-secret-key-min-32-chars
   JWT_EXPIRES_IN=7d
   PORT=5000
   NODE_ENV=development
   ```

   ⚠️  If your MongoDB Atlas password contains special characters (like `@`, `:`, `/`, `#`, `%`), you must URL-encode them in `MONGODB_URI`.
   Example: if the password is `Devraj@999`, use `Devraj%40999` in the URI.

4. **Start the server**
   ```bash
   # Development mode (with auto-reload using nodemon)
   npm run dev

   # Production mode
   npm start
   ```

   Server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user/driver
- `POST /api/auth/register-driver` - Register driver with vehicle details
- `POST /api/auth/login` - Login user (auto-detects rider/driver)
- `POST /api/auth/login-driver` - Login driver
- `POST /api/auth/refresh` - Refresh access token using refresh token
- `POST /api/auth/logout` - Logout and revoke refresh token
- `GET /api/auth/profile` - Get current user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)
- `PUT /api/auth/change-password` - Change password (protected)
- `POST /api/auth/forgot-password` - Reset password via username/email

### Rides (Rider)
- `POST /api/rides/estimate` - Get fare estimate
- `POST /api/rides/request` - Request a new ride
- `GET /api/rides/active` - Get current active ride
- `GET /api/rides/:id` - Get ride details
- `GET /api/rides/history` - Get ride history with filters
- `PUT /api/rides/:id/cancel` - Cancel a ride
- `POST /api/rides/:id/rate` - Rate completed ride

### Driver
- `PUT /api/drivers/availability` - Toggle online/offline status
- `PUT /api/drivers/location` - Update current location
- `GET /api/drivers/rides/active` - Get current active ride
- `GET /api/drivers/ride-requests` - Get pending ride requests
- `PUT /api/drivers/rides/:id/accept` - Accept ride request
- `PUT /api/drivers/rides/:id/reject` - Reject ride request
- `PUT /api/drivers/rides/:id/arrive` - Mark arrival at pickup
- `PUT /api/drivers/rides/:id/start` - Start ride with OTP verification
- `PUT /api/drivers/rides/:id/complete` - Complete ride
- `GET /api/drivers/earnings` - View earnings dashboard
- `GET /api/drivers/stats` - View driver statistics
- `POST /api/drivers/clear-stuck-ride` - Clear stuck ride (recovery)
- `GET /api/drivers/documents` - Get KYC documents
- `PUT /api/drivers/documents` - Update KYC documents
- `GET /api/drivers/bank` - Get bank details
- `PUT /api/drivers/bank` - Update bank details

### Payments
- `POST /api/payments/process/:rideId` - Process payment for ride
- `GET /api/payments/:rideId` - Get payment receipt
- `GET /api/payments/history` - Get payment history
- `POST /api/payments/:rideId/refund` - Process refund
- `POST /api/payments/wallet/topup` - Add money to wallet (riders only)

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

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.js

# Run tests in watch mode (development)
npm test -- --watch
```

### Test Suites
- **14 test suites passing** with 157 tests
- **93.51% overall code coverage** (exceeds 90% requirement)
- 8 suites skipped (unstable integration tests)

### Coverage Breakdown
- **Models**: 95.7% (User, Driver, Ride, Payment schemas and methods)
- **Routes**: 98.66% (API endpoints and validation)
- **Middleware**: 100% (auth, validator)
- **Utils**: 81.42% (fare calculator, helpers)

### Test Categories
1. **Unit Tests**: Model methods, utils, helpers
2. **Integration Tests**: API endpoints with real MongoDB
3. **Auth Tests**: Registration, login, JWT tokens
4. **Payment Tests**: Processing, refunds, wallet
5. **Driver Tests**: Availability, earnings, gamification
6. **Ride Tests**: Booking flow, OTP, state transitions

### MongoDB Setup for Tests
Tests use MongoDB Atlas connection (configured in `.env`). A separate test database (`mini-ola-test`) is created and dropped automatically.

**Required `.env` variables:**
```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
NODE_ENV=test
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
