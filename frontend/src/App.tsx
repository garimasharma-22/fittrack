import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import MembershipPlans from './pages/MembershipPlans'
import MyMemberships from './pages/MyMemberships'
import Payments from './pages/Payments'
import MyWorkouts from './pages/MyWorkouts'
import WorkoutPlans from './pages/WorkoutPlans'
import WorkoutAssignments from './pages/WorkoutAssignments'
import MembershipManagement from './pages/MembershipManagement'

function HomeRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#090b09] text-lime-400">
        Loading FitTrack...
      </div>
    )
  }

  return <Navigate to={user ? '/dashboard' : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Routes available to all authenticated users */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/membership-plans" element={<MembershipPlans />} />
            <Route path="/my-memberships" element={<MyMemberships />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/my-workouts" element={<MyWorkouts />} />
          </Route>

          {/* Admin-only workout plan management */}
          <Route element={<AdminRoute />}>
            <Route path="/workout-plans" element={<WorkoutPlans />} />
            <Route path="/workout-assignments" element={<WorkoutAssignments />} />
            <Route path="/membership-management" element={<MembershipManagement />} />
          </Route>

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}