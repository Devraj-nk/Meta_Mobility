import { Link } from 'react-router-dom'
import { Car, Shield, Zap, Star, ArrowRight, MapPin, Clock, DollarSign } from 'lucide-react'

const Home = () => {
  const features = [
    {
      icon: <Zap className="h-8 w-8 text-primary-600" />,
      title: 'Quick Booking',
      description: 'Book a ride in seconds with our easy-to-use platform'
    },
    {
      icon: <Shield className="h-8 w-8 text-primary-600" />,
      title: 'Safe & Secure',
      description: 'All drivers are verified and background checked'
    },
    {
      icon: <DollarSign className="h-8 w-8 text-primary-600" />,
      title: 'Affordable Rates',
      description: 'Competitive pricing with no hidden charges'
    },
    {
      icon: <Clock className="h-8 w-8 text-primary-600" />,
      title: '24/7 Available',
      description: 'Rides available anytime, anywhere'
    }
  ]

  const rideTypes = [
    { name: 'Mini', price: '₹55', capacity: '4 seats', icon: '🚗' },
    { name: 'Sedan', price: '₹90', capacity: '4 seats', icon: '🚙' },
    { name: 'SUV', price: '₹130', capacity: '6 seats', icon: '🚐' },
    { name: 'Bike', price: '₹35', capacity: '1 seat', icon: '🏍️' }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Your Ride, Your Way
              </h1>
              <p className="text-xl text-primary-100">
                Book reliable rides in minutes. Affordable, safe, and available 24/7.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all"
                >
                  Sign In
                </Link>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <Car className="h-64 w-64 text-white mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Mini Ola?</h2>
            <p className="text-xl text-gray-600">Experience the best ride-booking service</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card text-center hover:scale-105">
                <div className="flex justify-center mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ride Types Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Ride</h2>
            <p className="text-xl text-gray-600">Select from our range of vehicles</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rideTypes.map((ride, index) => (
              <div key={index} className="card text-center hover:scale-105">
                <div className="text-6xl mb-4">{ride.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{ride.name}</h3>
                <p className="text-3xl font-bold text-primary-600 mb-2">{ride.price}</p>
                <p className="text-gray-600">{ride.capacity}</p>
                <p className="text-sm text-gray-500 mt-2">Base fare</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Start Your Journey?</h2>
          <p className="text-xl mb-8 text-primary-100">
            Join thousands of satisfied riders and drivers on Mini Ola
          </p>
          <Link
            to="/register"
            className="inline-flex items-center bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Sign Up Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">10K+</div>
              <div className="text-gray-600">Active Riders</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">500+</div>
              <div className="text-gray-600">Verified Drivers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">50K+</div>
              <div className="text-gray-600">Rides Completed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">4.8</div>
              <div className="text-gray-600">Average Rating</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
