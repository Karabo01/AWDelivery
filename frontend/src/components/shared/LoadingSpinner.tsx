function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-6" role="status" aria-live="polite">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

export default LoadingSpinner
