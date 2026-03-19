// src/test/mocks/services.js
import { vi } from 'vitest'

export const mockPlaylistService = {
  listByRoom: vi.fn(),
  create: vi.fn(),
  loadItems: vi.fn(),
  addVideoByUrl: vi.fn(),
  removeVideo: vi.fn(),
  reorderVideos: vi.fn()
}

export const mockVideoService = {
  searchYoutube: vi.fn(),
  getOrCreate: vi.fn(),
  getById: vi.fn()
}

export const mockRoomService = {
  get: vi.fn(),
  updatePlaybackState: vi.fn(),
  addVideoHistory: vi.fn()
}

// Mock automatique de tous les services
vi.mock('../../services/PlaylistService', () => ({
  PlaylistService: mockPlaylistService
}))

vi.mock('../../services/VideoService', () => ({
  VideoService: mockVideoService
}))

vi.mock('../../services/RoomService', () => ({
  RoomService: mockRoomService
}))