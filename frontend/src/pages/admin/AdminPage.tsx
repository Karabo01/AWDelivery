import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function AdminPage() {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Operations and oversight tools.</p>
      </div>

      <Card className="border-border/85 bg-card/95">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Admin dashboard placeholder.
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminPage
