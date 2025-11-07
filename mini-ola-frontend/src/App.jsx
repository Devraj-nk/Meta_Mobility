import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import RiderDashboard from './pages/RiderDashboard'
import DriverDashboard from './pages/DriverDashboard'
import PaymentConfirm from './pages/PaymentConfirm'
import Profile from './pages/Profile'
import DriverHistory from './pages/DriverHistory'
import DriverDocuments from './pages/DriverDocuments'
import DriverAccount from './pages/DriverAccount'
import DriverBank from './pages/DriverBank'
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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/register" element={<Register />} />
            <Route path="/rider/dashboard" element={<RiderDashboard />} />
            <Route path="/driver/dashboard" element={<DriverDashboard />} />
            <Route path="/driver/history" element={<DriverHistory />} />
            <Route path="/driver/documents" element={<DriverDocuments />} />
            <Route path="/driver/account" element={<DriverAccount />} />
            <Route path="/driver/bank" element={<DriverBank />} />
            <Route path="/payment/confirm" element={<PaymentConfirm />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
