import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import Profile from './Profile'

const AuthContext = React.createContext()

const withAuth = (ui, value) => (
  <AuthContext.Provider value={value}>{ui}</AuthContext.Provider>
)

// Patch useAuth to consume our local context in test
vi.mock('../context/AuthContext', () => ({
  useAuth: () => React.useContext(AuthContext)
}))

describe('Profile page', () => {
  test('renders rider role pill and wallet', () => {
    const value = {
      user: { role: 'rider', name: 'Ria', phone: '9876543210', walletBalance: 123.45 },
      refreshProfile: async () => {}
    }

    render(
      <MemoryRouter>
        {withAuth(<Profile />, value)}
      </MemoryRouter>
    )

    expect(screen.getByText(/rider/i)).toBeInTheDocument()
    expect(screen.getByText(/₹123.45/)).toBeInTheDocument()
    expect(screen.getByText(/profile/i)).toBeInTheDocument()
  })
})
