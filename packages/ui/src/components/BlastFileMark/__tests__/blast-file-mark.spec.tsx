import { render } from "@testing-library/react"
import BlastFileMark, { blastFileMarkSizeOf, isQuietBlastFileMark, type BlastFileMarkKind } from "@/components/BlastFileMark"

const MARKS: readonly BlastFileMarkKind[] = ["added", "modified", "deleted", "breaks", "behaviour-changes", "plain"]

const shapeOf = (mark: BlastFileMarkKind): string => {
  const { container } = render(<BlastFileMark mark={mark} radius={6} />)
  return [...container.querySelectorAll("svg > *")].map((shape) => `${shape.tagName}:${shape.getAttribute("d") ?? ""}:${shape.getAttribute("class") ?? ""}`).join("|")
}

describe("BlastFileMark", () => {
  it("draws every mark in a shape of its own", () => {
    expect(new Set(MARKS.map(shapeOf)).size).toBe(MARKS.length)
  })

  it("draws an added file green, a modified file blue and a deleted file red", () => {
    const fillOf = (mark: BlastFileMarkKind): string | null =>
      render(<BlastFileMark mark={mark} radius={6} />).container.querySelector("circle")?.getAttribute("fill") ?? null

    expect([fillOf("added"), fillOf("modified"), fillOf("deleted")]).toStrictEqual(["var(--diff-added)", "var(--line-blue)", "var(--diff-removed)"])
  })

  it("leaves room around the disc for the ring of a changed file", () => {
    expect(blastFileMarkSizeOf(6)).toBe(20)
  })

  it("calls only the plain mark quiet", () => {
    expect(MARKS.filter(isQuietBlastFileMark)).toStrictEqual(["plain"])
  })
})
