import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { forgotPassword, resetPassword } from '@/services/auth.service'

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
})

const resetSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits.'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

type EmailFormValues = z.infer<typeof emailSchema>
type ResetFormValues = z.infer<typeof resetSchema>

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState<'email' | 'reset'>('email')
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [resetEmail, setResetEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmitEmail = emailForm.handleSubmit(async (values) => {
    setServerError(null)
    setIsSubmitting(true)
    try {
      await forgotPassword({ email: values.email })
      setResetEmail(values.email)
      setActiveStep('reset')
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Something went wrong. Please try again.'
      setServerError(message)
    } finally {
      setIsSubmitting(false)
    }
  })

  const onSubmitReset = resetForm.handleSubmit(async (values) => {
    setServerError(null)
    setIsSubmitting(true)
    try {
      const result = await resetPassword({
        email: resetEmail,
        code: values.code,
        newPassword: values.newPassword,
      })
      setSuccessMessage(result.message)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Invalid or expired OTP. Please try again.'
      setServerError(message)
    } finally {
      setIsSubmitting(false)
    }
  })

  const handleResendCode = async () => {
    setServerError(null)
    setIsSubmitting(true)
    try {
      await forgotPassword({ email: resetEmail })
      setSuccessMessage('A new code has been sent to your email.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch {
      setServerError('Unable to resend code. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 py-8">
      <div className="space-y-1 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          {activeStep === 'email'
            ? "Enter your email and we'll send you a reset code."
            : 'Enter the code we sent and choose a new password.'}
        </p>
      </div>

      <Card className="border-border/85 bg-card/95">
        <CardHeader className="pb-2">
          <CardTitle>
            {activeStep === 'email' ? 'Forgot password' : 'Set a new password'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {successMessage ? (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
              {successMessage}
            </p>
          ) : null}

          {activeStep === 'email' ? (
            <form className="space-y-4" onSubmit={onSubmitEmail}>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...emailForm.register('email')}
                />
                {emailForm.formState.errors.email ? (
                  <p className="text-sm text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              {serverError ? (
                <p className="text-sm text-destructive">{serverError}</p>
              ) : null}

              <Button className="w-full" type="submit" disabled={isSubmitting}>
                Send reset code
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Back to login
                </Link>
              </p>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onSubmitReset}>
              <p className="rounded-lg border border-border/80 bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
                We sent a 6-digit code to <strong>{resetEmail}</strong>.
              </p>

              <div className="space-y-2">
                <Label htmlFor="otp">Reset code</Label>
                <Input
                  id="otp"
                  placeholder="6-digit code"
                  inputMode="numeric"
                  maxLength={6}
                  {...resetForm.register('code')}
                />
                {resetForm.formState.errors.code ? (
                  <p className="text-sm text-destructive">
                    {resetForm.formState.errors.code.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="At least 8 characters"
                  {...resetForm.register('newPassword')}
                />
                {resetForm.formState.errors.newPassword ? (
                  <p className="text-sm text-destructive">
                    {resetForm.formState.errors.newPassword.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  {...resetForm.register('confirmPassword')}
                />
                {resetForm.formState.errors.confirmPassword ? (
                  <p className="text-sm text-destructive">
                    {resetForm.formState.errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>

              {serverError ? (
                <p className="text-sm text-destructive">{serverError}</p>
              ) : null}

              <Button className="w-full" type="submit" disabled={isSubmitting}>
                Reset password
              </Button>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleResendCode}
                >
                  Resend code
                </Button>
                <Button
                  className="flex-1"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setActiveStep('email')
                    setServerError(null)
                    setSuccessMessage(null)
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

export default ForgotPasswordPage
