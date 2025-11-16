import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import Register from './Register'

// Minimal mock to avoid real auth calls
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ register: async () => ({ success: true }) }) }))

describe('Register page', () => {
  test('shows password mismatch validation', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '9876543210' } })
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@test.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'p1' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'p2' } })

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
  })
})
