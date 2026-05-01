import { useState } from 'react'
import { Button } from '@/components/ui/button'
import DriversPage from './DriversPage'
import OrdersPage from './OrdersPage'
import FinancialsPage from './FinancialsPage'
import InvoicesPage from './InvoicesPage'
import WaybillsPage from './WaybillsPage'

type Tab = 'orders' | 'drivers' | 'financials' | 'invoices' | 'waybills'

function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('orders')

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Admin Portal</h1>
        <p className="text-sm text-muted-foreground">Operations and oversight tools.</p>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'orders' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </Button>
        <Button
          variant={activeTab === 'drivers' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('drivers')}
        >
          Drivers
        </Button>
        <Button
          variant={activeTab === 'financials' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('financials')}
        >
          Financials
        </Button>
        <Button
          variant={activeTab === 'invoices' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('invoices')}
        >
          Invoices
        </Button>
        <Button
          variant={activeTab === 'waybills' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('waybills')}
        >
          Waybills
        </Button>
      </div>

      <div className="pt-2">
        {activeTab === 'orders' && <OrdersPage />}
        {activeTab === 'drivers' && <DriversPage />}
        {activeTab === 'financials' && <FinancialsPage />}
        {activeTab === 'invoices' && <InvoicesPage />}
        {activeTab === 'waybills' && <WaybillsPage />}
      </div>
    </div>
  )
}

export default AdminPage
