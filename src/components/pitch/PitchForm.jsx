import { useState } from 'react'
import Input from '../common/Input'
import Button from '../common/Button'

export default function PitchForm({ onSubmit }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setErr('')
    if (!title.trim()) { setErr('Title is required'); return }
    setLoading(true)
    try {
      await onSubmit?.({ title, description })
      setTitle(''); setDescription('')
    } catch (e) {
      setErr(e?.message || 'Failed to create')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handle} style={{ display: 'grid', gap: 10 }}>
      <label>Title<Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Awesome idea" /></label>
      <label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} style={{ resize:'vertical', padding:10, borderRadius:10 }}/></label>
      <Button disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
      {err && <div style={{ color:'tomato' }}>{err}</div>}
    </form>
  )
}
