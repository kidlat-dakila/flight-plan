import type { PatternFixture } from "@/catalogue/types"

const STRIPE_PYTHON = "Stripe for Python"

export const stripePythonFixtures: readonly PatternFixture[] = [
  {
    library: STRIPE_PYTHON,
    patternKey: "factory:StripeClient:*",
    matches: [
      "from stripe import StripeClient\n\nclient = StripeClient(\"sk_test_...\")",
    ],
    rejects: [
      "def StripeClient(*parts, **options):\n    return parts\n\nclient = StripeClient(\"sk_test_...\")",
    ],
  },
  {
    library: STRIPE_PYTHON,
    patternKey: "factory:StripeClient:*>call:*.create:*",
    matches: [
      "from stripe import StripeClient\n\nclient = StripeClient(\"sk_test_...\")\n\ncustomer = client.v1.customers.create(params={\"email\": \"ada@example.com\"})",
    ],
    rejects: [
      "client = LocalRegistry()\n\ncustomer = client.v1.customers.create(params={\"email\": \"ada@example.com\"})",
    ],
  },
  {
    library: STRIPE_PYTHON,
    patternKey: "factory:StripeClient:*>call:*.retrieve:*",
    matches: [
      "from stripe import StripeClient\n\nclient = StripeClient(\"sk_test_...\")\n\ncustomer = client.v1.customers.retrieve(\"cus_123456789\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\ncustomer = client.v1.customers.retrieve(\"cus_123456789\")",
    ],
  },
  {
    library: STRIPE_PYTHON,
    patternKey: "factory:StripeClient:*>call:*.list:*",
    matches: [
      "from stripe import StripeClient\n\nclient = StripeClient(\"sk_test_...\")\n\ncustomers = client.v1.customers.list()",
    ],
    rejects: [
      "client = LocalRegistry()\n\ncustomers = client.v1.customers.list()",
    ],
  },
  {
    library: STRIPE_PYTHON,
    patternKey: "factory:StripeClient:*>call:construct_event:*",
    matches: [
      "from stripe import StripeClient\n\nclient = StripeClient(\"sk_test_...\")\n\nevent = client.construct_event(payload, sig_header, endpoint_secret)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nevent = client.construct_event(payload, sig_header, endpoint_secret)",
    ],
  },
  {
    library: STRIPE_PYTHON,
    patternKey: "call:Customer.create:*",
    matches: [
      "import stripe\n\nstripe.Customer.create(name=\"Jenny Rosen\", email=\"jennyrosen@example.com\")",
    ],
    rejects: [
      "stripe = LocalRegistry()\n\nstripe.Customer.create(name=\"Jenny Rosen\", email=\"jennyrosen@example.com\")",
    ],
  },
  {
    library: STRIPE_PYTHON,
    patternKey: "call:Webhook.construct_event:*",
    matches: [
      "import stripe\n\nevent = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)",
    ],
    rejects: [
      "stripe = LocalRegistry()\n\nevent = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)",
    ],
  },
]

const BRAINTREE = "Braintree"

export const braintreeFixtures: readonly PatternFixture[] = [
  {
    library: BRAINTREE,
    patternKey: "factory:BraintreeGateway:*",
    matches: [
      "import braintree\n\ngateway = braintree.BraintreeGateway(access_token=access_token)",
    ],
    rejects: [
      "braintree = LocalRegistry()\n\ngateway = braintree.BraintreeGateway(access_token=access_token)",
    ],
  },
  {
    library: BRAINTREE,
    patternKey: "factory:BraintreeGateway:*>call:transaction.sale:*",
    matches: [
      "import braintree\n\ngateway = braintree.BraintreeGateway(access_token=access_token)\n\nresult = gateway.transaction.sale({\"amount\": \"10.00\", \"payment_method_nonce\": nonce})",
    ],
    rejects: [
      "gateway = LocalRegistry()\n\nresult = gateway.transaction.sale({\"amount\": \"10.00\", \"payment_method_nonce\": nonce})",
    ],
  },
  {
    library: BRAINTREE,
    patternKey: "factory:BraintreeGateway:*>call:client_token.generate:*",
    matches: [
      "import braintree\n\ngateway = braintree.BraintreeGateway(access_token=access_token)\n\nclient_token = gateway.client_token.generate()",
    ],
    rejects: [
      "gateway = LocalRegistry()\n\nclient_token = gateway.client_token.generate()",
    ],
  },
  {
    library: BRAINTREE,
    patternKey: "factory:BraintreeGateway:*>call:webhook_notification.parse:*",
    matches: [
      "import braintree\n\ngateway = braintree.BraintreeGateway(access_token=access_token)\n\nwebhook_notification = gateway.webhook_notification.parse(str(request.form[\"bt_signature\"]), request.form[\"bt_payload\"])",
    ],
    rejects: [
      "gateway = LocalRegistry()\n\nwebhook_notification = gateway.webhook_notification.parse(str(request.form[\"bt_signature\"]), request.form[\"bt_payload\"])",
    ],
  },
]

