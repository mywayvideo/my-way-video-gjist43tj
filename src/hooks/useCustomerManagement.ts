import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { fetchAllCustomers } from '@/services/customerManagementService'
import { supabase } from '@/lib/supabase/client'

export function useCustomerManagement() {
  const [customers, setCustomers] = useState<any[]>([])
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { toast } = useToast()

  const loadCustomers = async () => {
    setIsLoading(true)
    try {
      const result = await fetchAllCustomers(page, limit, searchTerm, statusFilter)
      setCustomers(result.customers)
      setTotalCustomers(result.total)
    } catch (error: any) {
      console.error('Error fetching customers:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao buscar clientes.',
        variant: 'destructive',
      })
      setCustomers([])
      setTotalCustomers(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [page, limit, searchTerm, statusFilter])

  const updateCustomerStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('customers').update({ status }).eq('id', id)
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Status do cliente atualizado.' })
      loadCustomers()
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    }
  }

  const updateCustomerRole = async (id: string, role: string) => {
    try {
      const { error } = await supabase.from('customers').update({ role }).eq('id', id)
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Função do cliente atualizada.' })
      loadCustomers()
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    }
  }

  return {
    customers,
    totalCustomers,
    isLoading,
    page,
    setPage,
    limit,
    setLimit,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    refreshCustomers: loadCustomers,
    updateCustomerStatus,
    updateCustomerRole,
  }
}
