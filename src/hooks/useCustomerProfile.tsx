import { useState, useEffect, useCallback } from 'react'
import { Customer } from '@/types/customer'
import { customerService } from '@/services/customerService'
import { toast } from 'sonner'
import { ERROR_MESSAGES } from '@/constants/customer'

type State = 'LOADING' | 'IDLE' | 'ERROR' | 'EDIT' | 'SUCCESS'

export function useCustomerProfile() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [state, setState] = useState<State>('LOADING')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const fetchProfile = useCallback(async () => {
    setState('LOADING')
    try {
      const data = await customerService.getProfile()
      setCustomer(data)
      setState('IDLE')
    } catch (err: any) {
      setState('ERROR')
      setErrorMsg(ERROR_MESSAGES.network_error)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateProfile = async (updates: Partial<Customer>) => {
    if (!customer) return
    try {
      setState('LOADING')
      const isEmailChanged = updates.email && updates.email !== customer.email

      await customerService.updateProfile(customer.id, updates)
      await fetchProfile()

      setState('SUCCESS')
      toast.success('Perfil atualizado com sucesso!')

      if (isEmailChanged) {
        toast.info('Verifique seu novo email para confirmar a mudança.')
      }

      setTimeout(() => setState('IDLE'), 2000)
    } catch (err: any) {
      setState('ERROR')
      const msg =
        err.message === 'email_in_use' ? ERROR_MESSAGES.email_in_use : ERROR_MESSAGES.network_error
      setErrorMsg(msg)
      toast.error(msg)
      setTimeout(() => setState('IDLE'), 2000)
    }
  }

  return { customer, state, setState, errorMsg, fetchProfile, updateProfile }
}
