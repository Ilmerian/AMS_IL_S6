import { useEffect, useState } from 'react'
import { PitchService } from '../services/PitchService'
import Loader from '../components/common/Loader'
import PitchCard from '../components/pitch/PitchCard'

export default function Pitches() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const list = await PitchService.list()
        if (active) setItems(list)
      } catch (e) {
        setErr(e?.message || 'Failed to load')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  if (loading) return <Loader />
  if (err) return <div style={{ padding: 16, color: 'tomato' }}>{err}</div>

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <h1>Pitches</h1>
      {items.length === 0 ? <div>No pitches yet</div> : items.map(p => (
        <PitchCard key={p.id} pitch={p} />
      ))}
    </div>
  )
}
