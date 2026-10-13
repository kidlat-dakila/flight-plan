import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { createPublishedPageWriter } from "@/utils/published-page-writer"
import { writeText } from "@/utils/text-file"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const KEY = { repositoryName: "storefront", targetId: "branch-feature/web" }
const TEXTS = { html: "<!doctype html>", reviewScript: "globalThis.flightPlanReview = {}" }

describe("createPublishedPageWriter", () => {
  it("writes the page and the review beside a copy of the bundle, in a folder per review target", async () => {
    await withTemporaryFolder(async (folder) => {
      const bundlePath = join(folder, "bundle")
      const dataPath = join(folder, "data")
      await writeText(join(bundlePath, "app.js"), "app")
      await writeText(join(bundlePath, "app.css"), "style")

      const files = await createPublishedPageWriter({ bundlePath, dataPath })(KEY, TEXTS)

      const folderPath = join(dataPath, "publications", "storefront", "branch-feature%2Fweb")
      expect(files).toStrictEqual({ folderPath, pageFileName: "index.html", supportingFileNames: ["app.css", "app.js", "review-data.js"] })
      await expect(readdir(folderPath)).resolves.toStrictEqual(["app.css", "app.js", "index.html", "review-data.js"])
      await expect(readFile(join(folderPath, "app.js"), "utf8")).resolves.toBe("app")
      await expect(readFile(join(folderPath, "review-data.js"), "utf8")).resolves.toBe(TEXTS.reviewScript)
    })
  })

  it("writes nothing when the bundle was not built", async () => {
    await withTemporaryFolder(async (folder) => {
      const dataPath = join(folder, "data")

      await expect(createPublishedPageWriter({ bundlePath: join(folder, "missing"), dataPath })(KEY, TEXTS)).resolves.toBeNull()
      await expect(readdir(folder)).resolves.toStrictEqual([])
    })
  })
})
