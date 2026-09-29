import { describe, expect, test } from "vitest"
import { monogram, monogramHue } from "../ReviewHeader"

/*
 * What a face falls back to when there is no picture.
 *
 * Not decoration. The extension inlines avatars as `data:` URIs because the
 * panel's CSP forbids loading them, and any of that can fail — a host that is
 * down, a picture over the size cap, somebody who has never set one. The
 * monogram is what the header draws then, and it still has to tell two people
 * apart at 24 pixels.
 */
describe("monogram", () => {
  test("takes initials from a real name when the host gave one", () => {
    expect(monogram({ login: "alovelace", name: "Ada Lovelace", avatarUrl: "" })).toBe("AL")
  })

  test("falls back to the handle, which is usually one word", () => {
    // One letter is the right answer rather than a degraded one: the tooltip
    // carries the name, and this only has to separate two faces in a row.
    expect(monogram({ login: "alovelace", avatarUrl: "" })).toBe("A")
  })

  test("splits a handle on the punctuation handles actually use", () => {
    expect(monogram({ login: "ada-lovelace", avatarUrl: "" })).toBe("AL")
    expect(monogram({ login: "ada.lovelace", avatarUrl: "" })).toBe("AL")
    expect(monogram({ login: "ada_lovelace", avatarUrl: "" })).toBe("AL")
  })

  test("takes the first and last word, not the first two", () => {
    // A display name is often three parts, and the surname is the half a
    // reader recognises.
    expect(monogram({ login: "x", name: "Ada King Lovelace", avatarUrl: "" })).toBe("AL")
  })

  test("an empty name falls through to the handle rather than blanking", () => {
    expect(monogram({ login: "ada", name: "   ", avatarUrl: "" })).toBe("A")
  })

  test("something with no letters at all still renders", () => {
    // Never an empty circle: a face with nothing in it reads as a loading
    // state that never finishes.
    expect(monogram({ login: "", avatarUrl: "" })).toBe("?")
  })
})

describe("monogramHue", () => {
  test("the same handle is always the same colour", () => {
    // Derived rather than assigned in order, because order changes: a reviewer
    // added today would otherwise recolour everyone after them.
    expect(monogramHue("ada")).toBe(monogramHue("ada"))
  })

  test("case does not change the colour", () => {
    // The adapters disagree about the case of a handle, and one person should
    // not be two colours depending on which host answered.
    expect(monogramHue("Ada")).toBe(monogramHue("ada"))
  })

  test("different handles generally differ", () => {
    const hues = new Set(["ada", "bo", "cy", "dee", "zoe"].map(monogramHue))
    expect(hues.size).toBeGreaterThan(3)
  })

  test("always a usable hue", () => {
    for (const login of ["", "a", "zzzzzzzzzzzzzzzzzzzz", "ünïcødé"]) {
      const hue = monogramHue(login)
      expect(Number.isInteger(hue)).toBe(true)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })
})
