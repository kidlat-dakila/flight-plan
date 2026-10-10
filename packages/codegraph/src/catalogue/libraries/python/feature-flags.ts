import type { CatalogueLibrary } from "@/catalogue/types"

export const configcatLibrary: CatalogueLibrary = {
  name: "ConfigCat",
  specifiers: ["configcatclient"],
  documentedVersion: "10.0",
  category: "feature-flags",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "get",
      methods: [
        { kind: "call", name: "get_value", slots: [], makes: "feature-flag" },
      ],
    },
  ],
}

export const djangoWaffleLibrary: CatalogueLibrary = {
  name: "django-waffle",
  specifiers: ["waffle", "waffle.decorators"],
  documentedVersion: "5.0",
  category: "feature-flags",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "flag_is_active", slots: [], makes: "feature-flag" },
    { kind: "call", name: "switch_is_active", slots: [], makes: "feature-flag" },
    { kind: "call", name: "sample_is_active", slots: [], makes: "feature-flag" },
    { kind: "decorator", name: "waffle_flag", makes: "feature-flag" },
    { kind: "decorator", name: "waffle_switch", makes: "feature-flag" },
  ],
}

export const flagsmithPythonLibrary: CatalogueLibrary = {
  name: "Flagsmith for Python",
  specifiers: ["flagsmith"],
  documentedVersion: "6.3",
  category: "feature-flags",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Flagsmith",
      methods: [
        { kind: "call", name: "get_environment_flags", slots: [], makes: "feature-flag" },
        { kind: "call", name: "get_identity_flags", slots: [], makes: "feature-flag" },
      ],
    },
  ],
}

export const growthbookPythonLibrary: CatalogueLibrary = {
  name: "GrowthBook for Python",
  specifiers: ["growthbook"],
  documentedVersion: "3.2",
  category: "feature-flags",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "GrowthBook",
      methods: [
        { kind: "call", name: "is_on", slots: [], makes: "feature-flag" },
        { kind: "call", name: "get_feature_value", slots: [], makes: "feature-flag" },
        { kind: "call", name: "run", slots: [], makes: "feature-flag" },
        { kind: "call", name: "load_features", slots: [], makes: "config" },
      ],
    },
  ],
}

export const launchdarklyPythonLibrary: CatalogueLibrary = {
  name: "LaunchDarkly for Python",
  specifiers: ["ldclient"],
  documentedVersion: "9.18",
  category: "feature-flags",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "get",
      methods: [
        { kind: "call", name: "variation", slots: [], makes: "feature-flag" },
      ],
    },
    { kind: "call", name: "set_config", slots: [], makes: "config" },
  ],
}

export const openfeaturePythonLibrary: CatalogueLibrary = {
  name: "OpenFeature for Python",
  specifiers: ["openfeature"],
  documentedVersion: "0.10",
  category: "feature-flags",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "api.get_client",
      methods: [
        { kind: "call", name: "get_boolean_value", slots: [], makes: "feature-flag" },
        { kind: "call", name: "get_string_value", slots: [], makes: "feature-flag" },
        { kind: "call", name: "get_integer_value", slots: [], makes: "feature-flag" },
        { kind: "call", name: "get_object_value", slots: [], makes: "feature-flag" },
      ],
    },
    { kind: "call", name: "api.set_provider", slots: [], makes: "config" },
  ],
}

export const optimizelyPythonLibrary: CatalogueLibrary = {
  name: "Optimizely for Python",
  specifiers: ["optimizely"],
  documentedVersion: "5.7",
  category: "feature-flags",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "optimizely.Optimizely",
      methods: [
        {
          kind: "factory",
          name: "create_user_context",
          methods: [
            { kind: "call", name: "decide", slots: [], makes: "feature-flag" },
            { kind: "call", name: "decide_all", slots: [], makes: "feature-flag" },
          ],
        },
      ],
    },
  ],
}

export const posthogPythonLibrary: CatalogueLibrary = {
  name: "PostHog for Python",
  specifiers: ["posthog"],
  documentedVersion: "7.67",
  category: "feature-flags",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Posthog",
      methods: [
        { kind: "call", name: "capture", slots: [], makes: "telemetry", eventAt: 0 },
        { kind: "call", name: "feature_enabled", slots: [], makes: "feature-flag" },
        { kind: "call", name: "get_feature_flag", slots: [], makes: "feature-flag" },
      ],
    },
  ],
}

export const statsigPythonLibrary: CatalogueLibrary = {
  name: "Statsig for Python",
  specifiers: ["statsig"],
  documentedVersion: "0.72",
  category: "feature-flags",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "statsig.check_gate", slots: [], makes: "feature-flag" },
    { kind: "call", name: "statsig.get_config", slots: [], makes: "feature-flag" },
    { kind: "call", name: "statsig.get_experiment", slots: [], makes: "feature-flag" },
    { kind: "call", name: "statsig.log_event", slots: [], makes: "telemetry" },
  ],
}

export const unleashPythonLibrary: CatalogueLibrary = {
  name: "Unleash for Python",
  specifiers: ["UnleashClient"],
  documentedVersion: "6.9",
  category: "feature-flags",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "UnleashClient",
      methods: [
        { kind: "call", name: "initialize_client", slots: [], makes: "config" },
        { kind: "call", name: "is_enabled", slots: [], makes: "feature-flag" },
        { kind: "call", name: "get_variant", slots: [], makes: "feature-flag" },
      ],
    },
  ],
}
