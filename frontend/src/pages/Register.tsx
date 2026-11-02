
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Dumbbell, ImagePlus, UserRound } from 'lucide-react'
import { useAuth, getErrorMessage } from '../contexts/AuthContext'

export default function Register() {
  const { user, loading, register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Release the temporary image preview when the selected image changes.
  useEffect(() => {
    if (!profileImage) {
      setPreview('')
      return
    }

    const url = URL.createObjectURL(profileImage)
    setPreview(url)

    return () => URL.revokeObjectURL(url)
  }, [profileImage])

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#090b09] text-lime-400">Checking session...</div>
  }

  if (user) return <Navigate to="/dashboard" replace />

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.')
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('The image must be 5 MB or smaller.')
      event.target.value = ''
      return
    }

    setError('')
    setProfileImage(file)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!profileImage) {
      setError('Please select a profile picture.')
      return
    }

    // Names match the backend validator and upload middleware.
    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('phone', phone.trim())
    formData.append('email', email.trim())
    formData.append('password', password)
    formData.append('profileImage', profileImage)

    setSubmitting(true)

    try {
      await register(formData)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090b09] px-4 py-10 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#101310] p-6 shadow-2xl sm:p-9">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-400 text-black">
            <Dumbbell size={25} />
          </span>
          <span className="text-2xl font-bold">FitTrack<span className="text-lime-400">.</span></span>
        </Link>

        <p className="text-sm font-semibold uppercase tracking-widest text-lime-400">Get started</p>
        <h1 className="mt-2 text-3xl font-bold">Create your account</h1>
        <p className="mt-2 text-sm text-gray-400">Join FitTrack and take control of your fitness journey.</p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="mb-2 block text-sm text-gray-300">Full name</label>
            <input
              id="name"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your full name"
              autoComplete="name"
              className="w-full rounded-xl border border-white/10 bg-[#090b09] px-4 py-3 outline-none focus:border-lime-400"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-sm text-gray-300">Phone number</label>
            <input
              id="phone"
              type="tel"
              required
              pattern="\+?[0-9]{10,15}"
              title="Enter 10–15 digits, optionally starting with +"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="9876543210"
              autoComplete="tel"
              className="w-full rounded-xl border border-white/10 bg-[#090b09] px-4 py-3 outline-none focus:border-lime-400"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="mb-2 block text-sm text-gray-300">Email address</label>
            <input
              id="register-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-[#090b09] px-4 py-3 outline-none focus:border-lime-400"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="mb-2 block text-sm text-gray-300">Password</label>
            <input
              id="register-password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="w-full rounded-xl border border-white/10 bg-[#090b09] px-4 py-3 outline-none focus:border-lime-400"
            />
          </div>

          <div>
            <span className="mb-2 block text-sm text-gray-300">Profile picture</span>
            <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-white/20 bg-[#090b09] p-4 transition hover:border-lime-400/60">
              {preview ? (
                <img src={preview} alt="Profile preview" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-full bg-lime-400/10 text-lime-400">
                  {profileImage ? <ImagePlus size={25} /> : <UserRound size={25} />}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{profileImage ? profileImage.name : 'Choose a photo'}</span>
                <span className="mt-1 block text-xs text-gray-500">JPG, PNG or WebP · Maximum 5 MB</span>
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={handleImageChange}
                className="sr-only"
              />
            </label>
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
            {submitting ? 'Creating account...' : 'Create member account'}
          </button>

          <p className="text-xs leading-5 text-gray-500">
            Public registration creates a Member account. Administrator accounts are managed separately.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-lime-400 hover:text-lime-300">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
