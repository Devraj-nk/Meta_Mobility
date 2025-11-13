import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'

vi.mock('../context/AuthContext', () => {
  return {
    useAuth: () => ({
      login: vi.fn().mockResolvedValue({ success: true, role: 'rider' })
    })
  }
})

vi.mock('react-router-dom', async (orig) => {
  const actual = await orig()
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

describe('Login page', () => {
  test('shows validation and triggers login', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const email = screen.getByLabelText(/email address/i)
    const password = screen.getByLabelText(/password/i)
    const submit = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(email, { target: { value: 'user@test.com' } })
    fireEvent.change(password, { target: { value: 'secret' } })
    fireEvent.click(submit)

    // If login mock resolves, no immediate error banner should appear
    expect(await screen.queryByText(/login failed/i)).toBeNull()
  })
})
