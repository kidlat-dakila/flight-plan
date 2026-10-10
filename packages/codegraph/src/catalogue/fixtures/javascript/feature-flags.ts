import type { PatternFixture } from "@/catalogue/types"

const FLAGSMITH = "Flagsmith"

export const flagsmithFixtures: readonly PatternFixture[] = [
  {
    library: FLAGSMITH,
    patternKey: "call:default.init@flagsmith:*",
    matches: [
      "import flagsmith from \"flagsmith\"\nawait flagsmith.init({ environmentID: \"<YOUR_ENVIRONMENT_KEY>\" })",
    ],
    rejects: [
      "const flagsmith = makeLocalRegistry()\nawait flagsmith.init({ environmentID: \"<YOUR_ENVIRONMENT_KEY>\" })",
    ],
  },
  {
    library: FLAGSMITH,
    patternKey: "call:default.hasFeature@flagsmith:*",
    matches: [
      "import flagsmith from \"flagsmith\"\nconst enabled = flagsmith.hasFeature(\"my_feature\")",
    ],
    rejects: [
      "const flagsmith = makeLocalRegistry()\nconst enabled = flagsmith.hasFeature(\"my_feature\")",
    ],
  },
  {
    library: FLAGSMITH,
    patternKey: "call:default.getValue@flagsmith:*",
    matches: [
      "import flagsmith from \"flagsmith\"\nconst size = flagsmith.getValue(\"font_size\")",
    ],
    rejects: [
      "const flagsmith = makeLocalRegistry()\nconst size = flagsmith.getValue(\"font_size\")",
    ],
  },
  {
    library: FLAGSMITH,
    patternKey: "call:default.identify@flagsmith:*",
    matches: [
      "import flagsmith from \"flagsmith\"\nawait flagsmith.identify(\"user-1\", { plan: \"pro\" })",
    ],
    rejects: [
      "const flagsmith = makeLocalRegistry()\nawait flagsmith.identify(\"user-1\", { plan: \"pro\" })",
    ],
  },
  {
    library: FLAGSMITH,
    patternKey: "call:useFlags:*",
    matches: [
      "import { useFlags } from \"flagsmith/react\"\nconst flags = useFlags([\"font_size\"])",
    ],
    rejects: [
      "const useFlags = (...parts) => parts\nconst flags = useFlags([\"font_size\"])",
    ],
  },
]

const GROWTHBOOK = "GrowthBook"

export const growthbookFixtures: readonly PatternFixture[] = [
  {
    library: GROWTHBOOK,
    patternKey: "factory:GrowthBook:*",
    matches: [
      "import { GrowthBook } from \"@growthbook/growthbook\"\nconst gb = new GrowthBook({ apiHost, clientKey })",
    ],
    rejects: [
      "const GrowthBook = (...parts) => parts\nconst gb = new GrowthBook({ apiHost, clientKey })",
    ],
  },
  {
    library: GROWTHBOOK,
    patternKey: "factory:GrowthBook:*>call:isOn:*",
    matches: [
      "import { GrowthBook } from \"@growthbook/growthbook\"\nconst gb = new GrowthBook({ apiHost, clientKey })\nconst enabled = gb.isOn(\"my-feature\")",
    ],
    rejects: [
      "const gb = makeLocalRegistry()\nconst enabled = gb.isOn(\"my-feature\")",
    ],
  },
  {
    library: GROWTHBOOK,
    patternKey: "factory:GrowthBook:*>call:getFeatureValue:*",
    matches: [
      "import { GrowthBook } from \"@growthbook/growthbook\"\nconst gb = new GrowthBook({ apiHost, clientKey })\nconst color = gb.getFeatureValue(\"button-color\", \"blue\")",
    ],
    rejects: [
      "const gb = makeLocalRegistry()\nconst color = gb.getFeatureValue(\"button-color\", \"blue\")",
    ],
  },
  {
    library: GROWTHBOOK,
    patternKey: "factory:GrowthBook:*>call:run:*",
    matches: [
      "import { GrowthBook } from \"@growthbook/growthbook\"\nconst gb = new GrowthBook({ apiHost, clientKey })\nconst { value } = gb.run({ key: \"my-experiment\", variations: [\"red\", \"blue\"] })",
    ],
    rejects: [
      "const gb = makeLocalRegistry()\nconst { value } = gb.run({ key: \"my-experiment\", variations: [\"red\", \"blue\"] })",
    ],
  },
  {
    library: GROWTHBOOK,
    patternKey: "call:useFeatureIsOn:*",
    matches: [
      "import { useFeatureIsOn } from \"@growthbook/growthbook-react\"\nconst enabled = useFeatureIsOn(\"my-feature\")",
    ],
    rejects: [
      "const useFeatureIsOn = (...parts) => parts\nconst enabled = useFeatureIsOn(\"my-feature\")",
    ],
  },
  {
    library: GROWTHBOOK,
    patternKey: "call:useFeatureValue:*",
    matches: [
      "import { useFeatureValue } from \"@growthbook/growthbook-react\"\nconst color = useFeatureValue(\"button-color\", \"blue\")",
    ],
    rejects: [
      "const useFeatureValue = (...parts) => parts\nconst color = useFeatureValue(\"button-color\", \"blue\")",
    ],
  },
]

