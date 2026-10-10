import type { CatalogueLibrary } from "@/catalogue/types"

export const flagsmithLibrary: CatalogueLibrary = {
  name: "Flagsmith",
  specifiers: ["flagsmith", "flagsmith/react", "@flagsmith/flagsmith", "flagsmith-nodejs", "@flagsmith/nodejs"],
  documentedVersion: "10.0",
  category: "feature-flags",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.init", slots: [], from: "flagsmith", makes: "config" },
    { kind: "call", name: "default.hasFeature", slots: [], from: "flagsmith", makes: "feature-flag" },
    { kind: "call", name: "default.getValue", slots: [], from: "flagsmith", makes: "feature-flag" },
    { kind: "call", name: "default.identify", slots: [], from: "flagsmith", makes: "feature-flag" },
    { kind: "call", name: "useFlags", slots: [], makes: "feature-flag" },
  ],
}

export const growthbookLibrary: CatalogueLibrary = {
  name: "GrowthBook",
  specifiers: ["@growthbook/growthbook", "@growthbook/growthbook-react"],
  documentedVersion: "1.8",
  category: "feature-flags",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "GrowthBook",
      methods: [
        { kind: "call", name: "isOn", slots: [], makes: "feature-flag" },
        { kind: "call", name: "getFeatureValue", slots: [], makes: "feature-flag" },
        { kind: "call", name: "run", slots: [], makes: "feature-flag" },
      ],
    },
    { kind: "call", name: "useFeatureIsOn", slots: [], makes: "feature-flag" },
    { kind: "call", name: "useFeatureValue", slots: [], makes: "feature-flag" },
  ],
}

export const launchdarklyLibrary: CatalogueLibrary = {
  name: "LaunchDarkly",
  specifiers: ["@launchdarkly/node-server-sdk", "launchdarkly-js-client-sdk", "launchdarkly-react-client-sdk"],
  documentedVersion: "9.14",
  category: "feature-flags",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "init",
      methods: [
        { kind: "call", name: "variation", slots: [], makes: "feature-flag" },
      ],
    },
    { kind: "call", name: "useFlags", slots: [], makes: "feature-flag" },
  ],
}

export const openfeatureLibrary: CatalogueLibrary = {
  name: "OpenFeature",
  specifiers: ["@openfeature/server-sdk", "@openfeature/web-sdk", "@openfeature/react-sdk"],
  documentedVersion: "1.23",
  category: "feature-flags",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "OpenFeature.getClient",
      methods: [
        { kind: "call", name: "getBooleanValue", slots: [], makes: "feature-flag" },
        { kind: "call", name: "getStringValue", slots: [], makes: "feature-flag" },
        { kind: "call", name: "getNumberValue", slots: [], makes: "feature-flag" },
        { kind: "call", name: "getObjectValue", slots: [], makes: "feature-flag" },
      ],
    },
    { kind: "call", name: "OpenFeature.setProvider", slots: [], makes: "config" },
    { kind: "call", name: "useFlag", slots: [], makes: "feature-flag" },
    { kind: "call", name: "useBooleanFlagValue", slots: [], makes: "feature-flag" },
  ],
}

export const optimizelyLibrary: CatalogueLibrary = {
  name: "Optimizely",
  specifiers: ["@optimizely/optimizely-sdk", "@optimizely/react-sdk"],
  documentedVersion: "6.6",
  category: "feature-flags",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createInstance",
      methods: [
        {
          kind: "factory",
          name: "createUserContext",
          methods: [
            { kind: "call", name: "decide", slots: [], makes: "feature-flag" },
            { kind: "call", name: "trackEvent", slots: [], makes: "telemetry", eventAt: 0 },
          ],
        },
      ],
    },
    { kind: "call", name: "useDecision", slots: [], makes: "feature-flag" },
  ],
}

export const posthogLibrary: CatalogueLibrary = {
  name: "PostHog",
  specifiers: ["posthog-js", "posthog-js/react", "posthog-node"],
  documentedVersion: "1.438",
  category: "feature-flags",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.capture", slots: [], from: "posthog-js", makes: "telemetry", eventAt: 0 },
    { kind: "call", name: "default.identify", slots: [], from: "posthog-js", makes: "telemetry" },
    { kind: "call", name: "default.isFeatureEnabled", slots: [], from: "posthog-js", makes: "feature-flag" },
    { kind: "call", name: "default.getFeatureFlag", slots: [], from: "posthog-js", makes: "feature-flag" },
    { kind: "call", name: "default.onFeatureFlags", slots: [{ at: 0, runs: "event" }], from: "posthog-js" },
    { kind: "call", name: "useFeatureFlagEnabled", slots: [], makes: "feature-flag" },
    {
      kind: "factory",
      name: "PostHog",
      methods: [
        { kind: "call", name: "capture", slots: [], makes: "telemetry", eventAt: "event" },
        { kind: "call", name: "isFeatureEnabled", slots: [], makes: "feature-flag" },
        { kind: "call", name: "getFeatureFlag", slots: [], makes: "feature-flag" },
      ],
    },
  ],
}

export const splitLibrary: CatalogueLibrary = {
  name: "Split",
  specifiers: ["@splitsoftware/splitio", "@splitsoftware/splitio-react"],
  documentedVersion: "11.12",
  category: "feature-flags",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "SplitFactory",
      methods: [
        {
          kind: "factory",
          name: "client",
          methods: [
            { kind: "call", name: "getTreatment", slots: [], makes: "feature-flag" },
            { kind: "call", name: "track", slots: [], makes: "telemetry" },
            { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
          ],
        },
      ],
    },
  ],
}

export const statsigLibrary: CatalogueLibrary = {
  name: "Statsig",
  specifiers: ["@statsig/js-client", "@statsig/react-bindings", "statsig-node"],
  documentedVersion: "3.33",
  category: "feature-flags",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "StatsigClient",
      methods: [
        { kind: "call", name: "checkGate", slots: [], makes: "feature-flag" },
        { kind: "call", name: "getDynamicConfig", slots: [], makes: "feature-flag" },
        { kind: "call", name: "getExperiment", slots: [], makes: "feature-flag" },
        { kind: "call", name: "getLayer", slots: [], makes: "feature-flag" },
        { kind: "call", name: "logEvent", slots: [], makes: "telemetry", eventAt: 0 },
      ],
    },
    { kind: "call", name: "useGateValue", slots: [], makes: "feature-flag" },
    { kind: "call", name: "useDynamicConfig", slots: [], makes: "feature-flag" },
  ],
}

export const unleashLibrary: CatalogueLibrary = {
  name: "Unleash",
  specifiers: ["unleash-proxy-client", "unleash-client", "@unleash/proxy-client-react"],
  documentedVersion: "6.12",
  category: "feature-flags",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "UnleashClient",
      methods: [
        { kind: "call", name: "isEnabled", slots: [], makes: "feature-flag" },
        { kind: "call", name: "getVariant", slots: [], makes: "feature-flag" },
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
    },
  ],
}

export const vercelFlagsLibrary: CatalogueLibrary = {
  name: "Vercel Flags",
  specifiers: ["flags", "flags/next", "@vercel/flags"],
  documentedVersion: "4.3",
  category: "feature-flags",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "flag",
      slots: [{ at: "decide", runs: "kept" }],
      makes: "feature-flag",
      methods: [],
      called: {
        slots: [],
        makes: "feature-flag",
      },
    },
    { kind: "call", name: "evaluate", slots: [], makes: "feature-flag" },
  ],
}
