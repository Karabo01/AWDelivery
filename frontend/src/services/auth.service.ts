import api from '@/services/api'
import type {
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	RegisterResponse,
	ResendOtpRequest,
	ResendOtpResponse,
	VerifyOtpRequest,
	VerifyOtpResponse,
} from '@/types'
import type { User } from '@/types/user.types'

type CurrentUserResponse = {
	user: User
}

type LogoutResponse = {
	message: string
}

async function register(payload: RegisterRequest) {
	const { data } = await api.post<RegisterResponse>('/auth/register', payload)
	return data
}

async function login(payload: LoginRequest) {
	const { data } = await api.post<LoginResponse>('/auth/login', payload)
	return data
}

async function verifyOtp(payload: VerifyOtpRequest) {
	const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp', payload)
	return data
}

async function resendOtp(payload: ResendOtpRequest) {
	const { data } = await api.post<ResendOtpResponse>('/auth/resend-otp', payload)
	return data
}

async function getCurrentUser() {
	const { data } = await api.get<CurrentUserResponse>('/auth/me')
	return data
}

async function logout() {
	const { data } = await api.post<LogoutResponse>('/auth/logout')
	return data
}

export { getCurrentUser, login, logout, register, resendOtp, verifyOtp }
