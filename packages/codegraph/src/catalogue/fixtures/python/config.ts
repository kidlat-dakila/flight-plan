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

const PROFIG = "profig"

export const profigFixtures: readonly PatternFixture[] = [
  {
    library: PROFIG,
    patternKey: "factory:Config:*",
    matches: [
      "from profig import Config\n\ncfg = Config(\"server.cfg\")",
    ],
    rejects: [
      "def Config(*parts, **options):\n    return parts\n\ncfg = Config(\"server.cfg\")",
    ],
  },
  {
    library: PROFIG,
    patternKey: "factory:Config:*>call:init:*",
    matches: [
      "from profig import Config\n\ncfg = Config(\"server.cfg\")\n\ncfg.init(\"server.host\", \"localhost\")",
    ],
    rejects: [
      "cfg = LocalRegistry()\n\ncfg.init(\"server.host\", \"localhost\")",
    ],
  },
  {
    library: PROFIG,
    patternKey: "factory:Config:*>call:sync:*",
    matches: [
      "from profig import Config\n\ncfg = Config(\"server.cfg\")\n\ncfg.sync()",
    ],
    rejects: [
      "cfg = LocalRegistry()\n\ncfg.sync()",
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
