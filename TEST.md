# Test Case Mapping

This document maps the test cases from the Software Test Plan (STP) to the corresponding test files in the codebase.

## Test Case Mapping Table

| Test Case ID | Description                                      | Test File(s)                       |
|--------------|--------------------------------------------------|------------------------------------|
| TC-REG-01    | Secure Registration & Login - valid flow         | [auth.test.js](mini-ola-backend/__tests__/auth.test.js), [authExtended.test.js](mini-ola-backend/__tests__/authExtended.test.js) |
| TC-REG-02    | Secure Registration - invalid input              | [auth.test.js](mini-ola-backend/__tests__/auth.test.js), [authExtended.test.js](mini-ola-backend/__tests__/authExtended.test.js) |
| TC-RB-01     | Ride Booking - successful booking                | [ride.test.js](mini-ola-backend/__tests__/ride.test.js), [rideExtended.test.js](mini-ola-backend/__tests__/rideExtended.test.js) |
| TC-RB-02     | Ride Booking - invalid locations                 | [ride.test.js](mini-ola-backend/__tests__/ride.test.js), [rideExtended.test.js](mini-ola-backend/__tests__/rideExtended.test.js) |
| TC-MR-01     | Match Rider with Nearby Driver                  | [ride.test.js](mini-ola-backend/__tests__/ride.test.js), [integration.test.js](mini-ola-backend/__tests__/integration.test.js) |
| TC-DFE-01    | Display Fare Estimate                            | [ride.test.js](mini-ola-backend/__tests__/ride.test.js), [utils.test.js](mini-ola-backend/__tests__/utils.test.js) |
| TC-GR-01     | Group Ride Option - success                      | Manual UI Testing                  |
| TC-PAY-01    | Payments via PSP - payment success               | [payment.test.js](mini-ola-backend/__tests__/payment.test.js), [paymentExtended.test.js](mini-ola-backend/__tests__/paymentExtended.test.js) |
| TC-DAT-01    | Driver Availability toggle                       | [driver.test.js](mini-ola-backend/__tests__/driver.test.js), [driverExtended.test.js](mini-ola-backend/__tests__/driverExtended.test.js) |
| TC-LRT-01    | Live Ride Tracking                               | Manual UI Testing                  |
| TC-RH-01     | Ride History Display                             | [ride.test.js](mini-ola-backend/__tests__/ride.test.js), [rideExtended.test.js](mini-ola-backend/__tests__/rideExtended.test.js) |
| TC-PT-01     | Response time = 10s                              | Manual UI Testing                  |
| TC-ENC-01    | AES-256 Encryption                               | Manual UI Testing                  |
| TC-CON-01    | Handle = 2 concurrent users (demo)               | Manual UI Testing                  |
| TC-BR-01     | Chrome browser compatibility                     | Manual UI Testing                  |
| TC-PSP-01    | PSP Compliance                                   | Manual UI Testing                  |
| TC-MAP-01    | Map refresh = 10s                                | Manual UI Testing                  |
| TC-TLS-01    | TLS 1.2+ for all connections                     | Manual UI Testing                  |
| TC-PWD-01    | Passwords stored with salted hashing             | [models.test.js](mini-ola-backend/__tests__/models.test.js), Manual UI Testing |
| TC-AUT-01    | Auth tokens (e.g., JWT) for sessions             | [auth.test.js](mini-ola-backend/__tests__/auth.test.js), [middleware.test.js](mini-ola-backend/__tests__/middleware.test.js) |
| TC-FRM-01    | Secure, validated forms for sensitive inputs     | [middleware.test.js](mini-ola-backend/__tests__/middleware.test.js), Manual UI Testing |

## Notes
- Test cases marked as "Manual UI Testing" indicate that these features were manually tested through the user interface. Automated test cases for these scenarios are recommended for future development to ensure consistent regression testing.