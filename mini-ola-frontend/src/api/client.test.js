import { describe, test, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
})

describe('api client interceptors', () => {
  test('request interceptor attaches Authorization from localStorage', async () => {
    const instance = function (config = {}) {
      return Promise.resolve({ data: { ok: true }, config })
    }
    instance.post = vi.fn()
    instance.get = vi.fn()
    instance.put = vi.fn()
    instance.defaults = { headers: { common: {} } }
    instance.interceptors = {
      request: { use: vi.fn((fn) => { instance._req = fn }) },
      response: { use: vi.fn((ok, err) => { instance._rok = ok; instance._rer = err }) }
    }

    const axios = {
      create: vi.fn(() => instance),
      post: vi.fn()
    }

    vi.doMock('axios', () => ({ default: axios, __esModule: true }))
    const { default: client } = await import('./client')

    localStorage.setItem('accessToken', 'abc')

    const cfg = await instance._req({ headers: {} })
    expect(cfg.headers.Authorization).toBe('Bearer abc')
    expect(client).toBeTypeOf('function')
  })

  test('response 401 without refreshToken yields Unauthorized', async () => {
    const instance = function (config = {}) { return Promise.resolve({ data: { ok: true }, config }) }
    instance.post = vi.fn()
    instance.defaults = { headers: { common: {} } }
    instance.interceptors = {
      request: { use: vi.fn() },
      response: { use: vi.fn((ok, err) => { instance._rer = err }) }
    }

    const axios = { create: vi.fn(() => instance), post: vi.fn() }
    vi.doMock('axios', () => ({ default: axios, __esModule: true }))
    await import('./client')

    const error = { config: {}, response: { status: 401 }, message: 'Unauthorized' }
    await expect(instance._rer(error)).rejects.toMatchObject({ message: 'Unauthorized' })
  })

  test('response 401 with refresh retries original and updates tokens', async () => {
    const instance = function (config = {}) { instance._last = config; return Promise.resolve({ data: { ok: true }, config }) }
    instance.post = vi.fn()
    instance.defaults = { headers: { common: {} } }
    instance.interceptors = {
      request: { use: vi.fn() },
      response: { use: vi.fn((ok, err) => { instance._rer = err }) }
    }
    const axios = {
      create: vi.fn(() => instance),
      post: vi.fn().mockResolvedValue({ data: { data: { accessToken: 'newAT', refreshToken: 'newRT' } } })
    }

    vi.doMock('axios', () => ({ default: axios, __esModule: true }))
    await import('./client')

    localStorage.setItem('refreshToken', 'rt')
    const error = { config: { headers: {} }, response: { status: 401 }, message: 'Unauthorized' }

    const result = await instance._rer(error)
    expect(localStorage.getItem('accessToken')).toBe('newAT')
    expect(localStorage.getItem('refreshToken')).toBe('newRT')
    expect(instance._last).toBeDefined()
  })
})
