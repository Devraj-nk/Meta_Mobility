import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { MapPin, Calendar, Clock, IndianRupee as Rupee } from 'lucide-react'

const formatCurrency = (n) => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0)
  } catch {
    return `₹${(n || 0).toFixed(2)}`
  }
}

const RideItem = ({ ride }) => {
  const date = new Date(ride.createdAt)
  const fare = ride?.fare?.finalFare || ride?.fare?.estimatedFare || 0
  const dur = ride?.duration?.actual || ride?.duration?.estimated
  const status = ride?.status
  const riderName = ride?.rider?.name || 'Rider'

  return (
    <div className="p-4 border rounded-xl bg-white hover:shadow-sm transition mb-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className={`text-xs px-2 py-1 rounded-full ${status === 'completed' ? 'bg-green-100 text-green-700' : status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
          {status}
        </div>
      </div>
      <div className="mt-3 grid md:grid-cols-3 gap-3">
        <div className="text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <MapPin className="h-4 w-4" />
            <span className="font-medium">From:</span>
            <span className="truncate">{ride?.pickupLocation?.address}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 mt-1">
            <MapPin className="h-4 w-4" />
            <span className="font-medium">To:</span>
            <span className="truncate">{ride?.dropoffLocation?.address}</span>
          </div>
        </div>
        <div className="text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Duration:</span>
            <span>{dur ? `${dur} min` : '—'}</span>
          </div>
          <div className="text-sm text-gray-700 mt-1">
            <span className="font-medium">Rider:</span> {riderName}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-gray-500">Fare</div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(fare)}</div>
          <div className="text-xs text-gray-500">{ride?.paymentStatus || 'pending'}</div>
        </div>
      </div>
    </div>
  )
}

const DriverHistory = () => {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rides, setRides] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (user?.role !== 'driver') {
      navigate('/rider/dashboard')
      return
    }
    fetchHistory(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])

  const fetchHistory = async (p) => {
    try {
      setLoading(true)
      setError('')
      const res = await api.rideHistory({ page: p, limit: 10, status: 'completed' })
      const data = res.data?.data || {}
      setRides(data.rides || [])
      setTotalPages(data.totalPages || 1)
      setPage(data.currentPage || p)
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ride History</h1>
        <p className="text-gray-600">Your completed trips and fares</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-600">Loading...</div>
      ) : rides.length === 0 ? (
        <div className="text-center py-10 text-gray-600">No trips yet.</div>
      ) : (
        <div>
          {rides.map((ride) => (
            <RideItem key={ride._id} ride={ride} />
          ))}

          <div className="flex items-center justify-between mt-6">
            <button
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => fetchHistory(page - 1)}
            >
              Previous
            </button>
            <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
            <button
              className="btn-secondary"
              disabled={page >= totalPages}
              onClick={() => fetchHistory(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DriverHistory
