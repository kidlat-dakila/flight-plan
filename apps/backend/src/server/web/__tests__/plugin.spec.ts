import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { createMockProcedureContext } from "@/procedures/context"
import { buildServer } from "@/server"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const INDEX_PAGE = "<!doctype html><title>Flight Plan</title>"
const SCRIPT = "console.log('flight plan')"

const writeWebApp = async (webPath: string): Promise<void> => {
  await mkdir(join(webPath, "assets"))
  await writeFile(join(webPath, "index.html"), INDEX_PAGE)
  await writeFile(join(webPath, "assets", "app.js"), SCRIPT)
}

const withWebServer = async (use: (server: Awaited<ReturnType<typeof buildServer>>) => Promise<void>): Promise<void> => {
  await withTemporaryFolder(async (webPath) => {
    await writeWebApp(webPath)
    const server = await buildServer({}, createMockProcedureContext(new Date()), webPath)
    try {
      await use(server)
    } finally {
      await server.close()
    }
  })
}

describe("registerWeb", () => {
  it("serves the web app at the root", async () => {
    await withWebServer(async (server) => {
      const response = await server.inject({ method: "GET", url: "/" })

      expect(response.statusCode).toBe(200)
      expect(response.body).toBe(INDEX_PAGE)
    })
  })

  it("serves a built file of the web app", async () => {
    await withWebServer(async (server) => {
      const response = await server.inject({ method: "GET", url: "/assets/app.js" })

      expect(response.statusCode).toBe(200)
      expect(response.body).toBe(SCRIPT)
    })
  })

  it("serves the web app for a page address, so the app's own router can open it", async () => {
    await withWebServer(async (server) => {
      const response = await server.inject({ method: "GET", url: "/pr-reviews/storefront/branch-release-1.2" })

      expect(response.statusCode).toBe(200)
      expect(response.body).toBe(INDEX_PAGE)
    })
  })

  it("answers 404 for a built file that does not exist", async () => {
    await withWebServer(async (server) => {
      const response = await server.inject({ method: "GET", url: "/assets/missing.js" })

      expect(response.statusCode).toBe(404)
    })
  })

  it("keeps answering the API beside the web app", async () => {
    await withWebServer(async (server) => {
      const response = await server.inject({ method: "GET", url: "/api/trpc/health" })

      expect(response.json()).toStrictEqual({ result: { data: { status: "ok" } } })
    })
  })

  it("serves no web app when no folder is given", async () => {
    const server = await buildServer()
    const response = await server.inject({ method: "GET", url: "/" })

    expect(response.statusCode).toBe(404)
    await server.close()
  })
})
