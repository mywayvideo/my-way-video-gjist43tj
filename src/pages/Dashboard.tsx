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
    <div className="container max-w-4xl mx-auto py-4 md:py-6 px-4 md:px-6">
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-border mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-primary hover:opacity-80 transition-opacity duration-200">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Meu Dashboard</h1>
        </div>
      </div>

      <Tabs defaultValue="pessoal" className="w-full">
        <TabsList className="flex w-full h-auto gap-4 md:gap-6 bg-transparent border-b border-border p-0 overflow-x-auto">
          <TabsTrigger
            value="pessoal"
            className="relative data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground rounded-none px-3 py-3 bg-transparent font-medium whitespace-nowrap"
          >
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger
            value="entrega"
            className="relative data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground rounded-none px-3 py-3 bg-transparent font-medium whitespace-nowrap"
          >
            Endereço de Entrega
          </TabsTrigger>
          <TabsTrigger
            value="cobranca"
            className="relative data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground rounded-none px-3 py-3 bg-transparent font-medium whitespace-nowrap"
          >
            Endereço de Cobrança
          </TabsTrigger>
        </TabsList>

        <div className="pt-6 md:pt-8">
          <TabsContent
            value="pessoal"
            className="p-4 md:p-6 m-0 focus-visible:outline-none animate-fade-in duration-300"
          >
            {customer && (
              <PersonalInfoTab
                customer={customer}
                onSave={updateProfile}
                isEditing={state === 'EDIT'}
                setEditing={(editing) => setState(editing ? 'EDIT' : 'IDLE')}
              />
            )}
          </TabsContent>
          <TabsContent
            value="entrega"
            className="p-4 md:p-6 m-0 focus-visible:outline-none animate-fade-in duration-300"
          >
            <AddressTab customerId={customer?.id} type="shipping" />
          </TabsContent>
          <TabsContent
            value="cobranca"
            className="p-4 md:p-6 m-0 focus-visible:outline-none animate-fade-in duration-300"
          >
            <AddressTab customerId={customer?.id} type="billing" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