const ADYEN_PYTHON = "Adyen for Python"

export const adyenPythonFixtures: readonly PatternFixture[] = [
  {
    library: ADYEN_PYTHON,
    patternKey: "factory:Adyen:*",
    matches: [
      "import Adyen\n\nadyen = Adyen.Adyen()",
    ],
    rejects: [
      "Adyen = LocalRegistry()\n\nadyen = Adyen.Adyen()",
    ],
  },
  {
    library: ADYEN_PYTHON,
    patternKey: "factory:Adyen:*>call:payments_api.payments:*",
    matches: [
      "import Adyen\n\nadyen = Adyen.Adyen()\n\nresult = adyen.checkout.payments_api.payments(request)",
    ],
    rejects: [
      "adyen = LocalRegistry()\n\nresult = adyen.checkout.payments_api.payments(request)",
    ],
  },
  {
    library: ADYEN_PYTHON,
    patternKey: "factory:Adyen:*>call:payments_api.sessions:*",
    matches: [
      "import Adyen\n\nadyen = Adyen.Adyen()\n\nresult = adyen.checkout.payments_api.sessions(request=json_request, idempotency_key=\"UUID\")",
    ],
    rejects: [
      "adyen = LocalRegistry()\n\nresult = adyen.checkout.payments_api.sessions(request=json_request, idempotency_key=\"UUID\")",
    ],
  },
  {
    library: ADYEN_PYTHON,
    patternKey: "factory:Adyen:*>call:payments_api.update_session:*",
    matches: [
      "import Adyen\n\nadyen = Adyen.Adyen()\n\nresult = adyen.checkout.payments_api.update_session(request=json_request, sessionId=session_id)",
    ],
    rejects: [
      "adyen = LocalRegistry()\n\nresult = adyen.checkout.payments_api.update_session(request=json_request, sessionId=session_id)",
    ],
  },
  {
    library: ADYEN_PYTHON,
    patternKey: "factory:AdyenCheckoutApi:*",
    matches: [
      "from Adyen.services import AdyenCheckoutApi\n\ncheckout_service = AdyenCheckoutApi(client=adyen_client)",
    ],
    rejects: [
      "def AdyenCheckoutApi(*parts, **options):\n    return parts\n\ncheckout_service = AdyenCheckoutApi(client=adyen_client)",
    ],
  },
  {
    library: ADYEN_PYTHON,
    patternKey: "factory:AdyenCheckoutApi:*>call:payments_api.payments:*",
    matches: [
      "from Adyen.services import AdyenCheckoutApi\n\ncheckout_service = AdyenCheckoutApi(client=adyen_client)\n\npayment_result = checkout_service.payments_api.payments(request)",
    ],
    rejects: [
      "checkout_service = LocalRegistry()\n\npayment_result = checkout_service.payments_api.payments(request)",
    ],
  },
]

const RAZORPAY_PYTHON = "Razorpay for Python"

