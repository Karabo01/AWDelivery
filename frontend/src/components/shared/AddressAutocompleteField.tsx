import { useEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AddressAutocompleteValue = {
  street: string
  suburb: string
  city: string
  postalCode: string
  province: string
  lat: number | null
  lng: number | null
}

type AddressAutocompleteFieldProps = {
  id: string
  label: string
  onAddressSelected: (address: AddressAutocompleteValue, formattedAddress: string) => void
}

let scriptLoadingPromise: Promise<void> | null = null

function ensureGoogleMapsLoaded() {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  if (typeof google !== 'undefined' && google.maps?.places?.Autocomplete) {
    return Promise.resolve()
  }

  if (!scriptLoadingPromise) {
    scriptLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Maps script'))
      document.head.appendChild(script)
    })
  }

  return scriptLoadingPromise
}

function extractAddressFromPlace(place: google.maps.places.PlaceResult): AddressAutocompleteValue {
  const components = place.address_components ?? []

  const findComponent = (...types: string[]) =>
    components.find((component) =>
      types.some((type) => component.types.includes(type)),
    )

  const streetNumber = findComponent('street_number')?.long_name ?? ''
  const route = findComponent('route')?.long_name ?? ''
  const suburb = findComponent('sublocality_level_1', 'sublocality', 'neighborhood')?.long_name ?? ''
  const city = findComponent('locality', 'administrative_area_level_2')?.long_name ?? ''
  const province = findComponent('administrative_area_level_1')?.long_name ?? ''
  const postalCode = findComponent('postal_code')?.long_name ?? ''

  return {
    street: `${streetNumber} ${route}`.trim(),
    suburb,
    city,
    postalCode,
    province,
    lat: place.geometry?.location?.lat() ?? null,
    lng: place.geometry?.location?.lng() ?? null,
  }
}

function AddressAutocompleteField({
  id,
  label,
  onAddressSelected,
}: AddressAutocompleteFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const callbacksRef = useRef({ onAddressSelected })
  const [isLoaded, setIsLoaded] = useState(false)

  // Keep callbacks ref up to date
  useEffect(() => {
    callbacksRef.current = { onAddressSelected }
  }, [onAddressSelected])

  useEffect(() => {
    void ensureGoogleMapsLoaded()
      .then(() => {
        setIsLoaded(true)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) {
      return
    }

    if (typeof google === 'undefined' || !google.maps?.places?.Autocomplete) {
      console.error('[AddressAutocomplete] Google Maps Autocomplete not available')
      return
    }

    console.log('[AddressAutocomplete] Initializing Autocomplete')
    
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'za' },
      fields: ['address_components', 'formatted_address', 'geometry'],
    })

    autocomplete.addListener('place_changed', () => {
      console.log('[AddressAutocomplete] place_changed event fired')
      const place = autocomplete.getPlace()
      console.log('[AddressAutocomplete] Place:', place)

      if (!place.geometry) {
        console.warn('[AddressAutocomplete] No geometry in place result')
        return
      }

      const extracted = extractAddressFromPlace(place)
      const formattedAddress = place.formatted_address ?? extracted.street
      console.log('[AddressAutocomplete] Extracted:', extracted)
      console.log('[AddressAutocomplete] Formatted address:', formattedAddress)
      
      callbacksRef.current.onAddressSelected(extracted, formattedAddress)
    })

    autocompleteRef.current = autocomplete
    console.log('[AddressAutocomplete] Autocomplete initialized successfully')

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [isLoaded])

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        placeholder="Start typing an address..."
        autoComplete="off"
      />
    </div>
  )
}

export type { AddressAutocompleteValue }
export default AddressAutocompleteField
