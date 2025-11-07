import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import RiderDashboard from './pages/RiderDashboard'
import MyRides from './pages/MyRides'
import Safety from './pages/Safety'
import HelpSupport from './pages/HelpSupport'
import SettingsPage from './pages/Settings'
import DriverDashboard from './pages/DriverDashboard'
import PaymentConfirm from './pages/PaymentConfirm'
import Profile from './pages/Profile'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/rider/dashboard" element={<RiderDashboard />} />
            <Route path="/rides" element={<MyRides />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/help" element={<HelpSupport />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/driver/dashboard" element={<DriverDashboard />} />
            <Route path="/payment/confirm" element={<PaymentConfirm />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
