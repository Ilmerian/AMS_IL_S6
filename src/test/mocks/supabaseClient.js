// src/test/mocks/supabaseClient.js
import { vi } from 'vitest'

export const supabase = {
  auth: {
    getUser: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis()
  })),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    send: vi.fn()
  })),
  removeChannel: vi.fn(),
  getChannels: vi.fn(() => [])
}

// Mock complet du module
vi.mock('../../lib/supabaseClient', () => ({
  supabase
}))