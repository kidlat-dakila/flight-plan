import type { PatternFixture } from "@/catalogue/types"

const CONFIGCAT = "ConfigCat"

export const configcatFixtures: readonly PatternFixture[] = [
  {
    library: CONFIGCAT,
    patternKey: "factory:get:*",
    matches: [
      "from configcatclient import get\n\nclient = get(\"#YOUR-SDK-KEY#\")",
    ],
    rejects: [
      "def get(*parts, **options):\n    return parts\n\nclient = get(\"#YOUR-SDK-KEY#\")",
    ],
  },
  {
    library: CONFIGCAT,
    patternKey: "factory:get:*>call:get_value:*",
    matches: [
      "from configcatclient import get\n\nclient = get(\"#YOUR-SDK-KEY#\")\n\nis_my_feature_enabled = client.get_value(\"isMyFeatureEnabled\", False)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nis_my_feature_enabled = client.get_value(\"isMyFeatureEnabled\", False)",
    ],
  },
]

const DJANGO_WAFFLE = "django-waffle"

export const djangoWaffleFixtures: readonly PatternFixture[] = [
  {
    library: DJANGO_WAFFLE,
    patternKey: "call:flag_is_active:*",
    matches: [
      "from waffle import flag_is_active\n\nif flag_is_active(request, \"flag_name\"):\n    pass",
    ],
    rejects: [
      "def flag_is_active(*parts, **options):\n    return parts\n\nif flag_is_active(request, \"flag_name\"):\n    pass",
    ],
  },
  {
    library: DJANGO_WAFFLE,
    patternKey: "call:switch_is_active:*",
    matches: [
      "from waffle import switch_is_active\n\nif switch_is_active(\"switch_name\"):\n    pass",
    ],
    rejects: [
      "def switch_is_active(*parts, **options):\n    return parts\n\nif switch_is_active(\"switch_name\"):\n    pass",
    ],
  },
  {
    library: DJANGO_WAFFLE,
    patternKey: "call:sample_is_active:*",
    matches: [
      "from waffle import sample_is_active\n\nif sample_is_active(\"sample_name\"):\n    pass",
    ],
    rejects: [
      "def sample_is_active(*parts, **options):\n    return parts\n\nif sample_is_active(\"sample_name\"):\n    pass",
    ],
  },
  {
    library: DJANGO_WAFFLE,
    patternKey: "decorator:waffle_flag:*",
    matches: [
      "from waffle.decorators import waffle_flag\n\n@waffle_flag(\"flag_name\")\ndef my_view(request):\n    return HttpResponse(\"ok\")",
    ],
    rejects: [
      "def waffle_flag(*parts, **options):\n    return parts\n\n@waffle_flag(\"flag_name\")\ndef my_view(request):\n    return HttpResponse(\"ok\")",
    ],
  },
  {
    library: DJANGO_WAFFLE,
    patternKey: "decorator:waffle_switch:*",
    matches: [
      "from waffle.decorators import waffle_switch\n\n@waffle_switch(\"switch_name\")\ndef my_view(request):\n    return HttpResponse(\"ok\")",
    ],
    rejects: [
      "def waffle_switch(*parts, **options):\n    return parts\n\n@waffle_switch(\"switch_name\")\ndef my_view(request):\n    return HttpResponse(\"ok\")",
    ],
  },
]

const FLAGSMITH_PYTHON = "Flagsmith for Python"

export const flagsmithPythonFixtures: readonly PatternFixture[] = [
  {
    library: FLAGSMITH_PYTHON,
    patternKey: "factory:Flagsmith:*",
    matches: [
      "from flagsmith import Flagsmith\n\nflagsmith = Flagsmith(environment_key=\"<YOUR_ENVIRONMENT_KEY>\")",
    ],
    rejects: [
      "def Flagsmith(*parts, **options):\n    return parts\n\nflagsmith = Flagsmith(environment_key=\"<YOUR_ENVIRONMENT_KEY>\")",
    ],
  },
  {
    library: FLAGSMITH_PYTHON,
    patternKey: "factory:Flagsmith:*>call:get_environment_flags:*",
    matches: [
      "from flagsmith import Flagsmith\n\nflagsmith = Flagsmith(environment_key=\"<YOUR_ENVIRONMENT_KEY>\")\n\nflags = flagsmith.get_environment_flags()",
    ],
    rejects: [
      "flagsmith = LocalRegistry()\n\nflags = flagsmith.get_environment_flags()",
    ],
  },
  {
    library: FLAGSMITH_PYTHON,
    patternKey: "factory:Flagsmith:*>call:get_identity_flags:*",
    matches: [
      "from flagsmith import Flagsmith\n\nflagsmith = Flagsmith(environment_key=\"<YOUR_ENVIRONMENT_KEY>\")\n\nflags = flagsmith.get_identity_flags(identifier=\"user-1\")",
    ],
    rejects: [
      "flagsmith = LocalRegistry()\n\nflags = flagsmith.get_identity_flags(identifier=\"user-1\")",
    ],
  },
]