export const razorpayPythonFixtures: readonly PatternFixture[] = [
  {
    library: RAZORPAY_PYTHON,
    patternKey: "factory:Client:*",
    matches: [
      "import razorpay\n\nclient = razorpay.Client(auth=(\"YOUR_ID\", \"YOUR_SECRET\"))",
    ],
    rejects: [
      "razorpay = LocalRegistry()\n\nclient = razorpay.Client(auth=(\"YOUR_ID\", \"YOUR_SECRET\"))",
    ],
  },
  {
    library: RAZORPAY_PYTHON,
    patternKey: "factory:Client:*>call:order.create:*",
    matches: [
      "import razorpay\n\nclient = razorpay.Client(auth=(\"YOUR_ID\", \"YOUR_SECRET\"))\n\norder = client.order.create({\"amount\": 50000, \"currency\": \"INR\", \"receipt\": \"receipt#1\"})",
    ],
    rejects: [
      "client = LocalRegistry()\n\norder = client.order.create({\"amount\": 50000, \"currency\": \"INR\", \"receipt\": \"receipt#1\"})",
    ],
  },
  {
    library: RAZORPAY_PYTHON,
    patternKey: "factory:Client:*>call:payment.capture:*",
    matches: [
      "import razorpay\n\nclient = razorpay.Client(auth=(\"YOUR_ID\", \"YOUR_SECRET\"))\n\nclient.payment.capture(payment_id, {\"amount\": 50000, \"currency\": \"INR\"})",
    ],
    rejects: [
      "client = LocalRegistry()\n\nclient.payment.capture(payment_id, {\"amount\": 50000, \"currency\": \"INR\"})",
    ],
  },
  {
    library: RAZORPAY_PYTHON,
    patternKey: "factory:Client:*>call:utility.verify_webhook_signature:*",
    matches: [
      "import razorpay\n\nclient = razorpay.Client(auth=(\"YOUR_ID\", \"YOUR_SECRET\"))\n\nclient.utility.verify_webhook_signature(body, signature, secret)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nclient.utility.verify_webhook_signature(body, signature, secret)",
    ],
  },
]

const SQUARE_PYTHON = "Square for Python"

export const squarePythonFixtures: readonly PatternFixture[] = [
  {
    library: SQUARE_PYTHON,
    patternKey: "factory:Square:*",
    matches: [
      "from square import Square\n\nclient = Square(token=os.environ.get(\"SQUARE_TOKEN\"))",
    ],
    rejects: [
      "def Square(*parts, **options):\n    return parts\n\nclient = Square(token=os.environ.get(\"SQUARE_TOKEN\"))",
    ],
  },
  {
    library: SQUARE_PYTHON,
    patternKey: "factory:Square:*>call:*.create:*",
    matches: [
      "from square import Square\n\nclient = Square(token=os.environ.get(\"SQUARE_TOKEN\"))\n\nclient.payments.create(source_id=\"ccof:GaJGNaZa8x4OgDJn4GB\", idempotency_key=idempotency_key, amount_money={\"amount\": 1000, \"currency\": \"USD\"})",
    ],
    rejects: [
      "client = LocalRegistry()\n\nclient.payments.create(source_id=\"ccof:GaJGNaZa8x4OgDJn4GB\", idempotency_key=idempotency_key, amount_money={\"amount\": 1000, \"currency\": \"USD\"})",
    ],
  },
  {
    library: SQUARE_PYTHON,
    patternKey: "factory:Square:*>call:*.list:*",
    matches: [
      "from square import Square\n\nclient = Square(token=os.environ.get(\"SQUARE_TOKEN\"))\n\nresponse = client.payments.list()",
    ],
    rejects: [
      "client = LocalRegistry()\n\nresponse = client.payments.list()",
    ],
  },
  {
    library: SQUARE_PYTHON,
    patternKey: "call:verify_signature:*",
    matches: [
      "from square.utils.webhooks_helper import verify_signature\n\nis_valid = verify_signature(request_body=body, signature_header=signature, signature_key=key, notification_url=url)",
    ],
    rejects: [
      "def verify_signature(*parts, **options):\n    return parts\n\nis_valid = verify_signature(request_body=body, signature_header=signature, signature_key=key, notification_url=url)",
    ],
  },
]
