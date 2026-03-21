import axios, { AxiosError } from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const requestUrl = error.config?.url ?? ''
    const isAuthMeRequest = requestUrl.includes('/auth/me')

    if (
      error.response?.status === 401 &&
      !isAuthMeRequest &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login'
    ) {
      window.location.assign('/login')
    }

    return Promise.reject(error)
  },
)

export default api
