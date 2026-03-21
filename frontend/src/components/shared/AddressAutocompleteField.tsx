import { useEffect, useRef } from 'react'

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
  value: string
  onInputChange: (value: string) => void
  onAddressSelected: (address: AddressAutocompleteValue) => void
}

let scriptLoadingPromise: Promise<void> | null = null

function ensureGoogleMapsPlacesLoaded() {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  if (typeof google !== 'undefined' && google.maps?.places) {
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

function extractAddress(place: google.maps.places.PlaceResult): AddressAutocompleteValue {
  const components = place.address_components ?? []

  const findComponent = (...types: string[]) =>
    components.find((component: google.maps.GeocoderAddressComponent) =>
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
  value,
  onInputChange,
  onAddressSelected,
}: AddressAutocompleteFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let autocomplete: google.maps.places.Autocomplete | undefined
    let listener: google.maps.MapsEventListener | undefined

    void ensureGoogleMapsPlacesLoaded()
      .then(() => {
        if (!inputRef.current || typeof google === 'undefined' || !google.maps?.places) {
          return
        }

        autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['address_components', 'formatted_address', 'geometry'],
          componentRestrictions: { country: 'za' },
        })

        listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete?.getPlace()
          if (!place) {
            return
          }
          const extracted = extractAddress(place)
          onInputChange(place.formatted_address ?? extracted.street)
          onAddressSelected(extracted)
        })
      })
      .catch(() => undefined)

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener)
      }
    }
  }, [onAddressSelected, onInputChange])

  return (
    <div className="space-y-2.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        ref={inputRef}
        placeholder="Start typing an address..."
        value={value}
        onChange={(event) => onInputChange(event.target.value)}
      />
    </div>
  )
}

export type { AddressAutocompleteValue }
export default AddressAutocompleteField
