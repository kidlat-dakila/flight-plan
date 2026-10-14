import { parse } from "devalue"
import { z } from "zod"
import { parseDemoReview, type DemoReview } from "@flightplan/backend/demo-reviews"

const demoNamesSchema = z.array(z.string())

export interface DemoMount {
  readonly selectedName: string
  readonly names: readonly string[]
  readonly dataUrl: string
}

const readDemo = async (dataUrl: string, name: string): Promise<DemoReview> => {
  const response = await fetch(`${dataUrl}/${name}.json`)
  return parseDemoReview(parse(await response.text()))
}

export const readDemos = async (mount: DemoMount): Promise<readonly DemoReview[]> =>
  await Promise.all(mount.names.map(async (name) => await readDemo(mount.dataUrl, name)))

export const readMount = (element: HTMLElement): DemoMount => ({
  selectedName: element.dataset.demo ?? "",
  names: demoNamesSchema.parse(JSON.parse(element.dataset.demos ?? "[]")),
  dataUrl: element.dataset.dataUrl ?? "",
})
