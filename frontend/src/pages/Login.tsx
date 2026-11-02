
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Dumbbell, Eye, EyeOff } from 'lucide-react'
import { useAuth, getErrorMessage } from '../contexts/AuthContext'

export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#090b09] text-lime-400">Checking session...</div>
  }

  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(email.trim(), password)

      // Return to the page the user originally tried to open.
      const destination = location.state?.from?.pathname || '/dashboard'
      navigate(destination, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090b09] px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101310] p-6 shadow-2xl sm:p-9">
        <Link to="/" className="mb-9 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-400 text-black">
            <Dumbbell size={25} />
          </span>
          <span>
            <span className="block text-2xl font-bold">FitTrack<span className="text-lime-400">.</span></span>
            <span className="text-xs tracking-widest text-gray-500">GYM MANAGEMENT</span>
          </span>
        </Link>

        <p className="text-sm font-semibold uppercase tracking-widest text-lime-400">Welcome back</p>
        <h1 className="mt-2 text-3xl font-bold">Sign in to your account</h1>
        <p className="mt-2 text-sm text-gray-400">Manage your fitness journey in one place.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm text-gray-300">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-[#090b09] px-4 py-3 outline-none transition focus:border-lime-400"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm text-gray-300">Password</label>
            <div className="flex items-center rounded-xl border border-white/10 bg-[#090b09] pr-3 focus-within:border-lime-400">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
                className="text-gray-400 hover:text-lime-400"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-lime-400 px-4 py-3 font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-gray-400">
          New to FitTrack?{' '}
          <Link to="/register" className="font-semibold text-lime-400 hover:text-lime-300">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  )
}