const GROWTHBOOK_PYTHON = "GrowthBook for Python"

export const growthbookPythonFixtures: readonly PatternFixture[] = [
  {
    library: GROWTHBOOK_PYTHON,
    patternKey: "factory:GrowthBook:*",
    matches: [
      "from growthbook import GrowthBook\n\ngb = GrowthBook(attributes={\"id\": \"123\"}, features=features)",
    ],
    rejects: [
      "def GrowthBook(*parts, **options):\n    return parts\n\ngb = GrowthBook(attributes={\"id\": \"123\"}, features=features)",
    ],
  },
  {
    library: GROWTHBOOK_PYTHON,
    patternKey: "factory:GrowthBook:*>call:is_on:*",
    matches: [
      "from growthbook import GrowthBook\n\ngb = GrowthBook(attributes={\"id\": \"123\"}, features=features)\n\nenabled = gb.is_on(\"my-feature\")",
    ],
    rejects: [
      "gb = LocalRegistry()\n\nenabled = gb.is_on(\"my-feature\")",
    ],
  },
  {
    library: GROWTHBOOK_PYTHON,
    patternKey: "factory:GrowthBook:*>call:get_feature_value:*",
    matches: [
      "from growthbook import GrowthBook\n\ngb = GrowthBook(attributes={\"id\": \"123\"}, features=features)\n\ncolor = gb.get_feature_value(\"signup-button-color\", \"blue\")",
    ],
    rejects: [
      "gb = LocalRegistry()\n\ncolor = gb.get_feature_value(\"signup-button-color\", \"blue\")",
    ],
  },
  {
    library: GROWTHBOOK_PYTHON,
    patternKey: "factory:GrowthBook:*>call:run:*",
    matches: [
      "from growthbook import GrowthBook\n\ngb = GrowthBook(attributes={\"id\": \"123\"}, features=features)\n\nresult = gb.run(Experiment(key=\"my-experiment\", variations=[\"red\", \"blue\"]))",
    ],
    rejects: [
      "gb = LocalRegistry()\n\nresult = gb.run(Experiment(key=\"my-experiment\", variations=[\"red\", \"blue\"]))",
    ],
  },
  {
    library: GROWTHBOOK_PYTHON,
    patternKey: "factory:GrowthBook:*>call:load_features:*",
    matches: [
      "from growthbook import GrowthBook\n\ngb = GrowthBook(attributes={\"id\": \"123\"}, features=features)\n\ngb.load_features()",
    ],
    rejects: [
      "gb = LocalRegistry()\n\ngb.load_features()",
    ],
  },
]

const LAUNCHDARKLY_PYTHON = "LaunchDarkly for Python"

export const launchdarklyPythonFixtures: readonly PatternFixture[] = [
  {
    library: LAUNCHDARKLY_PYTHON,
    patternKey: "factory:get:*",
    matches: [
      "from ldclient import get\n\nclient = get()",
    ],
    rejects: [
      "def get(*parts, **options):\n    return parts\n\nclient = get()",
    ],
  },
  {
    library: LAUNCHDARKLY_PYTHON,
    patternKey: "factory:get:*>call:variation:*",
    matches: [
      "from ldclient import get\n\nclient = get()\n\nshow_feature = client.variation(\"flag-key\", context, False)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nshow_feature = client.variation(\"flag-key\", context, False)",
    ],
  },
  {
    library: LAUNCHDARKLY_PYTHON,
    patternKey: "call:set_config:*",
    matches: [
      "from ldclient import set_config\n\nset_config(Config(\"sdk-key\"))",
    ],
    rejects: [
      "def set_config(*parts, **options):\n    return parts\n\nset_config(Config(\"sdk-key\"))",
    ],
  },
]

const OPENFEATURE_PYTHON = "OpenFeature for Python"