const LAUNCHDARKLY = "LaunchDarkly"

export const launchdarklyFixtures: readonly PatternFixture[] = [
  {
    library: LAUNCHDARKLY,
    patternKey: "factory:init:*",
    matches: [
      "import { init } from \"@launchdarkly/node-server-sdk\"\nconst ldClient = init(process.env.LAUNCHDARKLY_SDK_KEY)",
    ],
    rejects: [
      "const init = (...parts) => parts\nconst ldClient = init(process.env.LAUNCHDARKLY_SDK_KEY)",
    ],
  },
  {
    library: LAUNCHDARKLY,
    patternKey: "factory:init:*>call:variation:*",
    matches: [
      "import { init } from \"@launchdarkly/node-server-sdk\"\nconst ldClient = init(process.env.LAUNCHDARKLY_SDK_KEY)\nconst value = await ldClient.variation(\"flag-key\", context, false)",
    ],
    rejects: [
      "const ldClient = makeLocalRegistry()\nconst value = await ldClient.variation(\"flag-key\", context, false)",
    ],
  },
  {
    library: LAUNCHDARKLY,
    patternKey: "call:useFlags:*",
    matches: [
      "import { useFlags } from \"launchdarkly-react-client-sdk\"\nconst { newCheckout } = useFlags()",
    ],
    rejects: [
      "const useFlags = (...parts) => parts\nconst { newCheckout } = useFlags()",
    ],
  },
]

const OPENFEATURE = "OpenFeature"

