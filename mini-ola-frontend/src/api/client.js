import axios from 'axios'

// Axios instance with sensible defaults
const client = axios.create({
  baseURL: '/api',
  withCredentials: false,
  timeout: 15000,
})

// Attach auth token from localStorage if present (prefer new key, fallback legacy)
client.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token')
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Normalize error shape
let isRefreshing = false
let pendingRequests = []

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {}
    const status = error?.response?.status

    // Try refresh once on 401
    if (status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        // No refresh token; bubble up
        const message = error?.response?.data?.message || error.message || 'Unauthorized'
        return Promise.reject({ ...error, message, response: error.response })
      }

      try {
        if (isRefreshing) {
          // queue
          return new Promise((resolve, reject) => {
            pendingRequests.push({ resolve, reject, original })
          })
        }
        isRefreshing = true
        const r = await axios.post('/api/auth/refresh', { refreshToken })
        const { accessToken: newAT, refreshToken: newRT } = r.data?.data || {}
        if (newAT) {
          localStorage.setItem('accessToken', newAT)
          if (newRT) localStorage.setItem('refreshToken', newRT)
          original.headers = original.headers || {}
          original.headers.Authorization = `Bearer ${newAT}`
          // retry queued
          pendingRequests.forEach(({ resolve }) => resolve(client(original)))
          pendingRequests = []
          return client(original)
        }
        throw new Error('No access token from refresh')
      } catch (e) {
        pendingRequests.forEach(({ reject }) => reject(e))
        pendingRequests = []
        // Clear tokens on failed refresh
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        const message = error?.response?.data?.message || error.message || 'Unauthorized'
        return Promise.reject({ ...error, message, response: error.response })
      } finally {
        isRefreshing = false
      }
    }

    const message = error?.response?.data?.message || error.message || 'Request failed'
    return Promise.reject({ ...error, message, response: error.response })
  }
)

export default client

// Simple API surface used across the app
export const api = {
  // Auth
  login: (payload) => client.post('/auth/login', payload),
  register: (payload) => client.post('/auth/register', payload),
  registerDriver: (payload) => client.post('/auth/register-driver', payload),
  loginDriver: (payload) => client.post('/auth/login-driver', payload),
  refresh: (payload) => client.post('/auth/refresh', payload),
  logoutToken: (payload) => client.post('/auth/logout', payload),
  profile: () => client.get('/auth/profile'),
  updateProfile: (payload) => client.put('/auth/profile', payload),
  changePassword: (payload) => client.put('/auth/change-password', payload),
  deleteAccount: () => client.delete('/auth/account'),
  forgotPassword: (payload) => client.post('/auth/forgot-password', payload),

  // Rider
  fareEstimate: (payload) => client.post('/rides/estimate', payload),
  requestRide: (payload) => client.post('/rides/request', payload),
  selectDriver: (rideId, payload) => client.put(`/rides/${rideId}/select-driver`, payload),
  activeRide: () => client.get('/rides/active'),
  rideHistory: (params) => client.get('/rides/history', { params }),
  rideDetails: (id) => client.get(`/rides/${id}`),
  cancelRide: (id, payload) => client.put(`/rides/${id}/cancel`, payload),
  rateRide: (id, payload) => client.post(`/rides/${id}/rate`, payload),

  // Driver
  toggleAvailability: (payload) => client.put('/drivers/availability', payload),
  updateLocation: (payload) => client.put('/drivers/location', payload),
  clearStuckRide: () => client.post('/drivers/clear-stuck-ride'),
  driverActiveRide: () => client.get('/drivers/rides/active'),
  driverRideRequests: () => client.get('/drivers/ride-requests'),
  driverAccept: (id, payload) => client.put(`/drivers/rides/${id}/accept`, payload),
  driverReject: (id, payload) => client.put(`/drivers/rides/${id}/reject`, payload),
  driverArrive: (id) => client.put(`/drivers/rides/${id}/arrive`),
  driverStart: (id, payload) => client.put(`/drivers/rides/${id}/start`, payload),
  driverComplete: (id, payload) => client.put(`/drivers/rides/${id}/complete`, payload),
  driverEarnings: () => client.get('/drivers/earnings'),
  driverStats: () => client.get('/drivers/stats'),
  driverDocuments: () => client.get('/drivers/documents'),
  updateDriverDocuments: (payload) => client.put('/drivers/documents', payload),
  driverBankDetails: () => client.get('/drivers/bank'),
  updateDriverBankDetails: (payload) => client.put('/drivers/bank', payload),

  // Payments
  processPayment: (payload) => client.post('/payments/process', payload),
  walletTopup: (payload) => client.post('/payments/wallet/topup', payload),
  paymentReceipt: (rideId) => client.get(`/payments/${rideId}`),
  paymentHistory: (params) => client.get('/payments/history', { params }),
  refundPayment: (rideId, payload) => client.post(`/payments/${rideId}/refund`, payload),
}