export const openfeaturePythonFixtures: readonly PatternFixture[] = [
  {
    library: OPENFEATURE_PYTHON,
    patternKey: "factory:api.get_client:*",
    matches: [
      "from openfeature import api\n\nclient = api.get_client()",
    ],
    rejects: [
      "api = LocalRegistry()\n\nclient = api.get_client()",
    ],
  },
  {
    library: OPENFEATURE_PYTHON,
    patternKey: "factory:api.get_client:*>call:get_boolean_value:*",
    matches: [
      "from openfeature import api\n\nclient = api.get_client()\n\nvalue = client.get_boolean_value(\"v2_enabled\", False)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nvalue = client.get_boolean_value(\"v2_enabled\", False)",
    ],
  },
  {
    library: OPENFEATURE_PYTHON,
    patternKey: "factory:api.get_client:*>call:get_string_value:*",
    matches: [
      "from openfeature import api\n\nclient = api.get_client()\n\nvalue = client.get_string_value(\"v2_enabled\", False)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nvalue = client.get_string_value(\"v2_enabled\", False)",
    ],
  },
  {
    library: OPENFEATURE_PYTHON,
    patternKey: "factory:api.get_client:*>call:get_integer_value:*",
    matches: [
      "from openfeature import api\n\nclient = api.get_client()\n\nvalue = client.get_integer_value(\"v2_enabled\", False)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nvalue = client.get_integer_value(\"v2_enabled\", False)",
    ],
  },
  {
    library: OPENFEATURE_PYTHON,
    patternKey: "factory:api.get_client:*>call:get_object_value:*",
    matches: [
      "from openfeature import api\n\nclient = api.get_client()\n\nvalue = client.get_object_value(\"v2_enabled\", False)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nvalue = client.get_object_value(\"v2_enabled\", False)",
    ],
  },
  {
    library: OPENFEATURE_PYTHON,
    patternKey: "call:api.set_provider:*",
    matches: [
      "from openfeature import api\n\napi.set_provider(MyProvider())",
    ],
    rejects: [
      "api = LocalRegistry()\n\napi.set_provider(MyProvider())",
    ],
  },
]

const OPTIMIZELY_PYTHON = "Optimizely for Python"

export const optimizelyPythonFixtures: readonly PatternFixture[] = [
  {
    library: OPTIMIZELY_PYTHON,
    patternKey: "factory:optimizely.Optimizely:*",
    matches: [
      "from optimizely import optimizely\n\noptimizely_client = optimizely.Optimizely(sdk_key=\"<YOUR_SDK_KEY>\")",
    ],
    rejects: [
      "optimizely = LocalRegistry()\n\noptimizely_client = optimizely.Optimizely(sdk_key=\"<YOUR_SDK_KEY>\")",
    ],
  },
  {
    library: OPTIMIZELY_PYTHON,
    patternKey: "factory:optimizely.Optimizely:*>factory:create_user_context:*",
    matches: [
      "from optimizely import optimizely\n\noptimizely_client = optimizely.Optimizely(sdk_key=\"<YOUR_SDK_KEY>\")\n\nuser = optimizely_client.create_user_context(\"user123\", {\"logged_in\": True})",
    ],
    rejects: [
      "optimizely_client = LocalRegistry()\n\nuser = optimizely_client.create_user_context(\"user123\", {\"logged_in\": True})",
    ],
  },
  {
    library: OPTIMIZELY_PYTHON,
    patternKey: "factory:optimizely.Optimizely:*>factory:create_user_context:*>call:decide:*",
    matches: [
      "from optimizely import optimizely\n\noptimizely_client = optimizely.Optimizely(sdk_key=\"<YOUR_SDK_KEY>\")\n\nuser = optimizely_client.create_user_context(\"user123\", {\"logged_in\": True})\n\ndecision = user.decide(\"product_sort\")",
    ],
    rejects: [
      "user = LocalRegistry()\n\ndecision = user.decide(\"product_sort\")",
    ],
  },
  {
    library: OPTIMIZELY_PYTHON,
    patternKey: "factory:optimizely.Optimizely:*>factory:create_user_context:*>call:decide_all:*",
    matches: [
      "from optimizely import optimizely\n\noptimizely_client = optimizely.Optimizely(sdk_key=\"<YOUR_SDK_KEY>\")\n\nuser = optimizely_client.create_user_context(\"user123\", {\"logged_in\": True})\n\ndecisions = user.decide_all()",
    ],
    rejects: [
      "user = LocalRegistry()\n\ndecisions = user.decide_all()",
    ],
  },
]

const POSTHOG_PYTHON = "PostHog for Python"

