# Mini Ola - User Guide

This guide is intended for the riders and drivers using the Mini Ola application.

## Rider Quick Start

1. Sign up / Register
- Create an account via `/api/auth/register` with your name, email and phone number.

2. Login
- Login using `/api/auth/login` and store the `accessToken` for authenticated calls.

3. Request a ride
- Get fare estimate: `POST /api/rides/estimate` with pickup and drop coordinates.
- Request ride: `POST /api/rides/request` with pickup/drop location and ride type.
- You will receive a `ride` object and a 4-digit OTP.

4. Track ride
- Poll `/api/rides/:id` to get status updates and driver info.
- When the ride reaches `driver-arrived`, driver will request OTP to start.

5. Make payment
- After completion, call `POST /api/payments/process` or open the app's payment screen.
- If you used `wallet`, ensure there's sufficient balance.

6. Rate driver
- Rate completed ride using `POST /api/rides/:id/rate` with rating/feedback.

7. Profile
- `GET /api/auth/profile` and `PUT /api/auth/profile` to manage profile info.

---

## Driver Quick Start

1. Register as a driver
- Register via `/api/auth/register-driver` with vehicle and license details.
- Complete KYC documents to get `kycStatus: approved`.

2. Login & go online
- Login with `/api/auth/login-driver` to get tokens.
- Go online with `PUT /api/drivers/availability` and pass latitude/longitude.

3. Get ride requests
- Drivers poll `GET /api/drivers/ride-requests` to view pending requests.
- Accept a ride using `PUT /api/drivers/rides/:id/accept` (requires OTP).
- Reject using `PUT /api/drivers/rides/:id/reject`.

4. Ride flow
- Mark `arrive` using `PUT /api/drivers/rides/:id/arrive`.
- Start the ride using `PUT /api/drivers/rides/:id/start` (OTP verification)
- Complete ride using `PUT /api/drivers/rides/:id/complete` and optionally provide `finalFare`.

5. Earnings & Stats
- View earnings using `GET /api/drivers/earnings`.
- View stats using `GET /api/drivers/stats`.

6. Account management
- `GET /api/drivers/documents` and `PUT /api/drivers/documents` to update KYC
- `GET /api/drivers/bank` and `PUT /api/drivers/bank` to manage banking info

---

## Tips & Troubleshooting

- Always verify OTP for an extra layer of safety.
- If no drivers are nearby, it's typically because drivers either are offline or have location disabled.
- If your wallet payment fails, use UPI or cash and report an issue to support.
- To delete account, use `DELETE /api/auth/account` after ensuring no active ride.

---

## Example Requests (curl)

- Request ride estimate:
```bash
curl -X POST http://localhost:5000/api/rides/estimate \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"pickupLat":12.9, "pickupLng":77.5, "dropoffLat":12.92, "dropoffLng":77.55, "rideType":"mini"}'
```

- Accept ride (driver):
```bash
curl -X PUT http://localhost:5000/api/drivers/rides/<id>/accept \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"otp":"1234"}'
```

---

## Safety Notes
- Keep both rider and driver apps updated to the latest version.
- Encourage drivers to enable location for accurate matching.
- Use masked account numbers and avoid sharing sensitive information in chats.
