
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Clock3,
  CreditCard,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import axios from 'axios'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

interface MembershipPlan {
  _id: string
  name: string
  description: string
  durationDays: number
  price: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface PlansResponse {
  success: boolean
  count: number
  data: MembershipPlan[]
}

interface PlanForm {
  name: string
  description: string
  durationDays: string
  price: string
}

const emptyForm: PlanForm = {
  name: '',
  description: '',
  durationDays: '30',
  price: '',
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'The request failed. Please try again.'
  }

  if (error instanceof Error) return error.message

  return 'Something went wrong. Please try again.'
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(price)
}

function formatDate(date: string): string {
  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) return 'Not available'

  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function MembershipPlans() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null)
  const [form, setForm] = useState<PlanForm>(emptyForm)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get<PlansResponse>('/membership-plans')

      if (!response.data.success || !Array.isArray(response.data.data)) {
        throw new Error('The membership plans response was invalid.')
      }

      setPlans(response.data.data.filter((plan) => plan.isActive))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  const openCreateForm = () => {
    setEditingPlan(null)
    setForm(emptyForm)
    setError('')
    setNotice('')
    setFormOpen(true)
  }

  const openEditForm = (plan: MembershipPlan) => {
    setEditingPlan(plan)
    setForm({
      name: plan.name,
      description: plan.description,
      durationDays: String(plan.durationDays),
      price: String(plan.price),
    })
    setError('')
    setNotice('')
    setFormOpen(true)
  }

  const closeForm = () => {
    if (saving) return
    setFormOpen(false)
    setEditingPlan(null)
    setForm(emptyForm)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')

    const name = form.name.trim()
    const description = form.description.trim()
    const durationDays = Number(form.durationDays)
    const price = Number(form.price)

    if (!name || !description) {
      setError('Enter both a plan name and description.')
      return
    }

    if (!Number.isInteger(durationDays) || durationDays < 1) {
      setError('Duration must be a whole number of at least 1 day.')
      return
    }

    if (!Number.isFinite(price) || price < 0) {
      setError('Price must be zero or greater.')
      return
    }

    const payload = { name, description, durationDays, price }

    setSaving(true)

    try {
      if (editingPlan) {
        await api.patch(
          `/membership-plans/${editingPlan._id}`,
          payload,
        )
        setNotice('Membership plan updated successfully.')
      } else {
        await api.post('/membership-plans', payload)
        setNotice('Membership plan created successfully.')
      }

      setFormOpen(false)
      setEditingPlan(null)
      setForm(emptyForm)
      await loadPlans()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (plan: MembershipPlan) => {
    const confirmed = window.confirm(
      `Deactivate "${plan.name}"? It will no longer appear in the active plans list.`,
    )

    if (!confirmed) return

    setError('')
    setNotice('')

    try {
      await api.delete(`/membership-plans/${plan._id}`)
      setNotice(`"${plan.name}" has been deactivated.`)
      await loadPlans()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="min-h-screen bg-[#090b09] text-white">
      <header className="border-b border-white/10 bg-[#090b09]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-sm text-gray-300 transition hover:text-lime-400"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <ShieldCheck size={17} className="text-lime-400" />
            {isAdmin ? 'Admin access' : 'Member access'}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold tracking-widest text-lime-400">
              MEMBERSHIPS
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Membership Plans
            </h1>
            <p className="mt-3 max-w-2xl text-gray-400">
              Explore gym plans, compare prices, and find the duration that
              suits your fitness goals.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void loadPlans()}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm font-medium text-gray-200 transition hover:border-lime-400/40 disabled:opacity-50"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            {isAdmin && (
              <button
                onClick={openCreateForm}
                className="flex items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-3 text-sm font-bold text-black transition hover:bg-lime-300"
              >
                <Plus size={18} />
                Create Plan
              </button>
            )}
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-4 rounded-xl border border-red-400/30 bg-red-400/5 p-4"
          >
            <p className="text-sm text-red-200">{error}</p>
            <button
              onClick={() => setError('')}
              aria-label="Dismiss error"
              className="text-red-200 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {notice && (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-lime-400/30 bg-lime-400/5 p-4">
            <p className="text-sm text-lime-200">{notice}</p>
            <button
              onClick={() => setNotice('')}
              aria-label="Dismiss message"
              className="text-lime-200 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {formOpen && isAdmin && (
          <section className="rounded-2xl border border-lime-400/20 bg-[#111411] p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  {editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  {editingPlan
                    ? 'Update the plan details below.'
                    : 'Add a new plan to the active plans list.'}
                </p>
              </div>

              <button
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-gray-300">Plan name</span>
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="e.g. Monthly Plan"
                    className="w-full rounded-lg border border-white/10 bg-[#090b09] px-4 py-3 text-white outline-none transition focus:border-lime-400"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-gray-300">Duration (days)</span>
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={form.durationDays}
                    onChange={(event) =>
                      setForm({ ...form, durationDays: event.target.value })
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#090b09] px-4 py-3 text-white outline-none transition focus:border-lime-400"
                  />
                </label>

                <label className="space-y-2 text-sm sm:col-span-2">
                  <span className="text-gray-300">Description</span>
                  <textarea
                    required
                    minLength={3}
                    maxLength={500}
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                    placeholder="Describe what this plan offers"
                    className="w-full resize-y rounded-lg border border-white/10 bg-[#090b09] px-4 py-3 text-white outline-none transition focus:border-lime-400"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-gray-300">Price (₹)</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      setForm({ ...form, price: event.target.value })
                    }
                    placeholder="1500"
                    className="w-full rounded-lg border border-white/10 bg-[#090b09] px-4 py-3 text-white outline-none transition focus:border-lime-400"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-lime-400 px-5 py-3 font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                  {saving
                    ? 'Saving...'
                    : editingPlan
                      ? 'Save Changes'
                      : 'Create Plan'}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-white/10 px-5 py-3 text-gray-300 transition hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {loading ? (
          <div className="grid min-h-56 place-items-center">
            <div className="text-center">
              <LoaderCircle
                size={30}
                className="mx-auto animate-spin text-lime-400"
              />
              <p className="mt-3 text-sm text-gray-400">
                Loading membership plans...
              </p>
            </div>
          </div>
        ) : plans.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
            <CreditCard size={36} className="mx-auto text-lime-400" />
            <h2 className="mt-4 text-xl font-semibold">
              No active plans available
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
              {isAdmin
                ? 'Create your first membership plan to make it available here.'
                : 'There are no active membership plans at the moment. Please check again later.'}
            </p>
            {isAdmin && (
              <button
                onClick={openCreateForm}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-lime-400 px-4 py-3 font-bold text-black transition hover:bg-lime-300"
              >
                <Plus size={18} />
                Create First Plan
              </button>
            )}
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan._id}
                className="flex flex-col rounded-2xl border border-white/10 bg-[#111411] p-6 transition hover:-translate-y-1 hover:border-lime-400/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-lime-400/10 text-lime-400">
                    <CreditCard size={24} />
                  </div>

                  <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold text-lime-300">
                    Active
                  </span>
                </div>

                <h2 className="mt-5 text-xl font-bold">{plan.name}</h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-gray-400">
                  {plan.description}
                </p>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-3xl font-bold text-lime-400">
                    {formatPrice(plan.price)}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-gray-300">
                  <Clock3 size={17} className="text-lime-400" />
                  {plan.durationDays} days
                </div>

                <div className="mt-5 border-t border-white/10 pt-4 text-xs text-gray-500">
                  Last updated: {formatDate(plan.updatedAt)}
                </div>

                {isAdmin && (
                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => openEditForm(plan)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm font-medium text-gray-200 transition hover:border-lime-400/40 hover:text-lime-300"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>

                    <button
                      onClick={() => void handleDeactivate(plan)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-400/20 px-3 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-400/10"
                    >
                      <Trash2 size={16} />
                      Deactivate
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
