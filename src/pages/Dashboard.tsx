import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PersonalInfoTab } from '@/components/Dashboard/PersonalInfoTab'
import { AddressTab } from '@/components/Dashboard/AddressTab'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCustomerProfile } from '@/hooks/useCustomerProfile'
import { Skeleton } from '@/components/ui/skeleton'

export default function Dashboard() {
  const { customer, state, updateProfile, setState } = useCustomerProfile()

  if (state === 'LOADING' && !customer) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-12 w-full mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 md:py-10 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 hover:bg-secondary rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Meu Dashboard</h1>
      </div>

      <Tabs defaultValue="pessoal" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto gap-2 md:gap-0 bg-transparent border-b border-border p-0">
          <TabsTrigger
            value="pessoal"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 py-3 bg-transparent font-medium"
          >
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger
            value="entrega"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 py-3 bg-transparent font-medium"
          >
            Endereço de Entrega
          </TabsTrigger>
          <TabsTrigger
            value="cobranca"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 py-3 bg-transparent font-medium"
          >
            Endereço de Cobrança
          </TabsTrigger>
        </TabsList>

        <div className="pt-8">
          <TabsContent value="pessoal" className="m-0 focus-visible:outline-none">
            {customer && (
              <PersonalInfoTab
                customer={customer}
                onSave={updateProfile}
                isEditing={state === 'EDIT'}
                setEditing={(editing) => setState(editing ? 'EDIT' : 'IDLE')}
              />
            )}
          </TabsContent>
          <TabsContent value="entrega" className="m-0 focus-visible:outline-none">
            <AddressTab customerId={customer?.id} type="shipping" />
          </TabsContent>
          <TabsContent value="cobranca" className="m-0 focus-visible:outline-none">
            <AddressTab customerId={customer?.id} type="billing" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
