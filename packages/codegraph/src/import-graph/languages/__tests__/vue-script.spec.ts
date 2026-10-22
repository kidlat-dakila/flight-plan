import fc from "fast-check"
import { describe, expect, it } from "vitest"
import { readVueScripts } from "@/import-graph/languages/vue-script"

const UNCLOSED_TAG_COUNT = 40_000
const UNENDED_SCRIPT_COUNT = 80_000
const END_TAG_PATTERN = /<\/script[\s/>]/i
const MARKUP_PIECES = ["<script>", "<SCRIPT lang=\"ts\">", "</script>", "</script ", "</SCRIPT>", "</scripts>", "<scripts>", "<script", ">", "<", "/", " ", "\n", "a"]

const bodiesOf = (text: string): string[] => readVueScripts(text).map((script) => script.text)

describe("reading the scripts of a Vue file", () => {
  it("reads each script block with its language", () => {
    const scripts = readVueScripts(`<template><p>Hi</p></template>\n<script setup lang="ts">\nconst count = 1\n</script>\n`)

    expect(scripts.map((script) => [script.grammar, script.text.trim(), script.isJavaScript])).toStrictEqual([["typescript", "const count = 1", false]])
  })

  it("ends a script at an end tag with spaces or stray attributes, as a browser does", () => {
    expect(bodiesOf("<script>one()</script >")).toStrictEqual(["one()"])
    expect(bodiesOf("<script>two()</script\t\n foo>")).toStrictEqual(["two()"])
  })

  it("stays quick on end tags that never close", () => {
    expect(bodiesOf(`<script>${"</script".repeat(UNCLOSED_TAG_COUNT)}`)).toStrictEqual([])
  })

  it("stays quick on script tags that are opened and never ended", () => {
    expect(bodiesOf("<script>".repeat(UNENDED_SCRIPT_COUNT))).toStrictEqual([])
    expect(bodiesOf("<script".repeat(UNENDED_SCRIPT_COUNT))).toStrictEqual([])
  })

  it("does not read a script tag that sits inside the end tag before it", () => {
    expect(bodiesOf("</script <script></script/>")).toStrictEqual([])
  })

  it("never lets a script run past an end tag, whatever the markup", () => {
    fc.assert(fc.property(fc.array(fc.constantFrom(...MARKUP_PIECES), { maxLength: 20 }), (pieces) => {
      bodiesOf(pieces.join("")).forEach((body) => {
        expect(body).not.toMatch(END_TAG_PATTERN)
      })
    }))
  })

  it("does not end a script at a longer tag name that starts with script", () => {
    expect(bodiesOf("<script>const tag = '</scripts>'</script>")).toStrictEqual(["const tag = '</scripts>'"])
  })
})
