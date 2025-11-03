import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { DollarSign, CheckCircle, XCircle, Loader, Wallet } from 'lucide-react'

const PaymentConfirm = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const rideId = searchParams.get('rideId')
  const amount = searchParams.get('amount')
  
  const [ride, setRide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState(null) // 'success' | 'error'
  const [error, setError] = useState('')

  useEffect(() => {
    if (!rideId) {
      navigate('/rider/dashboard')
      return
    }
    fetchRideDetails()
  }, [rideId])

  const fetchRideDetails = async () => {
    try {
      const response = await api.rideDetails(rideId)
      setRide(response.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ride details')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    setPaying(true)
    setError('')
    
    try {
      await api.processPayment({ rideId })
      setPaymentStatus('success')
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/rider/dashboard')
      }, 2000)
    } catch (err) {
      setPaymentStatus('error')
      setError(err.response?.data?.message || err.message || 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!ride) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ride Not Found</h2>
          <button onClick={() => navigate('/rider/dashboard')} className="btn-primary mt-4">
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const fareAmount = ride.fare?.finalFare || ride.fare?.estimatedFare || amount || 0

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="card">
          {paymentStatus === 'success' ? (
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-4">Your payment has been processed successfully.</p>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </div>
          ) : paymentStatus === 'error' ? (
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="flex gap-3">
                <button onClick={handlePayment} className="btn-primary flex-1" disabled={paying}>
                  Retry Payment
                </button>
                <button onClick={() => navigate('/rider/dashboard')} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <DollarSign className="h-16 w-16 text-primary-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Payment</h2>
                <p className="text-gray-600">Review your ride details and confirm payment</p>
              </div>

              {/* Ride Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
                <div>
                  <p className="text-sm text-gray-600">From</p>
                  <p className="font-semibold text-gray-900">{ride.pickupLocation?.address || ride.pickupAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">To</p>
                  <p className="font-semibold text-gray-900">{ride.dropoffLocation?.address || ride.dropoffAddress}</p>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-gray-600">Ride Type</span>
                  <span className="font-semibold capitalize">{ride.rideType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Distance</span>
                  <span className="font-semibold">{ride.distance?.toFixed(1) || '—'} km</span>
                </div>
              </div>

              {/* Fare Breakdown */}
              <div className="bg-primary-50 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-gray-900 mb-3">Fare Breakdown</h3>
                <div className="space-y-2 text-sm">
                  {ride.fare?.baseFare && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Fare</span>
                      <span>₹{ride.fare.baseFare}</span>
                    </div>
                  )}
                  {ride.fare?.distanceFare && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Distance Fare</span>
                      <span>₹{ride.fare.distanceFare}</span>
                    </div>
                  )}
                  {ride.fare?.timeFare && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time Fare</span>
                      <span>₹{ride.fare.timeFare}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-primary-200 font-bold text-lg">
                    <span className="text-gray-900">Total Amount</span>
                    <span className="text-primary-600">₹{fareAmount}</span>
                  </div>
                </div>
              </div>

              {/* Wallet Balance */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center">
                  <Wallet className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-gray-700">Wallet Balance</span>
                </div>
                <span className="font-bold text-blue-600">₹{user?.walletBalance?.toFixed(2) || '0.00'}</span>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={() => navigate('/rider/dashboard')} 
                  className="btn-secondary flex-1"
                  disabled={paying}
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePayment} 
                  className="btn-primary flex-1 disabled:opacity-50"
                  disabled={paying || (user?.walletBalance < fareAmount)}
                >
                  {paying ? (
                    <>
                      <Loader className="inline h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="inline h-4 w-4 mr-2" />
                      Pay ₹{fareAmount}
                    </>
                  )}
                </button>
              </div>

              {user?.walletBalance < fareAmount && (
                <p className="text-sm text-red-600 text-center mt-4">
                  Insufficient wallet balance. Please add funds to your wallet.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentConfirm
