import type { CatalogueLibrary, MethodPattern } from "@/catalogue/types"

const STRIPE_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "*.create", slots: [], makes: "request" },
  { kind: "call", name: "*.update", slots: [], makes: "request" },
  { kind: "call", name: "*.retrieve", slots: [], makes: "data-fetch" },
  { kind: "call", name: "*.list", slots: [], makes: "data-fetch" },
  { kind: "call", name: "rawRequest", slots: [], makes: "request" },
  { kind: "call", name: "webhooks.constructEvent", slots: [], classifies: "webhook" },
  { kind: "call", name: "webhooks.constructEventAsync", slots: [], classifies: "webhook" },
]

export const stripeLibrary: CatalogueLibrary = {
  name: "Stripe",
  specifiers: ["stripe"],
  documentedVersion: "23.0",
  category: "payments",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "default", methods: STRIPE_METHODS },
    { kind: "factory", name: "Stripe", methods: STRIPE_METHODS },
  ],
}

export const razorpayLibrary: CatalogueLibrary = {
  name: "Razorpay",
  specifiers: ["razorpay"],
  documentedVersion: "2.9",
  category: "payments",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "orders.create", slots: [], makes: "request" },
        { kind: "call", name: "payments.capture", slots: [], makes: "request" },
      ],
    },
    { kind: "call", name: "default.validateWebhookSignature", slots: [], classifies: "webhook" },
  ],
}

export const squareLibrary: CatalogueLibrary = {
  name: "Square",
  specifiers: ["square"],
  documentedVersion: "46.0",
  category: "payments",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "SquareClient",
      methods: [
        { kind: "call", name: "*.create", slots: [], makes: "request" },
        { kind: "call", name: "*.get", slots: [], makes: "data-fetch" },
        { kind: "call", name: "*.list", slots: [], makes: "data-fetch" },
      ],
    },
    { kind: "call", name: "WebhooksHelper.verifySignature", slots: [], classifies: "webhook" },
  ],
}

export const adyenLibrary: CatalogueLibrary = {
  name: "Adyen",
  specifiers: ["@adyen/api-library"],
  documentedVersion: "32.2",
  category: "payments",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "CheckoutAPI",
      methods: [
        { kind: "call", name: "PaymentsApi.payments", slots: [], makes: "request" },
        { kind: "call", name: "PaymentsApi.sessions", slots: [], makes: "request" },
      ],
    },
    {
      kind: "factory",
      name: "hmacValidator",
      methods: [
        { kind: "call", name: "validateHMACSignature", slots: [], classifies: "webhook" },
      ],
    },
  ],
}

export const paypalLibrary: CatalogueLibrary = {
  name: "PayPal",
  specifiers: ["@paypal/paypal-server-sdk"],
  documentedVersion: "2.5",
  category: "payments",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "OrdersController",
      methods: [
        { kind: "call", name: "createOrder", slots: [], makes: "request" },
        { kind: "call", name: "captureOrder", slots: [], makes: "request" },
      ],
    },
  ],
}
