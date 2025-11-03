# Mini Ola Frontend

Beautiful, modern frontend for the Mini Ola cab aggregator system built with React, Vite, and Tailwind CSS. Fully wired to the backend APIs for auth, rider booking flow, driver availability, and payments.

## Features

- 🚀 Fast development with Vite
- 🎨 Beautiful UI with Tailwind CSS
- 🔐 Complete authentication system (register/login/profile)
- 📱 Responsive design for all devices
- 🗺️ Interactive maps with Leaflet
- 👤 Separate dashboards for Riders and Drivers
- 💳 Multiple payment method support (cash/card/upi/wallet)
- ⭐ Rating and review system
- 🎯 Real-time ride tracking (ready for Socket.io)

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Leaflet** - Interactive maps
- **Lucide React** - Beautiful icons

## Getting Started

### Prerequisites

- Node.js 16+ installed
- Backend server running on `http://localhost:5000`

### Installation

```powershell
# From mini-ola-frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production

```powershell
npm run build
```

## Project Structure

```
src/
├── components/       # Reusable components
│   └── Navbar.jsx
├── pages/           # Page components
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── RiderDashboard.jsx
│   └── DriverDashboard.jsx
├── context/         # React Context providers
│   └── AuthContext.jsx
├── api/             # Centralized API client
│   └── client.js
├── App.jsx          # Main app component
├── main.jsx         # Entry point
└── index.css        # Global styles
```

## Features Overview

### For Riders
- Book rides with ease
- Real-time fare estimation
- View ride history
- Track ongoing rides and cancel if needed
- Rate drivers
- One-click payment on completed rides (cash/card/UPI/wallet)

### For Drivers
- Toggle online/offline status
- View earnings and stats
- Gamification system with levels and badges
- Vehicle management
- KYC verification status

## Environment Configuration

The frontend automatically proxies API requests to `http://localhost:5000` in development mode (configured in `vite.config.js`). All API calls go through the shared axios instance in `src/api/client.js`.

For production, update the API base URL in your environment:

To point the app to a different backend in production, set a reverse proxy in your host, or change the axios `baseURL` in `src/api/client.js`.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## API Integration

Key endpoints used by the app (see backend `API_DOCUMENTATION.md` for full list):

- Auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/profile`
- Rider: `/api/rides/estimate`, `/api/rides/request`, `/api/rides/active`, `/api/rides/history`, `/api/rides/:id/cancel`, `/api/rides/:id/rate`
- Driver: `/api/drivers/availability`, `/api/drivers/location`, `/api/drivers/rides/active`
- Payments: `/api/payments/process`, `/api/payments/:rideId`, `/api/payments/history`

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

Part of the PESU_EC_CSE_C_P14_A Mini Ola project.
