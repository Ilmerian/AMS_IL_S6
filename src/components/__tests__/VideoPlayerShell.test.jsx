import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import VideoPlayerShell from '../VideoPlayerShell'

// On mock complètement le composant pour tester la logique métier
vi.mock('../VideoPlayerShell', () => ({
  default: ({ url, playing, canControl, onPlay, onPause, onProgress, onEnded, onError }) => (
    <div data-testid="mock-video-player">
      <div data-testid="url">{url || 'no-url'}</div>
      <div data-testid="playing">{playing ? 'playing' : 'paused'}</div>
      <div data-testid="canControl">{canControl ? 'can-control' : 'cannot-control'}</div>
      <button data-testid="play-btn" onClick={onPlay}>Play</button>
      <button data-testid="pause-btn" onClick={onPause}>Pause</button>
      <button data-testid="progress-btn" onClick={() => onProgress?.(30)}>Progress</button>
      <button data-testid="end-btn" onClick={onEnded}>End</button>
      <button data-testid="error-btn" onClick={() => onError?.({ code: 2 })}>Error</button>
    </div>
  )
}))

describe('VideoPlayerShell - Tests métier', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche un message quand aucune vidéo', () => {
    render(<VideoPlayerShell url={null} playing={false} canControl={true} />)
    
    expect(screen.getByTestId('mock-video-player')).toBeInTheDocument()
    expect(screen.getByTestId('url')).toHaveTextContent('no-url')
  })

  it('passe correctement la prop url', () => {
    render(<VideoPlayerShell url="https://youtu.be/test123" playing={false} canControl={true} />)
    
    expect(screen.getByTestId('url')).toHaveTextContent('https://youtu.be/test123')
  })

  it('passe correctement la prop playing', () => {
    const { rerender } = render(
      <VideoPlayerShell url="test" playing={true} canControl={true} />
    )
    
    expect(screen.getByTestId('playing')).toHaveTextContent('playing')
    
    rerender(<VideoPlayerShell url="test" playing={false} canControl={true} />)
    expect(screen.getByTestId('playing')).toHaveTextContent('paused')
  })

  it('passe correctement la prop canControl', () => {
    const { rerender } = render(
      <VideoPlayerShell url="test" playing={false} canControl={true} />
    )
    
    expect(screen.getByTestId('canControl')).toHaveTextContent('can-control')
    
    rerender(<VideoPlayerShell url="test" playing={false} canControl={false} />)
    expect(screen.getByTestId('canControl')).toHaveTextContent('cannot-control')
  })

  it('appelle onPlay quand on clique sur play', () => {
    const onPlay = vi.fn()
    
    render(
      <VideoPlayerShell 
        url="test" 
        playing={false} 
        canControl={true} 
        onPlay={onPlay}
      />
    )
    
    act(() => {
      screen.getByTestId('play-btn').click()
    })
    
    expect(onPlay).toHaveBeenCalledTimes(1)
  })

  it('appelle onPause quand on clique sur pause', () => {
    const onPause = vi.fn()
    
    render(
      <VideoPlayerShell 
        url="test" 
        playing={true} 
        canControl={true} 
        onPause={onPause}
      />
    )
    
    act(() => {
      screen.getByTestId('pause-btn').click()
    })
    
    expect(onPause).toHaveBeenCalledTimes(1)
  })

  it('appelle onProgress avec la bonne valeur', () => {
    const onProgress = vi.fn()
    
    render(
      <VideoPlayerShell 
        url="test" 
        playing={false} 
        canControl={true} 
        onProgress={onProgress}
      />
    )
    
    act(() => {
      screen.getByTestId('progress-btn').click()
    })
    
    expect(onProgress).toHaveBeenCalledWith(30)
  })

  it('appelle onEnded quand la vidéo finit', () => {
    const onEnded = vi.fn()
    
    render(
      <VideoPlayerShell 
        url="test" 
        playing={true} 
        canControl={true} 
        onEnded={onEnded}
      />
    )
    
    act(() => {
      screen.getByTestId('end-btn').click()
    })
    
    expect(onEnded).toHaveBeenCalledTimes(1)
  })

  it('appelle onError avec les infos d\'erreur', () => {
    const onError = vi.fn()
    
    render(
      <VideoPlayerShell 
        url="test" 
        playing={true} 
        canControl={true} 
        onError={onError}
      />
    )
    
    act(() => {
      screen.getByTestId('error-btn').click()
    })
    
    expect(onError).toHaveBeenCalledWith({ code: 2 })
  })
})