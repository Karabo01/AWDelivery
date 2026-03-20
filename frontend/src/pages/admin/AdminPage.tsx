import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function AdminPage() {
  return (
    <div className="py-2">
      <Card>
        <CardHeader>
          <CardTitle>Admin</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Admin dashboard placeholder.
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminPage
