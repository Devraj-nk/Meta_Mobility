import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Home from './Home'
import Login from './Login'
import Register from './Register'
import RiderDashboard from './RiderDashboard'
import DriverDashboard from './DriverDashboard'
import Profile from './Profile'
import PaymentConfirm from './PaymentConfirm'
import Settings from './Settings'
import HelpSupport from './HelpSupport'
import ForgotPassword from './ForgotPassword'
import MyRides from './MyRides'
import DriverHistory from './DriverHistory'
import DriverDocuments from './DriverDocuments'
import DriverAccount from './DriverAccount'
import DriverBank from './DriverBank'

// Mock AuthContext so pages depending on it can render without real API calls
vi.mock('../context/AuthContext', () => {
  return {
    useAuth: () => ({
      user: null,
      isAuthenticated: false,
      login: vi.fn(async () => ({ success: true, role: 'rider' })),
      register: vi.fn(async () => ({ success: true })),
      logout: vi.fn(),
      refreshProfile: vi.fn()
    })
  }
})

const Wrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
)

describe('Pages smoke render', () => {
  test('Home renders', () => {
    render(<Home />, { wrapper: Wrapper })
    expect(screen.getByText(/Your Ride, Your Way/i)).toBeInTheDocument()
  })

  test('Login renders', () => {
    render(<Login />, { wrapper: Wrapper })
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument()
  })

  test('Register renders', () => {
    render(<Register />, { wrapper: Wrapper })
    const matches = screen.getAllByText(/Create Account/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  test('RiderDashboard renders', () => {
    render(<RiderDashboard />, { wrapper: Wrapper })
    // Just ensure it mounted
    expect(document.body).toBeTruthy()
  })

  test('DriverDashboard renders', () => {
    render(<DriverDashboard />, { wrapper: Wrapper })
    expect(document.body).toBeTruthy()
  })

  test('Profile renders', () => {
    render(<Profile />, { wrapper: Wrapper })
    expect(document.body).toBeTruthy()
  })

  test('PaymentConfirm renders', () => {
    render(<PaymentConfirm />, { wrapper: Wrapper })
    expect(document.body).toBeTruthy()
  })

  test('Settings renders', () => {
    render(<Settings />, { wrapper: Wrapper })
    expect(document.body).toBeTruthy()
  })

  test('HelpSupport renders', () => {
    render(<HelpSupport />, { wrapper: Wrapper })
    expect(document.body).toBeTruthy()
  })

  test('ForgotPassword renders', () => {
    render(<ForgotPassword />, { wrapper: Wrapper })
    expect(document.body).toBeTruthy()
  })

  test('MyRides renders', () => {
    render(<MyRides />, { wrapper: Wrapper })
    expect(document.body).toBeTruthy()
  })

  test('DriverHistory renders', () => {
    render(<DriverHistory />, { wrapper: Wrapper })
    expect(document.body).toBeTruthy()
  })

  test('DriverDocuments renders', () => {
    render(<DriverDocuments />, { wrapper: Wrapper })
    expect(document.body).toBeTruthy()
  })

  test('DriverAccount renders', () => {
    render(<DriverAccount />, { wrapper: Wrapper })
    expect(document.body).toBeTruthy()
  })

  test('DriverBank renders', () => {
    render(<DriverBank />, { wrapper: Wrapper })
    expect(document.body).toBeTruthy()
  })
})
