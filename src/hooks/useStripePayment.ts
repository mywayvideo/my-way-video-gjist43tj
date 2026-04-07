import { useState, useEffect, useCallback } from 'react'
import { StripePaymentState } from '@/types/stripe'
import { createPaymentIntent, confirmCardPayment } from '@/services/stripeService'

const STRIPE_PK =
  'pk_test_51TJNpuCdgoPTpkApWlzlJzlPeqsTHmrbITutsHkVq8zI9yeux7hVXYGN1ygGKTu9vFZUguDO3muKjI2E7ezvI8vw00APSiHyYh'

export const useStripePayment = () => {
  const [stripe, setStripe] = useState<any>(null)
  const [elements, setElements] = useState<any>(null)
  const [cardElement, setCardElement] = useState<any>(null)
  const [state, setState] = useState<StripePaymentState>({
    status: 'idle',
    confirmationStep: false,
    clientSecret: null,
    paymentIntentId: null,
    errorMessage: null,
  })

  useEffect(() => {
    if (!window.Stripe) {
      const script = document.createElement('script')
      script.src = 'https://js.stripe.com/v3/'
      script.async = true
      script.onload = () => {
        const stripeInstance = window.Stripe(STRIPE_PK)
        setStripe(stripeInstance)
        const elementsInstance = stripeInstance.elements()
        setElements(elementsInstance)
      }
      document.head.appendChild(script)
    } else {
      const stripeInstance = window.Stripe(STRIPE_PK)
      setStripe(stripeInstance)
      const elementsInstance = stripeInstance.elements()
      setElements(elementsInstance)
    }
  }, [])

  const mountCardElement = useCallback(
    (container: HTMLDivElement) => {
      if (elements && container && !cardElement) {
        const card = elements.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: '#334155',
              '::placeholder': {
                color: '#94a3b8',
              },
            },
            invalid: {
              color: '#ef4444',
            },
          },
        })
        card.mount(container)
        setCardElement(card)
      }
    },
    [elements, cardElement],
  )

  const processPaymentIntent = async (
    amount: number,
    email: string,
    name: string,
    orderId: string,
  ) => {
    setState((prev) => ({ ...prev, status: 'loading', errorMessage: null }))
    try {
      const data = await createPaymentIntent(amount, 'usd', email, name, orderId)
      setState((prev) => ({
        ...prev,
        status: 'idle',
        clientSecret: data.client_secret,
        paymentIntentId: data.payment_intent_id,
        confirmationStep: true,
      }))
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err.message || 'Nao foi possivel processar pagamento. Tente novamente.',
      }))
    }
  }

  const confirmPayment = async (name: string, email: string) => {
    if (!stripe || !cardElement || !state.clientSecret) return null

    setState((prev) => ({ ...prev, status: 'confirming', errorMessage: null }))
    try {
      const paymentIntent = await confirmCardPayment(
        stripe,
        state.clientSecret,
        cardElement,
        name,
        email,
      )
      setState((prev) => ({ ...prev, status: 'success' }))
      return paymentIntent
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err.message || 'Cartao invalido ou erro de conexao.',
      }))
      return null
    }
  }

  const resetState = () => {
    setState({
      status: 'idle',
      confirmationStep: false,
      clientSecret: null,
      paymentIntentId: null,
      errorMessage: null,
    })
  }

  return {
    stripe,
    elements,
    cardElement,
    mountCardElement,
    state,
    processPaymentIntent,
    confirmPayment,
    resetState,
  }
}
