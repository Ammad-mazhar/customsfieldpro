// Stripe integration stub
// In production: import { loadStripe } from '@stripe/stripe-js'
// export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

// For demo/dev: mock stripe promise that never resolves to a real SDK
export const stripePromise = Promise.resolve(null)

export const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_demo',
}
