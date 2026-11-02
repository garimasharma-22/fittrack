
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Dumbbell,
  LogOut,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const isAdmin = user?.role === 'ADMIN'
  const displayName = user?.name || 'FitTrack Member'

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const cardClass =
    'block min-w-0 rounded-2xl border border-white/10 bg-[#111411] p-5 transition hover:border-lime-400/50'

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#090b09] text-white">
      <header className="border-b border-white/10 bg-[#090b09]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime-400 text-black">
              <Activity size={23} />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                Fit<span className="text-lime-400">Track</span>
              </h1>
              <p className="text-xs text-gray-400">Gym management</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 transition hover:border-red-400/40 hover:text-red-300"
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex min-w-0 flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-medium tracking-wider text-lime-400">
              {isAdmin ? 'ADMIN WORKSPACE' : 'MEMBER WORKSPACE'}
            </p>

            <h2 className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome, {displayName.split(' ')[0]}!
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-400 sm:text-base">
              {isAdmin
                ? 'Manage your gym and its activities.'
                : 'Your fitness journey starts with consistency.'}
            </p>
          </div>

          <div className="flex min-w-0 max-w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:max-w-sm">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt="Profile"
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lime-400/10 text-lime-400">
                <UserRound size={24} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold">{displayName}</p>
              <p className="break-all text-sm text-gray-400">
                {user?.email || 'No email available'}
              </p>
              <span className="mt-1 inline-block rounded-full bg-lime-400/10 px-2 py-0.5 text-xs font-medium text-lime-300">
                {user?.role || 'MEMBER'}
              </span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/membership-plans" className={cardClass}>
            <div className="flex items-center gap-3">
              <CreditCard className="shrink-0 text-lime-400" size={22} />
              <h3 className="font-semibold">Membership Plans</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Browse available gym membership plans.
            </p>
          </Link>

          {!isAdmin && (
            <Link to="/my-memberships" className={cardClass}>
              <div className="flex items-center gap-3">
                <ShieldCheck className="shrink-0 text-lime-400" size={22} />
                <h3 className="font-semibold">My Memberships</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                View your membership status and dates.
              </p>
            </Link>
          )}

          <Link to="/payments" className={cardClass}>
            <div className="flex items-center gap-3">
              <CreditCard className="shrink-0 text-lime-400" size={22} />
              <h3 className="font-semibold">Payments</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              {isAdmin
                ? 'Record payments and review payment history.'
                : 'View your payment history.'}
            </p>
          </Link>

          <Link to="/my-workouts" className={cardClass}>
            <div className="flex items-center gap-3">
              <Dumbbell className="shrink-0 text-lime-400" size={22} />
              <h3 className="font-semibold">My Workouts</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              View your assigned workout plans and exercises.
            </p>
          </Link>

          {isAdmin && (
            <>
              <Link
                to="/workout-plans"
                className={`${cardClass} border-lime-400/20 bg-lime-400/[0.04]`}
              >
                <div className="flex items-center gap-3">
                  <Dumbbell className="shrink-0 text-lime-400" size={22} />
                  <h3 className="font-semibold">Admin Workout Plans</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Create, edit, manage, and deactivate workout plans for your gym.
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-lime-400">
                  Manage workout plans <Dumbbell size={16} />
                </span>
              </Link>

              <Link
                to="/workout-assignments"
                className={`${cardClass} border-lime-400/20 bg-lime-400/[0.04]`}
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="shrink-0 text-lime-400" size={22} />
                  <h3 className="font-semibold">Workout Assignments</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Assign plans to members, view assignments, and manage their status.
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-lime-400">
                  Manage assignments <ClipboardList size={16} />
                </span>
              </Link>

              <Link
              to="/membership-management"
              className={`${cardClass} border-lime-400/20 bg-lime-400/[0.04]`}
              >
              <div className="flex items-center gap-3">
                  <ShieldCheck className="shrink-0 text-lime-400" size={22} />
                  <h3 className="font-semibold">Membership Management</h3>
              </div>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                  View all memberships, assign plans to members, and manage membership
                  cancellations and renewals.
              </p>

              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-lime-400">
                  Manage memberships <ShieldCheck size={16} />
              </span>
              </Link>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111411] p-5">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-1 shrink-0 text-lime-400" size={23} />
            <div>
              <h3 className="font-semibold">
                {isAdmin ? 'Your gym workspace' : 'Keep moving forward'}
              </h3>
              <p className="mt-1 text-sm leading-6 text-gray-400">
                {isAdmin
                  ? 'Use the management pages above to maintain workout plans, assignments, and gym activities.'
                  : 'Stay consistent with your memberships and assigned workout plans. Small steps build lasting progress.'}
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 py-5 text-center text-xs text-gray-500">
          FitTrack &middot; Stay consistent. Get stronger.
        </footer>
      </main>
    </div>
  )
}
