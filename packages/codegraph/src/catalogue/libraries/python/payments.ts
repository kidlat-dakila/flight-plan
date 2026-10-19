import type { CatalogueLibrary } from "@/catalogue/types"

export const stripePythonLibrary: CatalogueLibrary = {
  name: "Stripe for Python",
  specifiers: ["stripe"],
  documentedVersion: "16.0",
  category: "payments",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "StripeClient",
      methods: [
        { kind: "call", name: "*.create", slots: [], makes: "request" },
        { kind: "call", name: "*.retrieve", slots: [], makes: "data-fetch" },
        { kind: "call", name: "*.list", slots: [], makes: "data-fetch" },
        { kind: "call", name: "construct_event", slots: [], classifies: "webhook" },
      ],
    },
    { kind: "call", name: "Customer.create", slots: [], makes: "request" },
    { kind: "call", name: "Webhook.construct_event", slots: [], classifies: "webhook" },
  ],
}

export const braintreeLibrary: CatalogueLibrary = {
  name: "Braintree",
  specifiers: ["braintree"],
  documentedVersion: "4.47",
  category: "payments",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "BraintreeGateway",
      methods: [
        { kind: "call", name: "transaction.sale", slots: [], makes: "request" },
        { kind: "call", name: "client_token.generate", slots: [], makes: "request" },
        { kind: "call", name: "webhook_notification.parse", slots: [], classifies: "webhook" },
      ],
    },
  ],
}

export const adyenPythonLibrary: CatalogueLibrary = {
  name: "Adyen for Python",
  specifiers: ["Adyen", "Adyen.services"],
  documentedVersion: "16.0",
  category: "payments",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Adyen",
      methods: [
        { kind: "call", name: "payments_api.payments", slots: [], makes: "request" },
        { kind: "call", name: "payments_api.sessions", slots: [], makes: "request" },
        { kind: "call", name: "payments_api.update_session", slots: [], makes: "request" },
      ],
    },
    {
      kind: "factory",
      name: "AdyenCheckoutApi",
      methods: [
        { kind: "call", name: "payments_api.payments", slots: [], makes: "request" },
      ],
    },
  ],
}

export const razorpayPythonLibrary: CatalogueLibrary = {
  name: "Razorpay for Python",
  specifiers: ["razorpay"],
  documentedVersion: "2.0",
  category: "payments",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Client",
      methods: [
        { kind: "call", name: "order.create", slots: [], makes: "request" },
        { kind: "call", name: "payment.capture", slots: [], makes: "request" },
        { kind: "call", name: "utility.verify_webhook_signature", slots: [], classifies: "webhook" },
      ],
    },
  ],
}

export const squarePythonLibrary: CatalogueLibrary = {
  name: "Square for Python",
  specifiers: ["square", "square.utils.webhooks_helper"],
  documentedVersion: "46.0",
  category: "payments",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Square",
      methods: [
        { kind: "call", name: "*.create", slots: [], makes: "request" },
        { kind: "call", name: "*.list", slots: [], makes: "data-fetch" },
      ],
    },
    { kind: "call", name: "verify_signature", slots: [], classifies: "webhook" },
  ],
}
