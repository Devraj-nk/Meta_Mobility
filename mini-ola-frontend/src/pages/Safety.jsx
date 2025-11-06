import { useNavigate } from 'react-router-dom'
import { Shield, AlertTriangle, Phone, PhoneCall, ArrowLeft, LifeBuoy } from 'lucide-react'

const EmergencyRow = ({ name, number, note }) => (
  <div className="flex items-center justify-between p-4 border-b last:border-b-0">
    <div>
      <div className="text-gray-900 font-medium">{name}</div>
      {note && <div className="text-xs text-gray-500 mt-0.5">{note}</div>}
    </div>
    <div className="flex items-center gap-2">
      <span className="font-semibold text-gray-800">{number}</span>
      <a href={`tel:${number}`} className="btn-primary inline-flex items-center gap-1">
        <PhoneCall className="w-4 h-4"/> Call
      </a>
    </div>
  </div>
)

export default function Safety() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/profile')} className="btn-secondary inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4"/> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Safety</h1>
        </div>

        {/* Safety header */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-green-600"/>
            <div>
              <div className="font-semibold text-gray-900">Emergency assistance</div>
              <p className="text-sm text-gray-600 mt-1">If you are in immediate danger, contact local authorities using one of the numbers below.</p>
            </div>
          </div>
        </div>

        {/* Emergency numbers */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <EmergencyRow name="Police" number="100" note="India - Dial 112 for national emergency" />
          <EmergencyRow name="Ambulance" number="108" note="Medical emergency" />
          <EmergencyRow name="Fire Brigade" number="101" note="Fire emergency" />
          <EmergencyRow name="Women's Helpline" number="1091" note="Women safety" />
          <EmergencyRow name="National Emergency" number="112" note="All-in-one emergency number" />
        </div>

        {/* Tips */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-start gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600"/>
            <div className="font-semibold text-gray-900">Quick safety tips</div>
          </div>
          <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
            <li>Share your ride details with a trusted contact.</li>
            <li>Verify the driver and vehicle details before starting your trip.</li>
            <li>Use the in-ride cancel/SOS options if you feel unsafe.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
