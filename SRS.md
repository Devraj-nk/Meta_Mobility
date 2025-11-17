# Software Requirements Specification (SRS) Mapping

This document maps the requirements from the SRS to the respective files and components in the codebase that satisfy them. Each requirement includes a description and a link to the file(s) where the implementation resides.

## Functional Requirements

| Req ID      | Description                                                                 | File Link                                                                 |
|-------------|-----------------------------------------------------------------------------|---------------------------------------------------------------------------|
| CAB-F-001   | The system shall allow users to register and log in securely.              | [authController.js](mini-ola-backend/src/controllers/authController.js)  |
| CAB-F-002   | The system shall allow passengers to book a cab by entering pickup/drop.   | [rideController.js](mini-ola-backend/src/controllers/rideController.js)  |
| CAB-F-003   | The system shall match riders with nearby available drivers.               | [rideController.js](mini-ola-backend/src/controllers/rideController.js)  |
| CAB-F-004   | The system shall display fare estimate before ride confirmation.           | [fareCalculator.js](mini-ola-backend/src/utils/fareCalculator.js)        |
| CAB-F-005   | The system shall support Group Ride option where multiple users share a cab.| [rideController.js](mini-ola-backend/src/controllers/rideController.js)  |
| CAB-F-006   | The system shall process payments via integrated PSPs.                     | [paymentController.js](mini-ola-backend/src/controllers/paymentController.js) |
| CAB-F-007   | The system shall allow drivers to update availability (online/offline).    | [driverController.js](mini-ola-backend/src/controllers/driverController.js) |
| CAB-F-008   | The system shall provide live tracking of driver’s location to passenger.  | [rideController.js](mini-ola-backend/src/controllers/rideController.js)  |
| CAB-F-009   | The system shall allow passengers to view ride history and payment receipts.| [rideController.js](mini-ola-backend/src/controllers/rideController.js)  |

## Non-Functional Requirements

| Req ID      | Description                                                                 | File Link                                                                 |
|-------------|-----------------------------------------------------------------------------|---------------------------------------------------------------------------|
| CAB-NF-001  | System shall respond to ride search/booking requests in ≤ 10 seconds.      | [rideController.js](mini-ola-backend/src/controllers/rideController.js)  |
| CAB-NF-002  | All sensitive user data (passwords, tokens) shall be encrypted (AES-256).  | [authController.js](mini-ola-backend/src/controllers/authController.js)  |
| CAB-NF-003  | System shall handle at least 2 concurrent users for demo purposes.         | [rideController.js](mini-ola-backend/src/controllers/rideController.js)  |
| CAB-NF-004  | System shall be accessible via modern browsers (Chrome).                   | Not tied to backend files.                                               |
| CAB-NF-005  | System shall comply with PSP requirements.                                 | [paymentController.js](mini-ola-backend/src/controllers/paymentController.js) |
| CAB-NF-006  | Map rendering and driver tracking refresh rate shall be ≤ 10 seconds.      | [rideController.js](mini-ola-backend/src/controllers/rideController.js)  |

## Security Requirements

| Req ID      | Description                                                                 | File Link                                                                 |
|-------------|-----------------------------------------------------------------------------|---------------------------------------------------------------------------|
| CAB-SR-001  | Enforce TLS 1.2+ on all network connections.                               | Not tied to backend files (handled via HTTPS configuration).             |
| CAB-SR-002  | User passwords shall be stored using salted hashing (bcrypt/argon2).       | [authController.js](mini-ola-backend/src/controllers/authController.js)  |
| CAB-SR-003  | System shall enforce authentication tokens (e.g., JWT) for session management.| [authMiddleware.js](mini-ola-backend/src/middleware/auth.js)             |
| CAB-SR-004  | Sensitive user inputs (payment, login) shall be transmitted securely.      | [validator.js](mini-ola-backend/src/middleware/validator.js)             |

---

For more details, refer to the respective files linked above.