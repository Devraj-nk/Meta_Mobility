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
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken') || localStorage.getItem('token'))
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accessToken) {
      client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [accessToken])

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
      const { accessToken: at, refreshToken: rt, user: u } = response.data.data
      setAccessToken(at)
      setRefreshToken(rt)
      setUser(u)
      localStorage.setItem('accessToken', at)
      if (rt) localStorage.setItem('refreshToken', rt)
      client.defaults.headers.common['Authorization'] = `Bearer ${at}`
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

  const { accessToken: at, refreshToken: rt, user: u } = response.data.data
  setAccessToken(at)
  setRefreshToken(rt)
  setUser(u)
  localStorage.setItem('accessToken', at)
  if (rt) localStorage.setItem('refreshToken', rt)
  client.defaults.headers.common['Authorization'] = `Bearer ${at}`
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Registration failed' 
      }
    }
  }

  const logout = async () => {
    try {
      if (refreshToken) {
        await api.logoutToken({ refreshToken })
      }
    } catch (e) {
      // Ignore logout errors
    }
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('token') // legacy cleanup
    delete client.defaults.headers.common['Authorization']
  }

  const refreshProfile = async () => {
    // Force fetch user again and update state
    return await fetchProfile()
  }

  const value = {
    user,
    accessToken,
    refreshToken,
    loading,
    login,
    register,
    logout,
    refreshProfile,
    isAuthenticated: !!accessToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