export const openfeatureFixtures: readonly PatternFixture[] = [
  {
    library: OPENFEATURE,
    patternKey: "factory:OpenFeature.getClient:*",
    matches: [
      "import { OpenFeature } from \"@openfeature/server-sdk\"\nconst client = OpenFeature.getClient()",
    ],
    rejects: [
      "const OpenFeature = makeLocalRegistry()\nconst client = OpenFeature.getClient()",
    ],
  },
  {
    library: OPENFEATURE,
    patternKey: "factory:OpenFeature.getClient:*>call:getBooleanValue:*",
    matches: [
      "import { OpenFeature } from \"@openfeature/server-sdk\"\nconst client = OpenFeature.getClient()\nconst value = await client.getBooleanValue(\"new-message\", false)",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst value = await client.getBooleanValue(\"new-message\", false)",
    ],
  },
  {
    library: OPENFEATURE,
    patternKey: "factory:OpenFeature.getClient:*>call:getStringValue:*",
    matches: [
      "import { OpenFeature } from \"@openfeature/server-sdk\"\nconst client = OpenFeature.getClient()\nconst value = await client.getStringValue(\"new-message\", false)",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst value = await client.getStringValue(\"new-message\", false)",
    ],
  },
  {
    library: OPENFEATURE,
    patternKey: "factory:OpenFeature.getClient:*>call:getNumberValue:*",
    matches: [
      "import { OpenFeature } from \"@openfeature/server-sdk\"\nconst client = OpenFeature.getClient()\nconst value = await client.getNumberValue(\"new-message\", false)",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst value = await client.getNumberValue(\"new-message\", false)",
    ],
  },
  {
    library: OPENFEATURE,
    patternKey: "factory:OpenFeature.getClient:*>call:getObjectValue:*",
    matches: [
      "import { OpenFeature } from \"@openfeature/server-sdk\"\nconst client = OpenFeature.getClient()\nconst value = await client.getObjectValue(\"new-message\", false)",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst value = await client.getObjectValue(\"new-message\", false)",
    ],
  },
  {
    library: OPENFEATURE,
    patternKey: "call:OpenFeature.setProvider:*",
    matches: [
      "import { OpenFeature } from \"@openfeature/server-sdk\"\nOpenFeature.setProvider(new YourProviderOfChoice())",
    ],
    rejects: [
      "const OpenFeature = makeLocalRegistry()\nOpenFeature.setProvider(new YourProviderOfChoice())",
    ],
  },
  {
    library: OPENFEATURE,
    patternKey: "call:useFlag:*",
    matches: [
      "import { useFlag } from \"@openfeature/react-sdk\"\nconst { value: showNewMessage } = useFlag(\"new-message\", false)",
    ],
    rejects: [
      "const useFlag = (...parts) => parts\nconst { value: showNewMessage } = useFlag(\"new-message\", false)",
    ],
  },
  {
    library: OPENFEATURE,
    patternKey: "call:useBooleanFlagValue:*",
    matches: [
      "import { useBooleanFlagValue } from \"@openfeature/react-sdk\"\nconst showNewMessage = useBooleanFlagValue(\"new-message\", false)",
    ],
    rejects: [
      "const useBooleanFlagValue = (...parts) => parts\nconst showNewMessage = useBooleanFlagValue(\"new-message\", false)",
    ],
  },
]

const OPTIMIZELY = "Optimizely"

export const optimizelyFixtures: readonly PatternFixture[] = [
  {
    library: OPTIMIZELY,
    patternKey: "factory:createInstance:*",
    matches: [
      "import { createInstance } from \"@optimizely/optimizely-sdk\"\nconst optimizely = createInstance({ projectConfigManager, eventProcessor })",
    ],
    rejects: [
      "const createInstance = (...parts) => parts\nconst optimizely = createInstance({ projectConfigManager, eventProcessor })",
    ],
  },
  {
    library: OPTIMIZELY,
    patternKey: "factory:createInstance:*>factory:createUserContext:*",
    matches: [
      "import { createInstance } from \"@optimizely/optimizely-sdk\"\nconst optimizely = createInstance({ projectConfigManager, eventProcessor })\nconst user = optimizely.createUserContext(\"user123\", { logged_in: true })",
    ],
    rejects: [
      "const optimizely = makeLocalRegistry()\nconst user = optimizely.createUserContext(\"user123\", { logged_in: true })",
    ],
  },
  {
    library: OPTIMIZELY,
    patternKey: "factory:createInstance:*>factory:createUserContext:*>call:decide:*",
    matches: [
      "import { createInstance } from \"@optimizely/optimizely-sdk\"\nconst optimizely = createInstance({ projectConfigManager, eventProcessor })\nconst user = optimizely.createUserContext(\"user123\", { logged_in: true })\nconst decision = user.decide(\"product_sort\")",
    ],
    rejects: [
      "const user = makeLocalRegistry()\nconst decision = user.decide(\"product_sort\")",
    ],
  },
  {
    library: OPTIMIZELY,
    patternKey: "factory:createInstance:*>factory:createUserContext:*>call:trackEvent:*",
    matches: [
      "import { createInstance } from \"@optimizely/optimizely-sdk\"\nconst optimizely = createInstance({ projectConfigManager, eventProcessor })\nconst user = optimizely.createUserContext(\"user123\", { logged_in: true })\nuser.trackEvent(\"purchased\")",
    ],
    rejects: [
      "const user = makeLocalRegistry()\nuser.trackEvent(\"purchased\")",
    ],
  },
  {
    library: OPTIMIZELY,
    patternKey: "call:useDecision:*",
    matches: [
      "import { useDecision } from \"@optimizely/react-sdk\"\nconst [decision] = useDecision(\"product_sort\")",
    ],
    rejects: [
      "const useDecision = (...parts) => parts\nconst [decision] = useDecision(\"product_sort\")",
    ],
  },
]

const POSTHOG = "PostHog"

export const posthogFixtures: readonly PatternFixture[] = [
  {
    library: POSTHOG,
    patternKey: "call:default.capture@posthog-js:*",
    matches: [
      "import posthog from \"posthog-js\"\nposthog.capture(\"user_signed_up\", { plan: \"pro\" })",
    ],
    rejects: [
      "const posthog = makeLocalRegistry()\nposthog.capture(\"user_signed_up\", { plan: \"pro\" })",
    ],
  },
  {
    library: POSTHOG,
    patternKey: "call:default.identify@posthog-js:*",
    matches: [
      "import posthog from \"posthog-js\"\nposthog.identify(\"distinct-id\", { email: \"ada@example.com\" })",
    ],
    rejects: [
      "const posthog = makeLocalRegistry()\nposthog.identify(\"distinct-id\", { email: \"ada@example.com\" })",
    ],
  },
  {
    library: POSTHOG,
    patternKey: "call:default.isFeatureEnabled@posthog-js:*",
    matches: [
      "import posthog from \"posthog-js\"\nconst enabled = posthog.isFeatureEnabled(\"new-checkout\")",
    ],
    rejects: [
      "const posthog = makeLocalRegistry()\nconst enabled = posthog.isFeatureEnabled(\"new-checkout\")",
    ],
  },
  {
    library: POSTHOG,
    patternKey: "call:default.getFeatureFlag@posthog-js:*",
    matches: [
      "import posthog from \"posthog-js\"\nconst variant = posthog.getFeatureFlag(\"new-checkout\")",
    ],
    rejects: [
      "const posthog = makeLocalRegistry()\nconst variant = posthog.getFeatureFlag(\"new-checkout\")",
    ],
  },
  {
    library: POSTHOG,
    patternKey: "call:default.onFeatureFlags@posthog-js:*",
    matches: [
      "import posthog from \"posthog-js\"\nposthog.onFeatureFlags(() => { render() })",
    ],
    rejects: [
      "const posthog = makeLocalRegistry()\nposthog.onFeatureFlags(() => { render() })",
    ],
  },
  {
    library: POSTHOG,
    patternKey: "call:useFeatureFlagEnabled:*",
    matches: [
      "import { useFeatureFlagEnabled } from \"posthog-js/react\"\nconst enabled = useFeatureFlagEnabled(\"new-checkout\")",
    ],
    rejects: [
      "const useFeatureFlagEnabled = (...parts) => parts\nconst enabled = useFeatureFlagEnabled(\"new-checkout\")",
    ],
  },
  {
    library: POSTHOG,
    patternKey: "factory:PostHog:*",
    matches: [
      "import { PostHog } from \"posthog-node\"\nconst client = new PostHog(process.env.POSTHOG_KEY)",
    ],
    rejects: [
      "const PostHog = (...parts) => parts\nconst client = new PostHog(process.env.POSTHOG_KEY)",
    ],
  },
  {
    library: POSTHOG,
    patternKey: "factory:PostHog:*>call:capture:*",
    matches: [
      "import { PostHog } from \"posthog-node\"\nconst client = new PostHog(process.env.POSTHOG_KEY)\nclient.capture({ distinctId: \"user-1\", event: \"user_signed_up\" })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nclient.capture({ distinctId: \"user-1\", event: \"user_signed_up\" })",
    ],
  },
  {
    library: POSTHOG,
    patternKey: "factory:PostHog:*>call:isFeatureEnabled:*",
    matches: [
      "import { PostHog } from \"posthog-node\"\nconst client = new PostHog(process.env.POSTHOG_KEY)\nconst enabled = await client.isFeatureEnabled(\"new-checkout\", \"user-1\")",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst enabled = await client.isFeatureEnabled(\"new-checkout\", \"user-1\")",
    ],
  },
  {
    library: POSTHOG,
    patternKey: "factory:PostHog:*>call:getFeatureFlag:*",
    matches: [
      "import { PostHog } from \"posthog-node\"\nconst client = new PostHog(process.env.POSTHOG_KEY)\nconst variant = await client.getFeatureFlag(\"new-checkout\", \"user-1\")",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst variant = await client.getFeatureFlag(\"new-checkout\", \"user-1\")",
    ],
  },
]

const SPLIT = "Split"

export const splitFixtures: readonly PatternFixture[] = [
  {
    library: SPLIT,
    patternKey: "factory:SplitFactory:*",
    matches: [
      "import { SplitFactory } from \"@splitsoftware/splitio\"\nconst factory = SplitFactory({ core: { authorizationKey: \"YOUR_SDK_KEY\" } })",
    ],
    rejects: [
      "const SplitFactory = (...parts) => parts\nconst factory = SplitFactory({ core: { authorizationKey: \"YOUR_SDK_KEY\" } })",
    ],
  },
  {
    library: SPLIT,
    patternKey: "factory:SplitFactory:*>factory:client:*",
    matches: [
      "import { SplitFactory } from \"@splitsoftware/splitio\"\nconst factory = SplitFactory({ core: { authorizationKey: \"YOUR_SDK_KEY\" } })\nconst client = factory.client()",
    ],
    rejects: [
      "const factory = makeLocalRegistry()\nconst client = factory.client()",
    ],
  },
  {
    library: SPLIT,
    patternKey: "factory:SplitFactory:*>factory:client:*>call:getTreatment:*",
    matches: [
      "import { SplitFactory } from \"@splitsoftware/splitio\"\nconst factory = SplitFactory({ core: { authorizationKey: \"YOUR_SDK_KEY\" } })\nconst client = factory.client()\nconst treatment = client.getTreatment(\"key\", \"FEATURE_FLAG_NAME\")",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst treatment = client.getTreatment(\"key\", \"FEATURE_FLAG_NAME\")",
    ],
  },
  {
    library: SPLIT,
    patternKey: "factory:SplitFactory:*>factory:client:*>call:track:*",
    matches: [
      "import { SplitFactory } from \"@splitsoftware/splitio\"\nconst factory = SplitFactory({ core: { authorizationKey: \"YOUR_SDK_KEY\" } })\nconst client = factory.client()\nclient.track(\"key\", \"user\", \"page_load_time\", 83.334)",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nclient.track(\"key\", \"user\", \"page_load_time\", 83.334)",
    ],
  },
  {
    library: SPLIT,
    patternKey: "factory:SplitFactory:*>factory:client:*>call:on:*",
    matches: [
      "import { SplitFactory } from \"@splitsoftware/splitio\"\nconst factory = SplitFactory({ core: { authorizationKey: \"YOUR_SDK_KEY\" } })\nconst client = factory.client()\nclient.on(client.Event.SDK_READY, () => { render() })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nclient.on(client.Event.SDK_READY, () => { render() })",
    ],
  },
]

const STATSIG = "Statsig"

export const statsigFixtures: readonly PatternFixture[] = [
  {
    library: STATSIG,
    patternKey: "factory:StatsigClient:*",
    matches: [
      "import { StatsigClient } from \"@statsig/js-client\"\nconst client = new StatsigClient(\"client-key\", { userID: \"a-user\" })",
    ],
    rejects: [
      "const StatsigClient = (...parts) => parts\nconst client = new StatsigClient(\"client-key\", { userID: \"a-user\" })",
    ],
  },
  {
    library: STATSIG,
    patternKey: "factory:StatsigClient:*>call:checkGate:*",
    matches: [
      "import { StatsigClient } from \"@statsig/js-client\"\nconst client = new StatsigClient(\"client-key\", { userID: \"a-user\" })\nconst value = client.checkGate(\"my_gate\")",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst value = client.checkGate(\"my_gate\")",
    ],
  },
  {
    library: STATSIG,
    patternKey: "factory:StatsigClient:*>call:getDynamicConfig:*",
    matches: [
      "import { StatsigClient } from \"@statsig/js-client\"\nconst client = new StatsigClient(\"client-key\", { userID: \"a-user\" })\nconst value = client.getDynamicConfig(\"my_gate\")",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst value = client.getDynamicConfig(\"my_gate\")",
    ],
  },
  {
    library: STATSIG,
    patternKey: "factory:StatsigClient:*>call:getExperiment:*",
    matches: [
      "import { StatsigClient } from \"@statsig/js-client\"\nconst client = new StatsigClient(\"client-key\", { userID: \"a-user\" })\nconst value = client.getExperiment(\"my_gate\")",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst value = client.getExperiment(\"my_gate\")",
    ],
  },
  {
    library: STATSIG,
    patternKey: "factory:StatsigClient:*>call:getLayer:*",
    matches: [
      "import { StatsigClient } from \"@statsig/js-client\"\nconst client = new StatsigClient(\"client-key\", { userID: \"a-user\" })\nconst value = client.getLayer(\"my_gate\")",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst value = client.getLayer(\"my_gate\")",
    ],
  },
  {
    library: STATSIG,
    patternKey: "factory:StatsigClient:*>call:logEvent:*",
    matches: [
      "import { StatsigClient } from \"@statsig/js-client\"\nconst client = new StatsigClient(\"client-key\", { userID: \"a-user\" })\nclient.logEvent(\"add_to_cart\", \"SKU_12345\")",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nclient.logEvent(\"add_to_cart\", \"SKU_12345\")",
    ],
  },
  {
    library: STATSIG,
    patternKey: "call:useGateValue:*",
    matches: [
      "import { useGateValue } from \"@statsig/react-bindings\"\nconst gate = useGateValue(\"my_gate\")",
    ],
    rejects: [
      "const useGateValue = (...parts) => parts\nconst gate = useGateValue(\"my_gate\")",
    ],
  },
  {
    library: STATSIG,
    patternKey: "call:useDynamicConfig:*",
    matches: [
      "import { useDynamicConfig } from \"@statsig/react-bindings\"\nconst config = useDynamicConfig(\"my_config\")",
    ],
    rejects: [
      "const useDynamicConfig = (...parts) => parts\nconst config = useDynamicConfig(\"my_config\")",
    ],
  },
]

const UNLEASH = "Unleash"

export const unleashFixtures: readonly PatternFixture[] = [
  {
    library: UNLEASH,
    patternKey: "factory:UnleashClient:*",
    matches: [
      "import { UnleashClient } from \"unleash-proxy-client\"\nconst unleash = new UnleashClient({ url, clientKey, appName: \"my-webapp\" })",
    ],
    rejects: [
      "const UnleashClient = (...parts) => parts\nconst unleash = new UnleashClient({ url, clientKey, appName: \"my-webapp\" })",
    ],
  },
  {
    library: UNLEASH,
    patternKey: "factory:UnleashClient:*>call:isEnabled:*",
    matches: [
      "import { UnleashClient } from \"unleash-proxy-client\"\nconst unleash = new UnleashClient({ url, clientKey, appName: \"my-webapp\" })\nconst enabled = unleash.isEnabled(\"proxy.demo\")",
    ],
    rejects: [
      "const unleash = makeLocalRegistry()\nconst enabled = unleash.isEnabled(\"proxy.demo\")",
    ],
  },
  {
    library: UNLEASH,
    patternKey: "factory:UnleashClient:*>call:getVariant:*",
    matches: [
      "import { UnleashClient } from \"unleash-proxy-client\"\nconst unleash = new UnleashClient({ url, clientKey, appName: \"my-webapp\" })\nconst variant = unleash.getVariant(\"proxy.demo\")",
    ],
    rejects: [
      "const unleash = makeLocalRegistry()\nconst variant = unleash.getVariant(\"proxy.demo\")",
    ],
  },
  {
    library: UNLEASH,
    patternKey: "factory:UnleashClient:*>call:on:*",
    matches: [
      "import { UnleashClient } from \"unleash-proxy-client\"\nconst unleash = new UnleashClient({ url, clientKey, appName: \"my-webapp\" })\nunleash.on(\"update\", () => { render() })",
    ],
    rejects: [
      "const unleash = makeLocalRegistry()\nunleash.on(\"update\", () => { render() })",
    ],
  },
]

const VERCEL_FLAGS = "Vercel Flags"

export const vercelFlagsFixtures: readonly PatternFixture[] = [
  {
    library: VERCEL_FLAGS,
    patternKey: "factory:flag:*",
    matches: [
      "import { flag } from \"flags/next\"\nexport const exampleFlag = flag({ key: \"example-flag\", decide() { return Math.random() > 0.5 } })",
    ],
    rejects: [
      "const flag = (...parts) => parts\nexport const exampleFlag = flag({ key: \"example-flag\", decide() { return Math.random() > 0.5 } })",
    ],
  },
  {
    library: VERCEL_FLAGS,
    patternKey: "factory:flag:*>called",
    matches: [
      "import { flag } from \"flags/next\"\nexport const exampleFlag = flag({ key: \"example-flag\", decide() { return Math.random() > 0.5 } })\nconst example = await exampleFlag()",
    ],
    rejects: [
      "const exampleFlag = makeLocalRegistry()\nconst example = await exampleFlag()",
    ],
  },
  {
    library: VERCEL_FLAGS,
    patternKey: "call:evaluate:*",
    matches: [
      "import { evaluate } from \"flags/next\"\nconst values = await evaluate(flags)",
    ],
    rejects: [
      "const evaluate = (...parts) => parts\nconst values = await evaluate(flags)",
    ],
  },
]
