import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn().mockResolvedValue({ success: false, message: 'bad' }) })
}))

describe('Login page (message banner)', () => {
  test('renders state message banner from navigation', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { message: 'Please sign in' } }] }>
        <Login />
      </MemoryRouter>
    )

    expect(await screen.findByText(/please sign in/i)).toBeInTheDocument()
  })
})
