import { useState } from 'react'
import { AuthService } from '../services/AuthService'
import Input from '../components/common/Input'
import Button from '../components/common/Button'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      await AuthService.signIn(email)
      setMsg('Check your email for the magic link.')
    } catch (err) {
      setMsg(err?.message || 'Sign-in error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fullbleed" style={{ paddingBlock: 24, maxWidth: 500 }}>
      <h1>Login</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <label>
          Email
          <Input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Magic Link'}
        </Button>
        {msg && <div role="status" style={{ opacity: .9 }}>{msg}</div>}
      </form>
    </div>
  )
}
