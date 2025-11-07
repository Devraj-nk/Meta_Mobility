import axios from 'axios'

// Axios instance with sensible defaults
const client = axios.create({
  baseURL: '/api',
  withCredentials: false,
  timeout: 15000,
})

// Attach auth token from localStorage if present
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Normalize error shape
client.interceptors.response.use(
  (res) => res,
  (error) => {
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
  profile: () => client.get('/auth/profile'),
  updateProfile: (payload) => client.put('/auth/profile', payload),
  deleteAccount: () => client.delete('/auth/account'),

  // Rider
  fareEstimate: (payload) => client.post('/rides/estimate', payload),
  requestRide: (payload) => client.post('/rides/request', payload),
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

  // Payments
  processPayment: (payload) => client.post('/payments/process', payload),
  walletTopup: (payload) => client.post('/payments/wallet/topup', payload),
  paymentReceipt: (rideId) => client.get(`/payments/${rideId}`),
  paymentHistory: (params) => client.get('/payments/history', { params }),
  refundPayment: (rideId, payload) => client.post(`/payments/${rideId}/refund`, payload),
}
