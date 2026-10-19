import type { PatternFixture } from "@/catalogue/types"

const STRIPE = "Stripe"

export const stripeFixtures: readonly PatternFixture[] = [
  {
    library: STRIPE,
    patternKey: "factory:default:*",
    matches: [
      "import Stripe from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)",
    ],
    rejects: [
      "const Stripe = (...parts) => parts\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:default:*>call:*.create:*",
    matches: [
      "import Stripe from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)\nconst paymentIntent = await stripe.paymentIntents.create({ amount: 2000, currency: \"usd\" })",
    ],
    rejects: [
      "const stripe = makeLocalRegistry()\nconst paymentIntent = await stripe.paymentIntents.create({ amount: 2000, currency: \"usd\" })",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:default:*>call:*.update:*",
    matches: [
      "import Stripe from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)\nawait stripe.customers.update(customerId, { email: \"ada@example.com\" })",
    ],
    rejects: [
      "const stripe = makeLocalRegistry()\nawait stripe.customers.update(customerId, { email: \"ada@example.com\" })",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:default:*>call:*.retrieve:*",
    matches: [
      "import Stripe from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)\nconst customer = await stripe.customers.retrieve(customerId)",
    ],
    rejects: [
      "const stripe = makeLocalRegistry()\nconst customer = await stripe.customers.retrieve(customerId)",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:default:*>call:*.list:*",
    matches: [
      "import Stripe from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)\nconst customers = await stripe.customers.list({ limit: 3 })",
    ],
    rejects: [
      "const stripe = makeLocalRegistry()\nconst customers = await stripe.customers.list({ limit: 3 })",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:default:*>call:rawRequest:*",
    matches: [
      "import Stripe from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)\nconst response = await stripe.rawRequest(\"POST\", \"/v1/beta_endpoint\", { param: 123 })",
    ],
    rejects: [
      "const stripe = makeLocalRegistry()\nconst response = await stripe.rawRequest(\"POST\", \"/v1/beta_endpoint\", { param: 123 })",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:default:*>call:webhooks.constructEvent:*",
    matches: [
      "import Stripe from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)\nconst event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)",
    ],
    rejects: [
      "const stripe = makeLocalRegistry()\nconst event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:default:*>call:webhooks.constructEventAsync:*",
    matches: [
      "import Stripe from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)\nconst event = await stripe.webhooks.constructEventAsync(body, signature, process.env.STRIPE_WEBHOOK_SECRET)",
    ],
    rejects: [
      "const stripe = makeLocalRegistry()\nconst event = await stripe.webhooks.constructEventAsync(body, signature, process.env.STRIPE_WEBHOOK_SECRET)",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:Stripe:*",
    matches: [
      "import { Stripe } from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)",
    ],
    rejects: [
      "const Stripe = (...parts) => parts\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:Stripe:*>call:*.create:*",
    matches: [
      "import { Stripe } from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)\nconst paymentIntent = await stripe.paymentIntents.create({ amount: 2000, currency: \"usd\" })",
    ],
    rejects: [
      "const stripe = makeLocalRegistry()\nconst paymentIntent = await stripe.paymentIntents.create({ amount: 2000, currency: \"usd\" })",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:Stripe:*>call:*.update:*",
    matches: [
      "import { Stripe } from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)\nawait stripe.customers.update(customerId, { email: \"ada@example.com\" })",
    ],
    rejects: [
      "const stripe = makeLocalRegistry()\nawait stripe.customers.update(customerId, { email: \"ada@example.com\" })",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:Stripe:*>call:*.retrieve:*",
    matches: [
      "import { Stripe } from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)\nconst customer = await stripe.customers.retrieve(customerId)",
    ],
    rejects: [
      "const stripe = makeLocalRegistry()\nconst customer = await stripe.customers.retrieve(customerId)",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:Stripe:*>call:*.list:*",
    matches: [
      "import { Stripe } from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)\nconst customers = await stripe.customers.list({ limit: 3 })",
    ],
    rejects: [
      "const stripe = makeLocalRegistry()\nconst customers = await stripe.customers.list({ limit: 3 })",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:Stripe:*>call:rawRequest:*",
    matches: [
      "import { Stripe } from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)\nconst response = await stripe.rawRequest(\"POST\", \"/v1/beta_endpoint\", { param: 123 })",
    ],
    rejects: [
      "const stripe = makeLocalRegistry()\nconst response = await stripe.rawRequest(\"POST\", \"/v1/beta_endpoint\", { param: 123 })",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:Stripe:*>call:webhooks.constructEvent:*",
    matches: [
      "import { Stripe } from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)\nconst event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)",
    ],
    rejects: [
      "const stripe = makeLocalRegistry()\nconst event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)",
    ],
  },
  {
    library: STRIPE,
    patternKey: "factory:Stripe:*>call:webhooks.constructEventAsync:*",
    matches: [
      "import { Stripe } from \"stripe\"\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY)\nconst event = await stripe.webhooks.constructEventAsync(body, signature, process.env.STRIPE_WEBHOOK_SECRET)",
    ],
    rejects: [
      "const stripe = makeLocalRegistry()\nconst event = await stripe.webhooks.constructEventAsync(body, signature, process.env.STRIPE_WEBHOOK_SECRET)",
    ],
  },
]

const RAZORPAY = "Razorpay"

export const razorpayFixtures: readonly PatternFixture[] = [
  {
    library: RAZORPAY,
    patternKey: "factory:default:*",
    matches: [
      "import Razorpay from \"razorpay\"\nconst instance = new Razorpay({ key_id: \"YOUR_KEY_ID\", key_secret: \"YOUR_KEY_SECRET\" })",
    ],
    rejects: [
      "const Razorpay = (...parts) => parts\nconst instance = new Razorpay({ key_id: \"YOUR_KEY_ID\", key_secret: \"YOUR_KEY_SECRET\" })",
    ],
  },
  {
    library: RAZORPAY,
    patternKey: "factory:default:*>call:orders.create:*",
    matches: [
      "import Razorpay from \"razorpay\"\nconst instance = new Razorpay({ key_id: \"YOUR_KEY_ID\", key_secret: \"YOUR_KEY_SECRET\" })\nconst order = await instance.orders.create({ amount: 1000, currency: \"INR\", receipt: \"Receipt No. 1\" })",
    ],
    rejects: [
      "const instance = makeLocalRegistry()\nconst order = await instance.orders.create({ amount: 1000, currency: \"INR\", receipt: \"Receipt No. 1\" })",
    ],
  },
  {
    library: RAZORPAY,
    patternKey: "factory:default:*>call:payments.capture:*",
    matches: [
      "import Razorpay from \"razorpay\"\nconst instance = new Razorpay({ key_id: \"YOUR_KEY_ID\", key_secret: \"YOUR_KEY_SECRET\" })\nawait instance.payments.capture(paymentId, 1000, \"INR\")",
    ],
    rejects: [
      "const instance = makeLocalRegistry()\nawait instance.payments.capture(paymentId, 1000, \"INR\")",
    ],
  },
  {
    library: RAZORPAY,
    patternKey: "call:default.validateWebhookSignature:*",
    matches: [
      "import Razorpay from \"razorpay\"\nconst isValid = Razorpay.validateWebhookSignature(body, signature, secret)",
    ],
    rejects: [
      "const Razorpay = makeLocalRegistry()\nconst isValid = Razorpay.validateWebhookSignature(body, signature, secret)",
    ],
  },
]

const SQUARE = "Square"

export const squareFixtures: readonly PatternFixture[] = [
  {
    library: SQUARE,
    patternKey: "factory:SquareClient:*",
    matches: [
      "import { SquareClient } from \"square\"\nconst client = new SquareClient({ token: \"YOUR_TOKEN\" })",
    ],
    rejects: [
      "const SquareClient = (...parts) => parts\nconst client = new SquareClient({ token: \"YOUR_TOKEN\" })",
    ],
  },
  {
    library: SQUARE,
    patternKey: "factory:SquareClient:*>call:*.create:*",
    matches: [
      "import { SquareClient } from \"square\"\nconst client = new SquareClient({ token: \"YOUR_TOKEN\" })\nawait client.payments.create({ sourceId, idempotencyKey, amountMoney: { amount: BigInt(\"1000\"), currency: \"USD\" } })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nawait client.payments.create({ sourceId, idempotencyKey, amountMoney: { amount: BigInt(\"1000\"), currency: \"USD\" } })",
    ],
  },
  {
    library: SQUARE,
    patternKey: "factory:SquareClient:*>call:*.get:*",
    matches: [
      "import { SquareClient } from \"square\"\nconst client = new SquareClient({ token: \"YOUR_TOKEN\" })\nconst location = await client.locations.get({ locationId: \"locationId\" })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst location = await client.locations.get({ locationId: \"locationId\" })",
    ],
  },
  {
    library: SQUARE,
    patternKey: "factory:SquareClient:*>call:*.list:*",
    matches: [
      "import { SquareClient } from \"square\"\nconst client = new SquareClient({ token: \"YOUR_TOKEN\" })\nconst pageableResponse = await client.bankAccounts.list({ limit: 1 })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst pageableResponse = await client.bankAccounts.list({ limit: 1 })",
    ],
  },
  {
    library: SQUARE,
    patternKey: "call:WebhooksHelper.verifySignature:*",
    matches: [
      "import { WebhooksHelper } from \"square\"\nconst isValid = await WebhooksHelper.verifySignature({ requestBody, signatureHeader, signatureKey, notificationUrl })",
    ],
    rejects: [
      "const WebhooksHelper = makeLocalRegistry()\nconst isValid = await WebhooksHelper.verifySignature({ requestBody, signatureHeader, signatureKey, notificationUrl })",
    ],
  },
]

const ADYEN = "Adyen"

export const adyenFixtures: readonly PatternFixture[] = [
  {
    library: ADYEN,
    patternKey: "factory:CheckoutAPI:*",
    matches: [
      "import { Client, CheckoutAPI } from \"@adyen/api-library\"\nconst client = new Client({ apiKey: \"YOUR_API_KEY\", environment: \"TEST\" })\nconst checkoutApi = new CheckoutAPI(client)",
    ],
    rejects: [
      "const CheckoutAPI = (...parts) => parts\nconst checkoutApi = new CheckoutAPI(client)",
    ],
  },
  {
    library: ADYEN,
    patternKey: "factory:CheckoutAPI:*>call:PaymentsApi.payments:*",
    matches: [
      "import { Client, CheckoutAPI } from \"@adyen/api-library\"\nconst client = new Client({ apiKey: \"YOUR_API_KEY\", environment: \"TEST\" })\nconst checkoutApi = new CheckoutAPI(client)\nconst paymentResponse = await checkoutApi.PaymentsApi.payments(paymentRequest)",
    ],
    rejects: [
      "const checkoutApi = makeLocalRegistry()\nconst paymentResponse = await checkoutApi.PaymentsApi.payments(paymentRequest)",
    ],
  },
  {
    library: ADYEN,
    patternKey: "factory:CheckoutAPI:*>call:PaymentsApi.sessions:*",
    matches: [
      "import { Client, CheckoutAPI } from \"@adyen/api-library\"\nconst client = new Client({ apiKey: \"YOUR_API_KEY\", environment: \"TEST\" })\nconst checkoutApi = new CheckoutAPI(client)\nconst sessionResponse = await checkoutApi.PaymentsApi.sessions(createSessionRequest)",
    ],
    rejects: [
      "const checkoutApi = makeLocalRegistry()\nconst sessionResponse = await checkoutApi.PaymentsApi.sessions(createSessionRequest)",
    ],
  },
  {
    library: ADYEN,
    patternKey: "factory:hmacValidator:*",
    matches: [
      "import { hmacValidator } from \"@adyen/api-library\"\nconst validator = new hmacValidator()",
    ],
    rejects: [
      "const hmacValidator = (...parts) => parts\nconst validator = new hmacValidator()",
    ],
  },
  {
    library: ADYEN,
    patternKey: "factory:hmacValidator:*>call:validateHMACSignature:*",
    matches: [
      "import { hmacValidator } from \"@adyen/api-library\"\nconst validator = new hmacValidator()\nconst isValid = validator.validateHMACSignature(hmacKey, hmacSignature, jsonString)",
    ],
    rejects: [
      "const validator = makeLocalRegistry()\nconst isValid = validator.validateHMACSignature(hmacKey, hmacSignature, jsonString)",
    ],
  },
]

const PAYPAL = "PayPal"

export const paypalFixtures: readonly PatternFixture[] = [
  {
    library: PAYPAL,
    patternKey: "factory:OrdersController:*",
    matches: [
      "import { Client, OrdersController } from \"@paypal/paypal-server-sdk\"\nconst ordersController = new OrdersController(client)",
    ],
    rejects: [
      "const OrdersController = (...parts) => parts\nconst ordersController = new OrdersController(client)",
    ],
  },
  {
    library: PAYPAL,
    patternKey: "factory:OrdersController:*>call:createOrder:*",
    matches: [
      "import { Client, OrdersController } from \"@paypal/paypal-server-sdk\"\nconst ordersController = new OrdersController(client)\nconst response = await ordersController.createOrder({ body: { intent: \"CAPTURE\", purchaseUnits }, prefer: \"return=minimal\" })",
    ],
    rejects: [
      "const ordersController = makeLocalRegistry()\nconst response = await ordersController.createOrder({ body: { intent: \"CAPTURE\", purchaseUnits }, prefer: \"return=minimal\" })",
    ],
  },
  {
    library: PAYPAL,
    patternKey: "factory:OrdersController:*>call:captureOrder:*",
    matches: [
      "import { Client, OrdersController } from \"@paypal/paypal-server-sdk\"\nconst ordersController = new OrdersController(client)\nconst response = await ordersController.captureOrder({ id: orderId, prefer: \"return=minimal\" })",
    ],
    rejects: [
      "const ordersController = makeLocalRegistry()\nconst response = await ordersController.captureOrder({ id: orderId, prefer: \"return=minimal\" })",
    ],
  },
]
