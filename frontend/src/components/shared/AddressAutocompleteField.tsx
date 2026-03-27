import { useEffect, useRef, useState } from 'react'

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

  if (typeof google !== 'undefined' && google.maps?.places?.PlaceAutocompleteElement) {
    return Promise.resolve()
  }

  if (!scriptLoadingPromise) {
    scriptLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
      // Use the new Places API
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Maps script'))
      document.head.appendChild(script)
    })
  }

  return scriptLoadingPromise
}

function extractAddressFromPlace(place: google.maps.places.Place): AddressAutocompleteValue {
  const components = place.addressComponents ?? []

  const findComponent = (...types: string[]) =>
    components.find((component) =>
      types.some((type) => component.types.includes(type)),
    )

  const streetNumber = findComponent('street_number')?.longText ?? ''
  const route = findComponent('route')?.longText ?? ''
  const suburb = findComponent('sublocality_level_1', 'sublocality', 'neighborhood')?.longText ?? ''
  const city = findComponent('locality', 'administrative_area_level_2')?.longText ?? ''
  const province = findComponent('administrative_area_level_1')?.longText ?? ''
  const postalCode = findComponent('postal_code')?.longText ?? ''

  return {
    street: `${streetNumber} ${route}`.trim(),
    suburb,
    city,
    postalCode,
    province,
    lat: place.location?.lat() ?? null,
    lng: place.location?.lng() ?? null,
  }
}

function AddressAutocompleteField({
  id,
  label,
  value,
  onInputChange,
  onAddressSelected,
}: AddressAutocompleteFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null)
  const callbacksRef = useRef({ onInputChange, onAddressSelected })
  const [isLoaded, setIsLoaded] = useState(false)

  // Keep callbacks ref up to date
  useEffect(() => {
    callbacksRef.current = { onInputChange, onAddressSelected }
  }, [onInputChange, onAddressSelected])

  useEffect(() => {
    void ensureGoogleMapsPlacesLoaded()
      .then(() => {
        setIsLoaded(true)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!isLoaded || !containerRef.current || autocompleteRef.current) {
      return
    }

    if (typeof google === 'undefined' || !google.maps?.places?.PlaceAutocompleteElement) {
      return
    }

    // Create the PlaceAutocompleteElement
    const autocomplete = new google.maps.places.PlaceAutocompleteElement({
      componentRestrictions: { country: 'za' },
    })

    // Style the element to match our design
    autocomplete.style.width = '100%'
    autocomplete.style.height = '40px'
    autocomplete.style.fontSize = '14px'

    // Listen for place selection
    autocomplete.addEventListener('gmp-placeselect', async (event) => {
      const placeEvent = event as google.maps.places.PlaceAutocompletePlaceSelectEvent
      const place = placeEvent.place

      // Fetch full place details
      await place.fetchFields({
        fields: ['addressComponents', 'formattedAddress', 'location'],
      })

      const extracted = extractAddressFromPlace(place)
      console.log('[AddressAutocomplete] Place selected:', extracted)
      callbacksRef.current.onInputChange(place.formattedAddress ?? extracted.street)
      callbacksRef.current.onAddressSelected(extracted)
    })

    containerRef.current.appendChild(autocomplete)
    autocompleteRef.current = autocomplete

    return () => {
      if (autocompleteRef.current && containerRef.current) {
        containerRef.current.removeChild(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [isLoaded])

  return (
    <div className="space-y-2.5">
      <Label htmlFor={id}>{label}</Label>
      <div
        ref={containerRef}
        className="w-full [&>gmp-place-autocomplete]:w-full [&>gmp-place-autocomplete]:rounded-md [&>gmp-place-autocomplete]:border [&>gmp-place-autocomplete]:border-input [&>gmp-place-autocomplete]:bg-background [&>gmp-place-autocomplete]:px-3 [&>gmp-place-autocomplete]:py-2 [&>gmp-place-autocomplete]:text-sm [&>gmp-place-autocomplete]:ring-offset-background [&>gmp-place-autocomplete]:placeholder:text-muted-foreground [&>gmp-place-autocomplete]:focus-within:outline-none [&>gmp-place-autocomplete]:focus-within:ring-2 [&>gmp-place-autocomplete]:focus-within:ring-ring [&>gmp-place-autocomplete]:focus-within:ring-offset-2"
      />
      {/* Hidden input for form value tracking */}
      <input type="hidden" id={id} value={value} />
    </div>
  )
}

export type { AddressAutocompleteValue }
export default AddressAutocompleteField
