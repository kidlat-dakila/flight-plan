import { z } from "zod"
import type { LatestVersionReader } from "@/procedures/get-update-notice/utils/update-checker"

const REGISTRY_URL = "https://registry.npmjs.org"
const DEFAULT_TIMEOUT_MS = 2000

const latestManifestSchema = z.object({ version: z.string() })

export interface RegistryRequest {
  readonly manifestUrl: string
  readonly timeoutMs?: number
}

export const latestManifestUrlOf = (packageName: string): string => `${REGISTRY_URL}/${packageName}/latest`

const fetchLatestVersion = async ({ manifestUrl, timeoutMs = DEFAULT_TIMEOUT_MS }: RegistryRequest): Promise<string | null> => {
  try {
    const response = await fetch(manifestUrl, { signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) return null
    const parsed = latestManifestSchema.safeParse(await response.json())
    return parsed.success ? parsed.data.version : null
  } catch {
    return null
  }
}

class RegistryReader {
  private pending: Promise<string | null> | null = null
  private readonly request: RegistryRequest

  public constructor(request: RegistryRequest) {
    this.request = request
  }

  public readonly read = async (): Promise<string | null> => {
    if (this.pending !== null) return await this.pending
    const pending = fetchLatestVersion(this.request)
    this.pending = pending
    const latestVersion = await pending
    this.pending = null
    return latestVersion
  }
}

export const createLatestVersionReader = (request: RegistryRequest): LatestVersionReader => new RegistryReader(request).read
