
import axios from 'axios'

// All API requests use this shared configuration.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Sends and receives the HTTP-only cookie.
  headers: {
    Accept: 'application/json',
  },
})

export default api
