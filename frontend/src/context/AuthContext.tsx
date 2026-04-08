import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getCurrentUser, login, logout, register, resendOtp, verifyOtp } from '@/services/auth.service'
import type { LoginRequest, RegisterRequest, ResendOtpRequest, VerifyOtpRequest } from '@/types'
import type { User } from '@/types/user.types'

type AuthContextState = {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
  registerUser: (payload: RegisterRequest) => Promise<void>
  loginUser: (payload: LoginRequest) => Promise<void>
  verifyOtpCode: (payload: VerifyOtpRequest) => Promise<void>
  resendOtpCode: (payload: ResendOtpRequest) => Promise<void>
  logoutUser: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextState | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
    retry: false,
  })

  const registerMutation = useMutation({
    mutationFn: register,
  })

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async (result) => {
      queryClient.setQueryData(['auth', 'me'], { user: result.user })
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })

  const verifyOtpMutation = useMutation({
    mutationFn: verifyOtp,
    onSuccess: async (result) => {
      queryClient.setQueryData(['auth', 'me'], { user: result.user })
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })

  const resendOtpMutation = useMutation({
    mutationFn: resendOtp,
  })

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: async () => {
      queryClient.setQueryData(['auth', 'me'], null)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })

  const value = useMemo<AuthContextState>(
    () => ({
      user: meQuery.data?.user ?? null,
      isAuthenticated: Boolean(meQuery.data?.user),
      isAdmin: Boolean(meQuery.data?.user?.isAdmin),
      isLoading:
        meQuery.isLoading ||
        registerMutation.isPending ||
        loginMutation.isPending ||
        verifyOtpMutation.isPending ||
        resendOtpMutation.isPending ||
        logoutMutation.isPending,
      registerUser: async (payload) => {
        await registerMutation.mutateAsync(payload)
      },
      loginUser: async (payload) => {
        await loginMutation.mutateAsync(payload)
      },
      verifyOtpCode: async (payload) => {
        await verifyOtpMutation.mutateAsync(payload)
      },
      resendOtpCode: async (payload) => {
        await resendOtpMutation.mutateAsync(payload)
      },
      logoutUser: async () => {
        await logoutMutation.mutateAsync()
      },
      refreshAuth: async () => {
        await meQuery.refetch()
      },
    }),
    [
      logoutMutation.isPending,
      loginMutation,
      meQuery,
      registerMutation,
      resendOtpMutation,
      verifyOtpMutation,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuthContext() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }

  return context
}

export { AuthContext, AuthProvider, useAuthContext }
