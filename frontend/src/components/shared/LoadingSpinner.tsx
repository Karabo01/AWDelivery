function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-6" role="status" aria-live="polite">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  )
}

export default LoadingSpinner
