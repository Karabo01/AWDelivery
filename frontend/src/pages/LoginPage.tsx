import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import useAuth from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required'),
})

const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits.'),
})

type LoginFormValues = z.infer<typeof loginSchema>
type OtpFormValues = z.infer<typeof otpSchema>

function LoginPage() {
  const navigate = useNavigate()
  const { loginUser, verifyOtpCode, resendOtpCode, isLoading } = useAuth()
  const [activeStep, setActiveStep] = useState<'credentials' | 'otp'>('credentials')
  const [serverError, setServerError] = useState<string | null>(null)
  const [loginEmail, setLoginEmail] = useState('')

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '' },
  })

  const onSubmitLogin = loginForm.handleSubmit(async (values) => {
    setServerError(null)
    try {
      await loginUser(values)
      navigate('/dashboard')
    } catch (err: any) {
      const code = err?.response?.data?.code
      if (code === 'ACCOUNT_NOT_VERIFIED') {
        // Backend already resent OTP — go straight to verification
        setLoginEmail(values.email)
        setActiveStep('otp')
        setServerError('Your account is not yet verified. Please enter the OTP sent to your email.')
        return
      }
      const message = err?.response?.data?.message ?? 'Invalid email or password.'
      setServerError(message)
    }
  })

  const onSubmitOtp = otpForm.handleSubmit(async (values) => {
    setServerError(null)
    try {
      await verifyOtpCode({ email: loginEmail, code: values.code })
      navigate('/dashboard')
    } catch {
      setServerError('Invalid or expired OTP. Please try again.')
    }
  })

  const handleResendOtp = async () => {
    setServerError(null)
    try {
      await resendOtpCode({ email: loginEmail })
    } catch {
      setServerError('Unable to resend OTP. Please try again.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 py-8">
      <div className="space-y-1 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Secure access to your deliveries and live updates.</p>
      </div>

      <Card className="border-border/85 bg-card/95">
        <CardHeader className="pb-2">
          <CardTitle>
            {activeStep === 'credentials' ? 'Login to AWDelivery' : 'Verify your identity'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {activeStep === 'credentials' ? (
            <form className="space-y-4" onSubmit={onSubmitLogin}>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...loginForm.register('email')}
                />
                {loginForm.formState.errors.email ? (
                  <p className="text-sm text-destructive">
                    {loginForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...loginForm.register('password')}
                />
                {loginForm.formState.errors.password ? (
                  <p className="text-sm text-destructive">
                    {loginForm.formState.errors.password.message}
                  </p>
                ) : null}
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {serverError ? (
                <p className="text-sm text-destructive">{serverError}</p>
              ) : null}

              <Button className="w-full" type="submit" disabled={isLoading}>
                Login
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Register
                </Link>
              </p>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onSubmitOtp}>
              <p className="rounded-lg border border-border/80 bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
                We sent a 6-digit code to your email to verify your account.
              </p>

              <div className="space-y-2">
                <Label htmlFor="otp">OTP code</Label>
                <Input
                  id="otp"
                  placeholder="6-digit code"
                  inputMode="numeric"
                  maxLength={6}
                  {...otpForm.register('code')}
                />
                {otpForm.formState.errors.code ? (
                  <p className="text-sm text-destructive">
                    {otpForm.formState.errors.code.message}
                  </p>
                ) : null}
              </div>

              {serverError ? (
                <p className="text-sm text-destructive">{serverError}</p>
              ) : null}

              <Button className="w-full" type="submit" disabled={isLoading}>
                Verify OTP
              </Button>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={handleResendOtp}
                >
                  Resend OTP
                </Button>
                <Button
                  className="flex-1"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setActiveStep('credentials')
                    setServerError(null)
                  }}
                >
                  Back
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
