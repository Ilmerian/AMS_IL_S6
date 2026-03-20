// src/services/__tests__/AccessService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// IMPORTANT : Les mocks doivent être avant l'import du service
// Mock des variables d'environnement
vi.mock('../../../src/config/env', () => ({
  ENV: {
    SUPABASE_URL: 'https://mock.supabase.co',
    SUPABASE_ANON: 'mock-anon-key'
  }
}))

// Mock de supabaseClient - on importe notre mock
import { supabase } from '../../test/mocks/supabaseClient'

// Mock des services
vi.mock('../RoleService', () => ({
  RoleService: {
    listForRoom: vi.fn()
  }
}))

vi.mock('../RoomService', () => ({
  RoomService: {
    get: vi.fn()
  }
}))

// Maintenant on peut importer le service à tester
import { AccessService } from '../AccessService'

describe('AccessService - Permissions Régie', () => {
  const mockRoomId = 123
  const mockUserId = 'user123'

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Configuration par défaut du mock supabase
    supabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: mockUserId } } 
    })
  })

  it('isManager retourne true si l\'utilisateur est manager', async () => {
    const { RoleService } = await import('../RoleService')
    RoleService.listForRoom.mockResolvedValue([
      { userId: mockUserId, isManager: true }
    ])

    const result = await AccessService.isManager(mockRoomId)
    expect(result).toBe(true)
    expect(RoleService.listForRoom).toHaveBeenCalledWith(mockRoomId)
  })

  it('isManager retourne false si l\'utilisateur n\'est pas manager', async () => {
    const { RoleService } = await import('../RoleService')
    RoleService.listForRoom.mockResolvedValue([])

    const result = await AccessService.isManager(mockRoomId)
    expect(result).toBe(false)
  })

  it('isOwner retourne true si l\'utilisateur est propriétaire', async () => {
    const { RoomService } = await import('../RoomService')
    RoomService.get.mockResolvedValue({ ownerId: mockUserId })

    const result = await AccessService.isOwner(mockRoomId)
    expect(result).toBe(true)
    expect(RoomService.get).toHaveBeenCalledWith(mockRoomId)
  })

  it('isOwner retourne false si l\'utilisateur n\'est pas propriétaire', async () => {
    const { RoomService } = await import('../RoomService')
    RoomService.get.mockResolvedValue({ ownerId: 'otherUser' })

    const result = await AccessService.isOwner(mockRoomId)
    expect(result).toBe(false)
  })

  it('isManager retourne false si l\'utilisateur n\'est pas connecté', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const result = await AccessService.isManager(mockRoomId)
    expect(result).toBe(false)
  })

  it('isOwner retourne false si l\'utilisateur n\'est pas connecté', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } })

    const result = await AccessService.isOwner(mockRoomId)
    expect(result).toBe(false)
  })
})