
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import axios from 'axios'
import api from '../services/api'

export interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role: 'ADMIN' | 'MEMBER'
  profileImage: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (formData: FormData) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'The request failed. Please try again.'
  }

  return 'Something went wrong. Please try again.'
}

export { getErrorMessage }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check whether the browser already has a valid login cookie.
  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<{ user: User }>('/auth/me')
      setUser(response.data.user)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    // Finish checking the session before showing protected pages.
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const login = async (email: string, password: string) => {
    const response = await api.post<{ user: User }>('/auth/login', {
      email,
      password,
    })

    setUser(response.data.user)
  }

  const register = async (formData: FormData) => {
    // FormData sends the image and text fields as multipart/form-data.
    const response = await api.post<{ user: User }>('/auth/register', formData)
    setUser(response.data.user)
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      // Clear the local session even if the network request fails.
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}

export { getErrorMessage as authErrorMessage }
