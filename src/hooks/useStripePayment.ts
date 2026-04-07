import { useState, useEffect, useCallback } from 'react'

const STRIPE_PK =
  'pk_test_51TJNpuCdgoPTpkApWlzlJzlPeqsTHmrbITutsHkVq8zI9yeux7hVXYGN1ygGKTu9vFZUguDO3muKjI2E7ezvI8vw00APSiHyYh'

export const useStripePayment = () => {
  const [stripe, setStripe] = useState<any>(null)
  const [elements, setElements] = useState<any>(null)
  const [cardElement, setCardElement] = useState<any>(null)

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

  return {
    stripe,
    elements,
    cardElement,
    mountCardElement,
  }
}
