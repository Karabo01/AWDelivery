import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { getDrivers, createDriver, updateDriver, deleteDriver } from '@/services/admin.service'
import type { Driver, CreateDriverPayload, VehicleType } from '@/types/driver.types'

const VEHICLE_TYPE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'CAR', label: 'Car' },
  { value: 'VAN', label: 'Van' },
  { value: 'TRUCK', label: 'Truck' },
]

interface DriverFormData {
  name: string
  phone: string
  email: string
  vehicleType: VehicleType
  vehiclePlate: string
}

const emptyForm: DriverFormData = {
  name: '',
  phone: '+27',
  email: '',
  vehicleType: 'CAR',
  vehiclePlate: '',
}

function DriversPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [formData, setFormData] = useState<DriverFormData>(emptyForm)
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-drivers', search, filterActive],
    queryFn: () => getDrivers({ search: search || undefined, isActive: filterActive, pageSize: 100 }),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateDriverPayload) => createDriver(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DriverFormData> & { isActive?: boolean } }) => 
      updateDriver(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
    },
  })

  function resetForm() {
    setShowForm(false)
    setEditingDriver(null)
    setFormData(emptyForm)
  }

  function handleEdit(driver: Driver) {
    setEditingDriver(driver)
    setFormData({
      name: driver.name,
      phone: driver.phone,
      email: driver.email || '',
      vehicleType: driver.vehicleType,
      vehiclePlate: driver.vehiclePlate || '',
    })
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: CreateDriverPayload = {
      name: formData.name,
      phone: formData.phone,
      vehicleType: formData.vehicleType,
      ...(formData.email && { email: formData.email }),
      ...(formData.vehiclePlate && { vehiclePlate: formData.vehiclePlate }),
    }

    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleToggleActive(driver: Driver) {
    updateMutation.mutate({ 
      id: driver.id, 
      data: { isActive: !driver.isActive } 
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Drivers</h2>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          Add Driver
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg">
              {editingDriver ? 'Edit Driver' : 'Add New Driver'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+27XXXXXXXXX"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleType">Vehicle Type *</Label>
                  <select
                    id="vehicleType"
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as VehicleType })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    {VEHICLE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehiclePlate">Vehicle Plate</Label>
                  <Input
                    id="vehiclePlate"
                    value={formData.vehiclePlate}
                    onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingDriver ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Input
          placeholder="Search drivers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
          <Button
            variant={filterActive === undefined ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterActive(undefined)}
          >
            All
          </Button>
          <Button
            variant={filterActive === true ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterActive(true)}
          >
            Active
          </Button>
          <Button
            variant={filterActive === false ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterActive(false)}
          >
            Inactive
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {data?.data.map((driver) => (
            <Card key={driver.id} className={!driver.isActive ? 'opacity-60' : ''}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{driver.name}</span>
                    <Badge className={driver.isActive ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-500'}>
                      {driver.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {driver.phone} • {driver.vehicleType}
                    {driver.vehiclePlate && ` • ${driver.vehiclePlate}`}
                  </div>
                  {driver.orderCount !== undefined && (
                    <div className="text-xs text-muted-foreground">
                      {driver.orderCount} order(s)
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(driver)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(driver)}
                    disabled={updateMutation.isPending}
                  >
                    {driver.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  {driver.orderCount === 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(driver.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {data?.data.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No drivers found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DriversPage
