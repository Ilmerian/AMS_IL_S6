// src/hooks/__tests__/useVideoSync.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVideoSync } from '../useVideoSync'

// Mock des services
const mockRoomServiceGet = vi.fn()
const mockRoomServiceUpdatePlaybackState = vi.fn()
const mockRoomServiceAddVideoHistory = vi.fn()

vi.mock('../../services/RoomService', () => ({
  RoomService: {
    get: (...args) => mockRoomServiceGet(...args),
    updatePlaybackState: (...args) => mockRoomServiceUpdatePlaybackState(...args),
    addVideoHistory: (...args) => mockRoomServiceAddVideoHistory(...args)
  }
}))

vi.mock('../../utils/youtube', () => ({
  getYouTubeId: vi.fn((url) => url === 'newVideo456' ? 'newVideo456' : 'video123'),
  toWatchUrl: vi.fn((id) => `https://youtu.be/${id}`),
  toEmbedUrl: vi.fn((id) => `https://youtube.com/embed/${id}`)
}))

vi.mock('../../context/auth', () => ({
  useAuth: () => ({
    user: { id: 'spectator123' },
    profile: { username: 'spectateur' }
  })
}))

describe('useVideoSync - Tests Régie Spectateur', () => {
  const mockRoomId = '123'
  const mockSpectatorId = 'spectator123'

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Configuration par défaut - retourne immédiatement
    mockRoomServiceGet.mockResolvedValue({ 
      current_video_id: 'video123',
      is_playing: true 
    })
    mockRoomServiceUpdatePlaybackState.mockResolvedValue({})
    mockRoomServiceAddVideoHistory.mockResolvedValue({})
  })

  describe('🔒 Actions interdites pour les spectateurs', () => {
    it('devrait avoir canControl = false pour un spectateur', () => {
      const { result } = renderHook(() => 
        useVideoSync({ 
          roomId: mockRoomId, 
          user: { id: mockSpectatorId }, 
          userRole: 'member'
        })
      )

      expect(result.current.controlInfo.canControl).toBe(false)
    })

    it('ne devrait PAS permettre l\'avancement rapide (seek) pour un spectateur', () => {
      const { result } = renderHook(() => 
        useVideoSync({ 
          roomId: mockRoomId, 
          user: { id: mockSpectatorId }, 
          userRole: 'member'
        })
      )

      act(() => {
        result.current.triggerSeek(30)
      })

      expect(mockRoomServiceUpdatePlaybackState).not.toHaveBeenCalled()
    })

    it('ne devrait PAS permettre la lecture (play) pour un spectateur', () => {
      const { result } = renderHook(() => 
        useVideoSync({ 
          roomId: mockRoomId, 
          user: { id: mockSpectatorId }, 
          userRole: 'member'
        })
      )

      act(() => {
        result.current.triggerPlay()
      })

      expect(mockRoomServiceUpdatePlaybackState).not.toHaveBeenCalled()
    })

    it('ne devrait PAS permettre la pause pour un spectateur', () => {
      const { result } = renderHook(() => 
        useVideoSync({ 
          roomId: mockRoomId, 
          user: { id: mockSpectatorId }, 
          userRole: 'member'
        })
      )

      act(() => {
        result.current.triggerPause()
      })

      expect(mockRoomServiceUpdatePlaybackState).not.toHaveBeenCalled()
    })

    it('ne devrait PAS permettre de changer de vidéo pour un spectateur', async () => {
      const { result } = renderHook(() => 
        useVideoSync({ 
          roomId: mockRoomId, 
          user: { id: mockSpectatorId }, 
          userRole: 'member'
        })
      )

      await act(async () => {
        await result.current.changeVideo('newVideo456')
      })

      expect(mockRoomServiceUpdatePlaybackState).not.toHaveBeenCalled()
    })
  })

  describe('👥 Tests multi-utilisateurs', () => {
    it('devrait avoir l\'état initial après montage', () => {
      mockRoomServiceGet.mockResolvedValue({ 
        current_video_id: 'video123',
        is_playing: true 
      })

      const { result } = renderHook(() => 
        useVideoSync({ 
          roomId: mockRoomId, 
          user: { id: mockSpectatorId }, 
          userRole: 'member'
        })
      )

      // Vérifier que les valeurs initiales sont correctes
      expect(result.current.syncVideoId).toBe(null)
      expect(result.current.syncIsPlaying).toBe(false)
    })
  })

  describe('🔌 Tests déconnexion du régisseur', () => {
    it('devrait avoir canControl = true pour un manager', () => {
      const { result } = renderHook(() => 
        useVideoSync({ 
          roomId: mockRoomId, 
          user: { id: mockSpectatorId }, 
          userRole: 'manager'
        })
      )

      expect(result.current.controlInfo.canControl).toBe(true)
    })

    it('devrait permettre la lecture pour un manager', () => {
      const { result } = renderHook(() => 
        useVideoSync({ 
          roomId: mockRoomId, 
          user: { id: mockSpectatorId }, 
          userRole: 'manager'
        })
      )

      act(() => {
        result.current.triggerPlay()
      })

      expect(mockRoomServiceUpdatePlaybackState).toHaveBeenCalled()
    })

    it('devrait permettre la pause pour un manager', () => {
      const { result } = renderHook(() => 
        useVideoSync({ 
          roomId: mockRoomId, 
          user: { id: mockSpectatorId }, 
          userRole: 'manager'
        })
      )

      act(() => {
        result.current.triggerPause()
      })

      expect(mockRoomServiceUpdatePlaybackState).toHaveBeenCalled()
    })

    it('devrait permettre de changer de vidéo pour un manager', async () => {
      const { result } = renderHook(() => 
        useVideoSync({ 
          roomId: mockRoomId, 
          user: { id: mockSpectatorId }, 
          userRole: 'manager'
        })
      )

      await act(async () => {
        await result.current.changeVideo('newVideo456')
      })

      expect(mockRoomServiceUpdatePlaybackState).toHaveBeenCalled()
    })
  })

  describe('🎮 Tests de contrôle pour régisseur', () => {
    it('devrait avoir canControl = true pour un owner', () => {
      const { result } = renderHook(() => 
        useVideoSync({ 
          roomId: mockRoomId, 
          user: { id: mockSpectatorId }, 
          userRole: 'owner'
        })
      )

      expect(result.current.controlInfo.canControl).toBe(true)
      expect(result.current.controlInfo.isOwner).toBe(true)
    })

    it('devrait déclencher une action de play avec timestamp', async () => {
      const { result } = renderHook(() => 
        useVideoSync({ 
          roomId: mockRoomId, 
          user: { id: mockSpectatorId }, 
          userRole: 'manager'
        })
      )

      await act(async () => {
        await result.current.triggerPlay(15.5)
      })

      expect(mockRoomServiceUpdatePlaybackState).toHaveBeenCalledWith(
        mockRoomId,
        expect.objectContaining({ isPlaying: true })
      )
    })
  })
})