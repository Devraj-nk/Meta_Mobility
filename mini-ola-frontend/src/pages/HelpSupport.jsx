import { ArrowLeft, PhoneCall, Mail, Users, LifeBuoy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const contacts = [
  { name: 'Devraj', phone: '9874563212', email: 'devraj@gmail.com' },
  { name: 'Chinthen', phone: '9852174635', email: 'chinthen@gmail.com' },
  { name: 'Chethen', phone: '6987452134', email: 'chethen@gmail.com' },
  { name: 'Christananda', phone: '9517532486', email: 'christananda@gmail.com' },
]

const ContactCard = ({ name, phone, email }) => (
  <div className="flex items-center justify-between p-4 border-b last:border-b-0">
    <div className="flex items-center gap-3">
      <Users className="w-5 h-5 text-gray-600" />
      <div>
        <div className="font-semibold text-gray-900">{name}</div>
        <div className="text-sm text-gray-600">{email}</div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <a href={`tel:${phone}`} className="btn-primary inline-flex items-center gap-1">
        <PhoneCall className="w-4 h-4"/> {phone}
      </a>
      <a href={`mailto:${email}`} className="btn-secondary inline-flex items-center gap-1">
        <Mail className="w-4 h-4"/> Email
      </a>
    </div>
  </div>
)

export default function HelpSupport() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/profile')} className="btn-secondary inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4"/> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex items-start gap-3">
            <LifeBuoy className="w-6 h-6 text-blue-600"/>
            <div>
              <div className="font-semibold text-gray-900">We’re here to help</div>
              <p className="text-sm text-gray-600 mt-1">Contact our support members directly for assistance with rides, payments, and safety.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {contacts.map((c) => (
            <ContactCard key={c.email} name={c.name} phone={c.phone} email={c.email} />
          ))}
        </div>
      </div>
    </div>
  )
}