export const posthogPythonFixtures: readonly PatternFixture[] = [
  {
    library: POSTHOG_PYTHON,
    patternKey: "factory:Posthog:*",
    matches: [
      "from posthog import Posthog\n\nposthog = Posthog(\"<ph_project_api_key>\", host=\"https://us.i.posthog.com\")",
    ],
    rejects: [
      "def Posthog(*parts, **options):\n    return parts\n\nposthog = Posthog(\"<ph_project_api_key>\", host=\"https://us.i.posthog.com\")",
    ],
  },
  {
    library: POSTHOG_PYTHON,
    patternKey: "factory:Posthog:*>call:capture:*",
    matches: [
      "from posthog import Posthog\n\nposthog = Posthog(\"<ph_project_api_key>\", host=\"https://us.i.posthog.com\")\n\nposthog.capture(\"user_signed_up\", distinct_id=\"distinct_id_of_the_user\")",
    ],
    rejects: [
      "posthog = LocalRegistry()\n\nposthog.capture(\"user_signed_up\", distinct_id=\"distinct_id_of_the_user\")",
    ],
  },
  {
    library: POSTHOG_PYTHON,
    patternKey: "factory:Posthog:*>call:feature_enabled:*",
    matches: [
      "from posthog import Posthog\n\nposthog = Posthog(\"<ph_project_api_key>\", host=\"https://us.i.posthog.com\")\n\nis_enabled = posthog.feature_enabled(\"flag-key\", \"distinct_id_of_your_user\")",
    ],
    rejects: [
      "posthog = LocalRegistry()\n\nis_enabled = posthog.feature_enabled(\"flag-key\", \"distinct_id_of_your_user\")",
    ],
  },
  {
    library: POSTHOG_PYTHON,
    patternKey: "factory:Posthog:*>call:get_feature_flag:*",
    matches: [
      "from posthog import Posthog\n\nposthog = Posthog(\"<ph_project_api_key>\", host=\"https://us.i.posthog.com\")\n\nvariant = posthog.get_feature_flag(\"flag-key\", \"distinct_id_of_your_user\")",
    ],
    rejects: [
      "posthog = LocalRegistry()\n\nvariant = posthog.get_feature_flag(\"flag-key\", \"distinct_id_of_your_user\")",
    ],
  },
]

const STATSIG_PYTHON = "Statsig for Python"

export const statsigPythonFixtures: readonly PatternFixture[] = [
  {
    library: STATSIG_PYTHON,
    patternKey: "call:statsig.check_gate:*",
    matches: [
      "from statsig import statsig\n\npasses = statsig.check_gate(user, \"my_gate\")",
    ],
    rejects: [
      "statsig = LocalRegistry()\n\npasses = statsig.check_gate(user, \"my_gate\")",
    ],
  },
  {
    library: STATSIG_PYTHON,
    patternKey: "call:statsig.get_config:*",
    matches: [
      "from statsig import statsig\n\nconfig = statsig.get_config(user, \"my_config\")",
    ],
    rejects: [
      "statsig = LocalRegistry()\n\nconfig = statsig.get_config(user, \"my_config\")",
    ],
  },
  {
    library: STATSIG_PYTHON,
    patternKey: "call:statsig.get_experiment:*",
    matches: [
      "from statsig import statsig\n\nexperiment = statsig.get_experiment(user, \"my_experiment\")",
    ],
    rejects: [
      "statsig = LocalRegistry()\n\nexperiment = statsig.get_experiment(user, \"my_experiment\")",
    ],
  },
  {
    library: STATSIG_PYTHON,
    patternKey: "call:statsig.log_event:*",
    matches: [
      "from statsig import statsig\n\nstatsig.log_event(StatsigEvent(user, \"add_to_cart\"))",
    ],
    rejects: [
      "statsig = LocalRegistry()\n\nstatsig.log_event(StatsigEvent(user, \"add_to_cart\"))",
    ],
  },
]

const UNLEASH_PYTHON = "Unleash for Python"

export const unleashPythonFixtures: readonly PatternFixture[] = [
  {
    library: UNLEASH_PYTHON,
    patternKey: "factory:UnleashClient:*",
    matches: [
      "from UnleashClient import UnleashClient\n\nclient = UnleashClient(url=\"https://unleash.herokuapp.com\", app_name=\"my-python-app\")",
    ],
    rejects: [
      "def UnleashClient(*parts, **options):\n    return parts\n\nclient = UnleashClient(url=\"https://unleash.herokuapp.com\", app_name=\"my-python-app\")",
    ],
  },
  {
    library: UNLEASH_PYTHON,
    patternKey: "factory:UnleashClient:*>call:initialize_client:*",
    matches: [
      "from UnleashClient import UnleashClient\n\nclient = UnleashClient(url=\"https://unleash.herokuapp.com\", app_name=\"my-python-app\")\n\nclient.initialize_client()",
    ],
    rejects: [
      "client = LocalRegistry()\n\nclient.initialize_client()",
    ],
  },
  {
    library: UNLEASH_PYTHON,
    patternKey: "factory:UnleashClient:*>call:is_enabled:*",
    matches: [
      "from UnleashClient import UnleashClient\n\nclient = UnleashClient(url=\"https://unleash.herokuapp.com\", app_name=\"my-python-app\")\n\nenabled = client.is_enabled(\"my_toggle\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nenabled = client.is_enabled(\"my_toggle\")",
    ],
  },
  {
    library: UNLEASH_PYTHON,
    patternKey: "factory:UnleashClient:*>call:get_variant:*",
    matches: [
      "from UnleashClient import UnleashClient\n\nclient = UnleashClient(url=\"https://unleash.herokuapp.com\", app_name=\"my-python-app\")\n\nvariant = client.get_variant(\"variant_toggle\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nvariant = client.get_variant(\"variant_toggle\")",
    ],
  },
]
