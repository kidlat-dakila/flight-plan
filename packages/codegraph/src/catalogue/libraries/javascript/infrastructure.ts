import type { CatalogueLibrary } from "@/catalogue/types"

export const dockerComposeLibrary: CatalogueLibrary = {
  name: "Docker Compose",
  specifiers: [],
  category: "infrastructure",
  type: "backend",
  language: "javascript",
  patterns: [],
  locations: [
    {
      classification: "build-and-infrastructure",
      files: [{ glob: "**/docker-compose.{yml,yaml}" }, { glob: "**/docker-compose.*.{yml,yaml}" }, { glob: "**/compose.{yml,yaml}" }],
      keys: [{ key: "services.*.build.dockerfile", holds: "names" }],
    },
  ],
}

export const devContainerLibrary: CatalogueLibrary = {
  name: "Dev Containers",
  specifiers: [],
  category: "infrastructure",
  type: "backend",
  language: "javascript",
  patterns: [],
  locations: [
    {
      classification: "build-and-infrastructure",
      files: [{ glob: "**/.devcontainer/devcontainer.json" }, { glob: "**/.devcontainer.json" }],
      keys: [
        { key: "build.dockerfile", holds: "files" },
        { key: "dockerFile", holds: "files" },
      ],
    },
    { classification: "build-and-infrastructure", files: [{ glob: "**/.devcontainer/devcontainer.json" }], keys: [], marks: "folder" },
  ],
}

export const helmLibrary: CatalogueLibrary = {
  name: "Helm",
  specifiers: [],
  category: "infrastructure",
  type: "backend",
  language: "javascript",
  patterns: [],
  locations: [{ classification: "build-and-infrastructure", files: [{ glob: "**/Chart.yaml" }], keys: [], marks: "folder" }],
}

export const kustomizeLibrary: CatalogueLibrary = {
  name: "Kustomize",
  specifiers: [],
  category: "infrastructure",
  type: "backend",
  language: "javascript",
  patterns: [],
  locations: [{ classification: "build-and-infrastructure", files: [{ glob: "**/kustomization.{yaml,yml}" }, { glob: "**/Kustomization" }], keys: [], marks: "folder" }],
}
