import { useState } from 'react'
import PitchForm from '../components/pitch/PitchForm'
import { PitchService } from '../services/PitchService'

export default function PitchNew() {
  const [msg, setMsg] = useState('')
  const onCreate = async (payload) => {
    const created = await PitchService.create(payload)
    setMsg(`Created: ${created.title}`)
  }
  return (
    <div style={{ padding: 16 }}>
      <h1>New Pitch</h1>
      <PitchForm onSubmit={onCreate} />
      {msg && <div role="status" style={{ marginTop:12 }}>{msg}</div>}
    </div>
  )
}
