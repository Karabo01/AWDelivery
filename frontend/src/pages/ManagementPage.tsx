import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getUsers, setUserAdmin, setUserBusiness, deleteUser } from '@/services/admin.service'
import useAuth from '@/hooks/useAuth'

type ManagedUser = {
  id: string
  name: string
  surname: string
  email: string
  phone: string
  isAdmin: boolean
  isSuperAdmin?: boolean
  isBusiness: boolean
  companyName?: string | null
  isVerified: boolean
  orderCount: number
  createdAt: string
}

function ManagementPage() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['management-users', search],
    queryFn: () => getUsers({ search: search || undefined, pageSize: 100 }),
  })

  const adminMutation = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
      setUserAdmin(userId, isAdmin),
    onSuccess: () => {
      setActionError(null)
      queryClient.invalidateQueries({ queryKey: ['management-users'] })
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.message ?? 'Failed to update user.')
    },
  })

  const businessMutation = useMutation({
    mutationFn: ({ userId, isBusiness, companyName }: { userId: string; isBusiness: boolean; companyName?: string }) =>
      setUserBusiness(userId, isBusiness, companyName),
    onSuccess: () => {
      setActionError(null)
      queryClient.invalidateQueries({ queryKey: ['management-users'] })
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.message ?? 'Failed to update business flag.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      setActionError(null)
      queryClient.invalidateQueries({ queryKey: ['management-users'] })
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.message ?? 'Failed to delete user.')
    },
  })

  const users = (data?.data ?? []) as ManagedUser[]

  const handleToggleAdmin = (u: ManagedUser) => {
    if (u.isSuperAdmin) return
    adminMutation.mutate({ userId: u.id, isAdmin: !u.isAdmin })
  }

  const handleToggleBusiness = (u: ManagedUser) => {
    if (u.isBusiness) {
      businessMutation.mutate({ userId: u.id, isBusiness: false })
      return
    }
    const companyName = window.prompt(
      `Promote ${u.name} ${u.surname} to a business account.\n\nEnter company name:`,
      u.companyName ?? '',
    )
    if (!companyName?.trim()) return
    businessMutation.mutate({ userId: u.id, isBusiness: true, companyName: companyName.trim() })
  }

  const handleDelete = (u: ManagedUser) => {
    if (u.isSuperAdmin) return
    if (u.id === currentUser?.id) return
    if (!window.confirm(`Delete ${u.name} ${u.surname}? This cannot be undone.`)) return
    deleteMutation.mutate(u.id)
  }

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Super admin portal — grant or revoke admin access and manage user accounts.
        </p>
      </div>

      <Card className="border-border/85 bg-card/95">
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />

          {actionError ? (
            <p className="text-sm text-destructive">{actionError}</p>
          ) : null}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border/70">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium">Phone</th>
                    <th className="px-4 py-2 font-medium">Role</th>
                    <th className="px-4 py-2 font-medium">Orders</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id
                    return (
                      <tr key={u.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          {u.name} {u.surname}
                          {isSelf ? (
                            <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{u.email}</td>
                        <td className="px-4 py-3">{u.phone}</td>
                        <td className="px-4 py-3">
                          {u.isSuperAdmin ? (
                            <Badge className="bg-amber-500/20 text-amber-700">Super Admin</Badge>
                          ) : u.isAdmin ? (
                            <Badge className="bg-blue-500/20 text-blue-700">Admin</Badge>
                          ) : (
                            <Badge className="bg-muted text-muted-foreground">User</Badge>
                          )}
                          {u.isBusiness ? (
                            <Badge className="ml-2 bg-violet-500/20 text-violet-700">
                              Business{u.companyName ? ` · ${u.companyName}` : ''}
                            </Badge>
                          ) : null}
                          {!u.isVerified ? (
                            <Badge className="ml-2 bg-muted text-muted-foreground">Unverified</Badge>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{u.orderCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={u.isSuperAdmin || adminMutation.isPending}
                              onClick={() => handleToggleAdmin(u)}
                            >
                              {u.isAdmin ? 'Revoke admin' : 'Grant admin'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={businessMutation.isPending}
                              onClick={() => handleToggleBusiness(u)}
                            >
                              {u.isBusiness ? 'Revoke business' : 'Make business'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={u.isSuperAdmin || isSelf || u.orderCount > 0 || deleteMutation.isPending}
                              onClick={() => handleDelete(u)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ManagementPage
