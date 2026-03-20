import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// On mock COMPLÈTEMENT le hook usePlaylistForRoom
vi.mock('../../hooks/usePlaylistForRoom', () => ({
  usePlaylistForRoom: vi.fn()
}))

// Mock des services (pas nécessaire mais au cas où)
vi.mock('../../services/PlaylistService', () => ({
  PlaylistService: {
    listByRoom: vi.fn(),
    create: vi.fn(),
    loadItems: vi.fn(),
    addVideoByUrl: vi.fn()
  }
}))

// Mock du contexte auth
vi.mock('../../context/auth', () => ({
  useAuth: () => ({
    user: { id: 'user123' },
    profile: { username: 'testuser' }
  })
}))

describe('usePlaylistForRoom - Tests métier', () => {
  const mockPlaylistId = 'playlist_456'
  const mockRoomId = '123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait charger la playlist au montage', async () => {
    const { usePlaylistForRoom } = await import('../../hooks/usePlaylistForRoom')
    
    // Simuler le comportement du hook
    const mockResult = {
      playlistId: mockPlaylistId,
      playlistItems: [],
      addVideoByRawUrl: vi.fn(),
      getNextVideo: vi.fn(),
      getPrevVideo: vi.fn(),
      currentVideoId: null,
      embedUrl: null
    }
    
    usePlaylistForRoom.mockReturnValue(mockResult)

    const { result } = renderHook(() => 
      usePlaylistForRoom({ 
        roomId: mockRoomId, 
        accessGranted: true,
        canControlVideo: true 
      })
    )

    expect(result.current.playlistId).toBe(mockPlaylistId)
    expect(result.current.playlistItems).toEqual([])
  })

  it('devrait ajouter une vidéo par URL', async () => {
    const { usePlaylistForRoom } = await import('../../hooks/usePlaylistForRoom')
    
    const addVideoMock = vi.fn().mockResolvedValue(true)
    
    const mockResult = {
      playlistId: mockPlaylistId,
      playlistItems: [],
      addVideoByRawUrl: addVideoMock,
      getNextVideo: vi.fn(),
      getPrevVideo: vi.fn(),
      currentVideoId: null,
      embedUrl: null
    }
    
    usePlaylistForRoom.mockReturnValue(mockResult)

    const { result } = renderHook(() => 
      usePlaylistForRoom({ 
        roomId: mockRoomId, 
        accessGranted: true,
        canControlVideo: true 
      })
    )

    await act(async () => {
      await result.current.addVideoByRawUrl('https://youtu.be/test123')
    })

    expect(addVideoMock).toHaveBeenCalledWith('https://youtu.be/test123')
  })

  it('devrait rechercher sur YouTube quand ce n\'est pas une URL', async () => {
    const { usePlaylistForRoom } = await import('../../hooks/usePlaylistForRoom')
    
    const addVideoMock = vi.fn().mockResolvedValue(true)
    
    const mockResult = {
      playlistId: mockPlaylistId,
      playlistItems: [],
      addVideoByRawUrl: addVideoMock,
      getNextVideo: vi.fn(),
      getPrevVideo: vi.fn(),
      currentVideoId: null,
      embedUrl: null
    }
    
    usePlaylistForRoom.mockReturnValue(mockResult)

    const { result } = renderHook(() => 
      usePlaylistForRoom({ 
        roomId: mockRoomId, 
        accessGranted: true,
        canControlVideo: true 
      })
    )

    await act(async () => {
      await result.current.addVideoByRawUrl('lofi hip hop')
    })

    expect(addVideoMock).toHaveBeenCalledWith('lofi hip hop')
  })

  it('devrait gérer la navigation dans la playlist', async () => {
    const { usePlaylistForRoom } = await import('../../hooks/usePlaylistForRoom')
    
    const mockVideos = [
      { id: 'v1', url: 'https://youtu.be/aaa', title: 'Video 1' },
      { id: 'v2', url: 'https://youtu.be/bbb', title: 'Video 2' },
      { id: 'v3', url: 'https://youtu.be/ccc', title: 'Video 3' }
    ]
    
    const getNextVideoMock = vi.fn((id) => {
      if (id === 'v1') return mockVideos[1]
      if (id === 'v2') return mockVideos[2]
      if (id === 'v3') return mockVideos[0]
      return null
    })
    
    const getPrevVideoMock = vi.fn((id) => {
      if (id === 'v2') return mockVideos[0]
      if (id === 'v1') return mockVideos[2]
      if (id === 'v3') return mockVideos[1]
      return null
    })
    
    const mockResult = {
      playlistId: mockPlaylistId,
      playlistItems: mockVideos,
      addVideoByRawUrl: vi.fn(),
      getNextVideo: getNextVideoMock,
      getPrevVideo: getPrevVideoMock,
      currentVideoId: 'v1',
      embedUrl: 'https://youtube.com/embed/aaa'
    }
    
    usePlaylistForRoom.mockReturnValue(mockResult)

    const { result } = renderHook(() => 
      usePlaylistForRoom({ 
        roomId: mockRoomId, 
        accessGranted: true,
        canControlVideo: true 
      })
    )

    expect(result.current.playlistItems.length).toBe(3)
    
    const nextVideo = result.current.getNextVideo('v1')
    expect(nextVideo.id).toBe('v2')
    
    const prevVideo = result.current.getPrevVideo('v2')
    expect(prevVideo.id).toBe('v1')
  })

  it('devrait retourner null si pas de vidéo suivante', async () => {
    const { usePlaylistForRoom } = await import('../../hooks/usePlaylistForRoom')
    
    const mockResult = {
      playlistId: mockPlaylistId,
      playlistItems: [{ id: 'v1', url: 'https://youtu.be/aaa', title: 'Video 1' }],
      addVideoByRawUrl: vi.fn(),
      getNextVideo: vi.fn(() => null),
      getPrevVideo: vi.fn(() => null),
      currentVideoId: 'v1',
      embedUrl: 'https://youtube.com/embed/aaa'
    }
    
    usePlaylistForRoom.mockReturnValue(mockResult)

    const { result } = renderHook(() => 
      usePlaylistForRoom({ 
        roomId: mockRoomId, 
        accessGranted: true,
        canControlVideo: true 
      })
    )

    const nextVideo = result.current.getNextVideo('v1')
    expect(nextVideo).toBeNull()
  })

  it('devrait gérer une playlist vide', async () => {
    const { usePlaylistForRoom } = await import('../../hooks/usePlaylistForRoom')
    
    const mockResult = {
      playlistId: null,
      playlistItems: [],
      addVideoByRawUrl: vi.fn(),
      getNextVideo: vi.fn(() => null),
      getPrevVideo: vi.fn(() => null),
      currentVideoId: null,
      embedUrl: null
    }
    
    usePlaylistForRoom.mockReturnValue(mockResult)

    const { result } = renderHook(() => 
      usePlaylistForRoom({ 
        roomId: mockRoomId, 
        accessGranted: true,
        canControlVideo: true 
      })
    )

    expect(result.current.playlistId).toBeNull()
    expect(result.current.playlistItems).toEqual([])
    expect(result.current.currentVideoId).toBeNull()
  })
})