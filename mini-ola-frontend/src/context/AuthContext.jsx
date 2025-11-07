import { createContext, useState, useContext, useEffect } from 'react'
import client, { api } from '../api/client'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      // Persist token for client instance
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchProfile = async () => {
    try {
      const response = await api.profile()
      console.log('Profile response:', response.data)
      const userData = response.data.data?.user || response.data.data || response.data.user || response.data
      console.log('Setting user:', userData)
      setUser(userData)
      return userData
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      logout()
      return null
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    // Normalize input similar to backend normalization
    const normEmail = (email || '').trim().toLowerCase()
    const payload = { email: normEmail, password }

    const attempt = async (fn) => {
      const response = await fn(payload)
      const { token: t, user: u } = response.data.data
      setToken(t)
      setUser(u)
      localStorage.setItem('token', t)
      client.defaults.headers.common['Authorization'] = `Bearer ${t}`
      return { success: true, role: u?.role }
    }

    try {
      return await attempt(api.login)
    } catch (err) {
      const status = err?.response?.status
      const msg = err?.response?.data?.message || err.message
      // Fallback to driver on any auth failure (401) from rider login
      if (status === 401) {
        try {
          return await attempt(api.loginDriver)
        } catch (driverErr) {
          return {
            success: false,
            message: driverErr?.response?.data?.message || driverErr.message || 'Login failed'
          }
        }
      }
      return { success: false, message: msg || 'Login failed' }
    }
  }

  const register = async (userData) => {
    try {
      // Normalize phone to 10 digits without symbols/spaces
      if (userData?.phone) {
        userData.phone = (userData.phone || '').replace(/\D/g, '')
      }

      let response
      if (userData?.role === 'driver') {
        response = await api.registerDriver(userData)
      } else {
        response = await api.register(userData)
      }

      const { token: t, user: u } = response.data.data
      setToken(t)
      setUser(u)
      localStorage.setItem('token', t)
      client.defaults.headers.common['Authorization'] = `Bearer ${t}`
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Registration failed' 
      }
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    delete client.defaults.headers.common['Authorization']
  }

  const refreshProfile = async () => {
    // Force fetch user again and update state
    return await fetchProfile()
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    refreshProfile,
    isAuthenticated: !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
