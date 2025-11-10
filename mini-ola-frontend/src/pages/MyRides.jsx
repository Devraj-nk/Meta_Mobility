import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { MapPin, Navigation, DollarSign, Clock, User as UserIcon, Car, ArrowLeft } from 'lucide-react'

const StatusPill = ({ status }) => {
  const styles = {
    requested: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-blue-100 text-blue-800',
    'driver-arrived': 'bg-indigo-100 text-indigo-800',
    'in-progress': 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  }
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}

export default function MyRides() {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await api.rideHistory({ page: 1, limit: 50 })
        const data = res?.data?.data
        if (active) setRides(data?.rides || [])
      } catch (e) {
        if (active) setError(e.message || 'Failed to load rides')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/profile')} className="btn-secondary inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4"/> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">My Rides</h1>
        </div>

        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-gray-600">Loading ride history…</div>
        )}
        {error && !loading && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}

        {!loading && !error && rides.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-gray-600">No rides yet.</div>
        )}

        <div className="space-y-3">
          {rides.map((r) => (
            <div key={r._id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4"/>
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <StatusPill status={r.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-600 mt-1"/>
                    <div>
                      <div className="text-xs text-gray-500">Pickup</div>
                      <div className="text-sm text-gray-900">{r.pickupLocation?.address}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Navigation className="w-4 h-4 text-blue-600 mt-1"/>
                    <div>
                      <div className="text-xs text-gray-500">Drop</div>
                      <div className="text-sm text-gray-900">{r.dropoffLocation?.address}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Car className="w-4 h-4"/>
                    <span className="text-sm">{r.rideType?.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <DollarSign className="w-4 h-4"/>
                    <span className="text-sm">₹{(r.fare?.finalFare || r.fare?.estimatedFare || 0).toFixed(2)}</span>
                  </div>
                  {r.driver && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <UserIcon className="w-4 h-4"/>
                      <span className="text-sm">Driver: {r.driver?.name || 'N/A'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
