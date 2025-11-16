import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('../api/client', () => {
  const api = {
    profile: vi.fn(),
    login: vi.fn(),
    loginDriver: vi.fn(),
    logoutToken: vi.fn()
  }
  const client = { defaults: { headers: { common: {} } } }
  return { default: client, api }
})

const { api } = await import('../api/client')

const HookProbe = () => {
  const auth = useAuth()
  // expose auth methods via DOM for test interaction
  return (
    <div>
      <button onClick={() => auth.login('USER@Email.com', 'pass')} aria-label="login" />
      <button onClick={() => auth.logout()} aria-label="logout" />
      <button onClick={() => auth.refreshProfile()} aria-label="refresh" />
      <div data-testid="role">{auth.user?.role || ''}</div>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
})

afterEach(() => {
  localStorage.clear()
})

describe('AuthContext', () => {
  test('login success as rider sets tokens and role', async () => {
    api.login.mockResolvedValueOnce({
      data: { data: { accessToken: 'at', refreshToken: 'rt', user: { role: 'rider', name: 'A' } } }
    })
    api.profile.mockResolvedValueOnce({ data: { data: { role: 'rider', name: 'A' } } })

    render(
      <AuthProvider>
        <HookProbe />
      </AuthProvider>
    )

    await act(async () => {
      await screen.getByLabelText('login').click()
    })

    expect(localStorage.getItem('accessToken')).toBe('at')
    expect(localStorage.getItem('refreshToken')).toBe('rt')
  })

  test('login falls back to driver on 401', async () => {
    api.login.mockRejectedValueOnce({ response: { status: 401 }, message: 'Unauthorized' })
    api.loginDriver.mockResolvedValueOnce({
      data: { data: { accessToken: 'at2', refreshToken: 'rt2', user: { role: 'driver', name: 'D' } } }
    })
    api.profile.mockResolvedValueOnce({ data: { data: { role: 'driver', name: 'D' } } })

    render(
      <AuthProvider>
        <HookProbe />
      </AuthProvider>
    )

    await act(async () => {
      await screen.getByLabelText('login').click()
    })

    expect(localStorage.getItem('accessToken')).toBe('at2')
    expect(localStorage.getItem('refreshToken')).toBe('rt2')
  })

  test('logout clears tokens and calls logoutToken when refreshToken exists', async () => {
    localStorage.setItem('accessToken', 'at')
    localStorage.setItem('refreshToken', 'rt')

    render(
      <AuthProvider>
        <HookProbe />
      </AuthProvider>
    )

    await act(async () => {
      await screen.getByLabelText('logout').click()
    })

    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(api.logoutToken).toHaveBeenCalled()
  })
})
