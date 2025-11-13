import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Navbar from './Navbar'
import { AuthProvider } from '../context/AuthContext'

test('renders Meta Mobility brand in navbar', () => {
  render(
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    </AuthProvider>
  )
  const brand = screen.getByText(/Mini Ola/i)
  expect(brand).toBeInTheDocument()
})
