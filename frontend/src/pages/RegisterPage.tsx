import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatToSaE164, isValidSaE164 } from '@/lib/format'
import useAuth from '@/hooks/useAuth'

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  surname: z.string().min(1, 'Surname is required').max(100),
  phone: z.string().refine(isValidSaE164, 'Use a valid South African number (+27XXXXXXXXX).'),
  email: z.string().email('Enter a valid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits.'),
})

type RegisterFormValues = z.infer<typeof registerSchema>
type OtpFormValues = z.infer<typeof otpSchema>

function RegisterPage() {
  const navigate = useNavigate()
  const { registerUser, verifyOtpCode, resendOtpCode, isLoading } = useAuth()
  const [activeStep, setActiveStep] = useState<'register' | 'verify'>('register')
  const [serverError, setServerError] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', surname: '', phone: '+27', email: '', password: '' },
  })

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '' },
  })

  const onSubmitRegister = registerForm.handleSubmit(async (values) => {
    setServerError(null)
    try {
      await registerUser(values)
      setEmail(values.email)
      setActiveStep('verify')
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Registration failed. Please try again.'
      setServerError(message)
    }
  })

  const onSubmitOtp = otpForm.handleSubmit(async (values) => {
    setServerError(null)
    try {
      await verifyOtpCode({ email, code: values.code })
      navigate('/dashboard')
    } catch {
      setServerError('Invalid or expired OTP. Please try again.')
    }
  })

  const handleResendOtp = async () => {
    setServerError(null)
    try {
      await resendOtpCode({ email })
      setServerError(null)
    } catch {
      setServerError('Unable to resend OTP. Please try again.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 py-8">
      <div className="space-y-1 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start booking deliveries in under a minute.</p>
      </div>

      <Card className="border-border/85 bg-card/95">
        <CardHeader className="pb-2">
          <CardTitle>
            {activeStep === 'register' ? 'Create an account' : 'Verify your email'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {activeStep === 'register' ? (
            <form className="space-y-4" onSubmit={onSubmitRegister}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="John" {...registerForm.register('name')} />
                  {registerForm.formState.errors.name ? (
                    <p className="text-sm text-destructive">
                      {registerForm.formState.errors.name.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surname">Surname</Label>
                  <Input
                    id="surname"
                    placeholder="Doe"
                    {...registerForm.register('surname')}
                  />
                  {registerForm.formState.errors.surname ? (
                    <p className="text-sm text-destructive">
                      {registerForm.formState.errors.surname.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  placeholder="+27812345678"
                  inputMode="tel"
                  value={registerForm.watch('phone')}
                  onChange={(e) => {
                    registerForm.setValue('phone', formatToSaE164(e.target.value), {
                      shouldValidate: true,
                    })
                  }}
                />
                {registerForm.formState.errors.phone ? (
                  <p className="text-sm text-destructive">
                    {registerForm.formState.errors.phone.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  {...registerForm.register('email')}
                />
                {registerForm.formState.errors.email ? (
                  <p className="text-sm text-destructive">
                    {registerForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  {...registerForm.register('password')}
                />
                {registerForm.formState.errors.password ? (
                  <p className="text-sm text-destructive">
                    {registerForm.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              {serverError ? (
                <p className="text-sm text-destructive">{serverError}</p>
              ) : null}

              <Button className="w-full" type="submit" disabled={isLoading}>
                Create Account
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onSubmitOtp}>
              <p className="rounded-lg border border-border/80 bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below to verify your
                account.
              </p>

              <div className="space-y-2">
                <Label htmlFor="otp">Verification code</Label>
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
                Verify
              </Button>

              <Button
                className="w-full"
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={handleResendOtp}
              >
                Resend OTP
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default RegisterPage
