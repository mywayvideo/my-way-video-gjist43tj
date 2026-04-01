import { useState, useCallback } from 'react'
import * as customerService from '@/services/customerManagementService'
import { toast } from 'sonner'

export function useCustomerManagement() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const fetchCustomers = useCallback(
    async (page: number, limit: number, searchTerm: string, statusFilter: string) => {
      setLoading(true)
      setError(null)
      try {
        const { customers: data, total } = await customerService.fetchAllCustomers(
          page,
          limit,
          searchTerm,
          statusFilter,
        )
        setCustomers(data)
        setTotalCount(total)
      } catch (err: any) {
        console.error('Fetch customers error:', err)
        setError(err.message || 'Erro ao carregar clientes.')
        toast.error('Nenhum cliente encontrado. Tente novamente mais tarde.', {
          action: {
            label: 'Tentar novamente',
            onClick: () => fetchCustomers(page, limit, searchTerm, statusFilter),
          },
        })
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const updateCustomer = async (customerId: string, data: any) => {
    try {
      await customerService.updateCustomer(customerId, data)
      toast.success('Cliente atualizado com sucesso!')
      return true
    } catch (err: any) {
      toast.error('Não foi possível atualizar cliente.')
      throw err
    }
  }

  const updateBillingAddress = async (customerId: string, address: any) => {
    try {
      await customerService.updateBillingAddress(customerId, address)
      toast.success('Endereço de cobrança atualizado com sucesso!')
      return true
    } catch (err: any) {
      toast.error('Não foi possível atualizar endereço de cobrança.')
      throw err
    }
  }

  const updateShippingAddress = async (customerId: string, address: any) => {
    try {
      await customerService.updateShippingAddress(customerId, address)
      toast.success('Endereço de entrega atualizado com sucesso!')
      return true
    } catch (err: any) {
      toast.error('Não foi possível atualizar endereço de entrega.')
      throw err
    }
  }

  const changeCustomerPassword = async (
    customerId: string,
    newPassword: string,
    sendEmail: boolean = false,
  ) => {
    try {
      await customerService.changeCustomerPassword(customerId, newPassword, sendEmail)
      toast.success('Senha alterada com sucesso!')
      return true
    } catch (err: any) {
      toast.error('Não foi possível alterar a senha.')
      throw err
    }
  }

  const deleteCustomer = async (customerId: string) => {
    try {
      await customerService.deleteCustomer(customerId)
      toast.success('Cliente deletado com sucesso!')
      return true
    } catch (err: any) {
      toast.error('Não foi possível deletar o cliente.')
      throw err
    }
  }

  const resetCustomer2FA = async (customerId: string) => {
    try {
      await customerService.resetCustomer2FA(customerId)
      toast.success('2FA desativado com sucesso!')
      return true
    } catch (err: any) {
      toast.error('Não foi possível resetar o 2FA.')
      throw err
    }
  }

  const createCustomer = async (data: any) => {
    try {
      await customerService.createCustomer(data)
      toast.success('Cliente criado com sucesso!')
      return true
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar cliente. Tente novamente.')
      throw err
    }
  }

  const sendConfirmationEmail = async (customerId: string) => {
    try {
      await customerService.sendConfirmationEmail(customerId)
      toast.success('Email enviado com sucesso!')
      return true
    } catch (err: any) {
      toast.error('Não foi possível enviar o email de confirmação.')
      throw err
    }
  }

  return {
    customers,
    totalCount,
    loading,
    error,
    selectedCustomer,
    setSelectedCustomer,
    fetchCustomers,
    updateCustomer,
    changeCustomerPassword,
    deleteCustomer,
    resetCustomer2FA,
    sendConfirmationEmail,
    createCustomer,
    updateBillingAddress,
    updateShippingAddress,
  }
}
