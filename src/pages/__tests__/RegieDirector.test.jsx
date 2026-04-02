// src/pages/__tests__/RegieDirector.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock de supabase complet
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
    from: vi.fn((table) => {
      if (table === 'regie_state') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (table === 'rooms') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { room_id: 123, owner_id: 'owner-id' }, error: null }),
        };
      }
      if (table === 'roles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  }
}));

vi.mock('../../services/VideoService', () => ({
  VideoService: { searchYoutube: vi.fn() }
}));

vi.mock('../../services/RoomService', () => ({
  RoomService: { isManager: vi.fn() }
}));

vi.mock('../../services/RoleService', () => ({
  RoleService: {
    listMembers: vi.fn().mockResolvedValue([]),
    onRoleChange: vi.fn().mockReturnValue(() => {}),
  }
}));

vi.mock('../../components/VideoPlayerShell', () => ({
  default: () => <div data-testid="mock-video-player">Mock Player</div>
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import { RoomService } from '../../services/RoomService';
import { VideoService } from '../../services/VideoService';
import RegieDirector from '../RegieDirector';

describe('RegieDirector', () => {
  const mockRoomId = '123';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    RoomService.isManager.mockResolvedValue(true);
    VideoService.searchYoutube.mockResolvedValue([
      { id: { videoId: 'abc123' }, snippet: { title: 'Test Video', channelTitle: 'Test Channel' } }
    ]);
  });

  const waitForLoader = async () => {
    await waitFor(() => {
      expect(screen.queryByText(/SÉCURISATION DE LA RÉGIE/)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  };

  const renderComponent = async () => {
    render(
      <MemoryRouter initialEntries={[`/regie/${mockRoomId}/director`]}>
        <Routes>
          <Route path="/regie/:roomId/director" element={<RegieDirector />} />
          <Route path="/regie/:roomId/viewer" element={<div data-testid="viewer-page">Viewer Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    await waitForLoader();
  };

  const waitForLivePhase = async () => {
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ajouter une source \(\d+\/10\)\.\.\./)).toBeInTheDocument();
    }, { timeout: 3000 });
  };

  const clickOpenRegieButton = async () => {
    const openButton = screen.getByRole('button', { name: /OUVRIR LA RÉGIE/ });
    expect(openButton).not.toBeDisabled();
    fireEvent.click(openButton);
    await waitForLivePhase();
  };

  const waitForVideoCards = async (expectedCount) => {
    await waitFor(async () => {
      const broadcastButtons = screen.getAllByRole('button', { name: /ENVOYER AU DIRECT/ });
      expect(broadcastButtons.length).toBe(expectedCount);
    }, { timeout: 3000 });
  };

  it('vérifie les droits et redirige si non manager', async () => {
    RoomService.isManager.mockResolvedValue(false);
    render(
      <MemoryRouter initialEntries={[`/regie/${mockRoomId}/director`]}>
        <Routes>
          <Route path="/regie/:roomId/director" element={<RegieDirector />} />
          <Route path="/regie/:roomId/viewer" element={<div data-testid="viewer-page">Viewer Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId('viewer-page')).toBeInTheDocument();
    });
  });

  it('affiche la phase setup si playlist vide', async () => {
    await renderComponent();
    expect(screen.getByText(/Initialisation de la Régie/)).toBeInTheDocument();
  });

  it('ajoute une vidéo via URL et passe en phase live', async () => {
    await renderComponent();

    const input = screen.getByPlaceholderText(/Rechercher \(ex: lofi\) ou coller une URL/);
    fireEvent.change(input, { target: { value: 'https://youtu.be/abc123' } });
    const addButton = screen.getByRole('button', { name: /Rechercher/ });
    expect(addButton).not.toBeDisabled();
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/OUVRIR LA RÉGIE/)).not.toBeDisabled();
    });
    await clickOpenRegieButton();

    await waitForVideoCards(1);

    const saved = localStorage.getItem(`regie_director_playlist_${mockRoomId}`);
    expect(saved).toContain('abc123');
  });

  it('supprime une vidéo de la playlist et revient en phase setup', async () => {
    localStorage.setItem(`regie_director_playlist_${mockRoomId}`, JSON.stringify(['abc123']));
    await renderComponent();
    await waitForLivePhase();

    await waitForVideoCards(1);

    // Trouver le bouton de suppression via l'icône CloseIcon
    const closeIcon = screen.getByTestId('CloseIcon');
    const deleteButton = closeIcon.closest('button');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      // Après suppression, retour en phase setup
      expect(screen.getByText(/Initialisation de la Régie/)).toBeInTheDocument();
      const saved = localStorage.getItem(`regie_director_playlist_${mockRoomId}`);
      expect(JSON.parse(saved)).toEqual([]);
    }, { timeout: 3000 });
  });

  it('recherche sur YouTube si l’entrée n’est pas une URL', async () => {
    await renderComponent();

    const input = screen.getByPlaceholderText(/Rechercher \(ex: lofi\) ou coller une URL/);
    fireEvent.change(input, { target: { value: 'lofi hip hop' } });
    const searchButton = screen.getByRole('button', { name: /Rechercher/ });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(VideoService.searchYoutube).toHaveBeenCalledWith('lofi hip hop');
      expect(screen.getByText(/Test Video/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('ajoute une vidéo depuis les résultats de recherche', async () => {
    await renderComponent();

    const input = screen.getByPlaceholderText(/Rechercher \(ex: lofi\) ou coller une URL/);
    fireEvent.change(input, { target: { value: 'lofi hip hop' } });
    const searchButton = screen.getByRole('button', { name: /Rechercher/ });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/Test Video/)).toBeInTheDocument();
    }, { timeout: 3000 });

    const addResultButton = screen.getAllByRole('button').find(btn => btn.querySelector('[data-testid="PlaylistAddIcon"]'));
    fireEvent.click(addResultButton);

    await waitFor(() => {
      expect(screen.getByText(/OUVRIR LA RÉGIE/)).not.toBeDisabled();
    });
    await clickOpenRegieButton();

    await waitForVideoCards(1);

    const saved = localStorage.getItem(`regie_director_playlist_${mockRoomId}`);
    expect(saved).toContain('abc123');
  });

  it('diffuse une vidéo et met à jour regie_state', async () => {
    localStorage.setItem(`regie_director_playlist_${mockRoomId}`, JSON.stringify(['abc123']));
    await renderComponent();
    await waitForLivePhase();

    const broadcastButton = screen.getByRole('button', { name: /ENVOYER AU DIRECT/ });
    fireEvent.click(broadcastButton);

    const { supabase } = await import('../../lib/supabaseClient');
    expect(supabase.from).toHaveBeenCalledWith('regie_state');
  });

  it('limite le nombre de vidéos à 10', async () => {
    const tenVideos = Array.from({ length: 10 }, (_, i) => `id${i}`);
    localStorage.setItem(`regie_director_playlist_${mockRoomId}`, JSON.stringify(tenVideos));
    await renderComponent();
    await waitForLivePhase();

    const input = screen.getByPlaceholderText(/Ajouter une source \(10\/10\)\.\.\./);
    expect(input).toBeDisabled();
  });
});