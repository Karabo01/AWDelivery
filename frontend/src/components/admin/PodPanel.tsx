import { useEffect, useState } from 'react'
import api from '@/services/api'
import type { ProofOfDelivery } from '@/types/order.types'

interface Props {
  pod: ProofOfDelivery
}

function useAuthedAsset(path: string): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoke: string | null = null
    let cancelled = false

    api
      .get(path, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return
        const objectUrl = URL.createObjectURL(res.data as Blob)
        revoke = objectUrl
        setUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })

    return () => {
      cancelled = true
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [path])

  return url
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

function PodPanel({ pod }: Props) {
  const photoUrl = useAuthedAsset(pod.photoUrl)
  const signatureUrl = useAuthedAsset(pod.signatureUrl)

  return (
    <div className="border-t pt-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium">Proof of Delivery</div>
        <div className="text-xs text-muted-foreground">{formatDateTime(pod.capturedAt)}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Recipient</div>
          <div className="font-medium">{pod.recipientName}</div>
        </div>
        {pod.notes ? (
          <div>
            <div className="text-muted-foreground text-xs">Notes</div>
            <div>{pod.notes}</div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-muted-foreground text-xs mb-1">Photo</div>
          {photoUrl ? (
            <a href={photoUrl} target="_blank" rel="noreferrer">
              <img
                src={photoUrl}
                alt="Proof of delivery"
                className="w-full h-40 object-cover rounded-md border"
              />
            </a>
          ) : (
            <div className="w-full h-40 rounded-md border bg-muted animate-pulse" />
          )}
        </div>
        <div>
          <div className="text-muted-foreground text-xs mb-1">Signature</div>
          {signatureUrl ? (
            <img
              src={signatureUrl}
              alt="Recipient signature"
              className="w-full h-40 object-contain rounded-md border bg-white"
            />
          ) : (
            <div className="w-full h-40 rounded-md border bg-muted animate-pulse" />
          )}
        </div>
      </div>
    </div>
  )
}

export default PodPanel
