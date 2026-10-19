import type { PatternFixture } from "@/catalogue/types"

const CONFIGOBJ = "ConfigObj"

export const configobjFixtures: readonly PatternFixture[] = [
  {
    library: CONFIGOBJ,
    patternKey: "factory:ConfigObj:*",
    matches: [
      "from configobj import ConfigObj\n\nconfig = ConfigObj(\"settings.ini\")",
    ],
    rejects: [
      "def ConfigObj(*parts, **options):\n    return parts\n\nconfig = ConfigObj(\"settings.ini\")",
    ],
  },
  {
    library: CONFIGOBJ,
    patternKey: "factory:ConfigObj:*>call:validate:*",
    matches: [
      "from configobj import ConfigObj\n\nconfig = ConfigObj(\"settings.ini\")\n\nconfig.validate()",
    ],
    rejects: [
      "config = LocalRegistry()\n\nconfig.validate()",
    ],
  },
  {
    library: CONFIGOBJ,
    patternKey: "factory:ConfigObj:*>call:write:*",
    matches: [
      "from configobj import ConfigObj\n\nconfig = ConfigObj(\"settings.ini\")\n\nconfig.write()",
    ],
    rejects: [
      "config = LocalRegistry()\n\nconfig.write()",
    ],
  },
]

const HYDRA = "Hydra"

export const hydraFixtures: readonly PatternFixture[] = [
  {
    library: HYDRA,
    patternKey: "decorator:main:*",
    matches: [
      "from hydra import main\n\n@main(version_base=None, config_path=\"conf\", config_name=\"config\")\ndef my_app(cfg):\n    print(OmegaConf.to_yaml(cfg))",
    ],
    rejects: [
      "def main(*parts, **options):\n    return parts\n\n@main(version_base=None, config_path=\"conf\", config_name=\"config\")\ndef my_app(cfg):\n    print(OmegaConf.to_yaml(cfg))",
    ],
  },
  {
    library: HYDRA,
    patternKey: "call:compose:*",
    matches: [
      "from hydra import compose\n\ncfg = compose(config_name=\"config\", overrides=[\"db=mysql\"])",
    ],
    rejects: [
      "def compose(*parts, **options):\n    return parts\n\ncfg = compose(config_name=\"config\", overrides=[\"db=mysql\"])",
    ],
  },
  {
    library: HYDRA,
    patternKey: "call:initialize:*",
    matches: [
      "from hydra import initialize\n\nwith initialize(version_base=None, config_path=\"conf\"):\n    cfg = compose(config_name=\"config\")",
    ],
    rejects: [
      "def initialize(*parts, **options):\n    return parts\n\nwith initialize(version_base=None, config_path=\"conf\"):\n    cfg = compose(config_name=\"config\")",
    ],
  },
]

const PYTHON_DECOUPLE = "python-decouple"

export const pythonDecoupleFixtures: readonly PatternFixture[] = [
  {
    library: PYTHON_DECOUPLE,
    patternKey: "call:config:*",
    matches: [
      "from decouple import config\n\nSECRET_KEY = config(\"SECRET_KEY\")",
    ],
    rejects: [
      "def config(*parts, **options):\n    return parts\n\nSECRET_KEY = config(\"SECRET_KEY\")",
    ],
  },
  {
    library: PYTHON_DECOUPLE,
    patternKey: "factory:Config:*",
    matches: [
      "from decouple import Config\n\nenv_config = Config(RepositoryEnv(\".env.production\"))",
    ],
    rejects: [
      "def Config(*parts, **options):\n    return parts\n\nenv_config = Config(RepositoryEnv(\".env.production\"))",
    ],
  },
  {
    library: PYTHON_DECOUPLE,
    patternKey: "factory:Config:*>called",
    matches: [
      "from decouple import Config\n\nenv_config = Config(RepositoryEnv(\".env.production\"))\n\nDEBUG = env_config(\"DEBUG\", default=False, cast=bool)",
    ],
    rejects: [
      "env_config = LocalRegistry()\n\nDEBUG = env_config(\"DEBUG\", default=False, cast=bool)",
    ],
  },
]

const PYTHON_DOTENV = "python-dotenv"

export const pythonDotenvFixtures: readonly PatternFixture[] = [
  {
    library: PYTHON_DOTENV,
    patternKey: "call:load_dotenv:*",
    matches: [
      "from dotenv import load_dotenv\n\nload_dotenv()",
    ],
    rejects: [
      "def load_dotenv(*parts, **options):\n    return parts\n\nload_dotenv()",
    ],
  },
  {
    library: PYTHON_DOTENV,
    patternKey: "call:dotenv_values:*",
    matches: [
      "from dotenv import dotenv_values\n\nconfig = dotenv_values(\".env\")",
    ],
    rejects: [
      "def dotenv_values(*parts, **options):\n    return parts\n\nconfig = dotenv_values(\".env\")",
    ],
  },
]

const DYNACONF = "Dynaconf"

export const dynaconfFixtures: readonly PatternFixture[] = [
  {
    library: DYNACONF,
    patternKey: "factory:Dynaconf:*",
    matches: [
      "from dynaconf import Dynaconf\n\nsettings = Dynaconf(settings_files=[\"settings.toml\", \".secrets.toml\"])",
    ],
    rejects: [
      "def Dynaconf(*parts, **options):\n    return parts\n\nsettings = Dynaconf(settings_files=[\"settings.toml\", \".secrets.toml\"])",
    ],
  },
  {
    library: DYNACONF,
    patternKey: "factory:Dynaconf:*>call:get:*",
    matches: [
      "from dynaconf import Dynaconf\n\nsettings = Dynaconf(settings_files=[\"settings.toml\"])\n\nport = settings.get(\"port\", 8000)",
    ],
    rejects: [
      "settings = LocalRegistry()\n\nport = settings.get(\"port\", 8000)",
    ],
  },
  {
    library: DYNACONF,
    patternKey: "call:FlaskDynaconf:*",
    matches: [
      "from dynaconf import FlaskDynaconf\n\nFlaskDynaconf(app, settings_files=[\"settings.toml\"])",
    ],
    rejects: [
      "def FlaskDynaconf(*parts, **options):\n    return parts\n\nFlaskDynaconf(app, settings_files=[\"settings.toml\"])",
    ],
  },
  {
    library: DYNACONF,
    patternKey: "call:Validator:*",
    matches: [
      "from dynaconf import Validator\n\nport_rule = Validator(\"port\", gte=5000, lte=8000)",
    ],
    rejects: [
      "def Validator(*parts, **options):\n    return parts\n\nport_rule = Validator(\"port\", gte=5000, lte=8000)",
    ],
  },
]
