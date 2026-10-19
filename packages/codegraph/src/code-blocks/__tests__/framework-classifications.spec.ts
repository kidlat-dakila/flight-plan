import type { StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import type { CodeBlockClassification } from "@/code-blocks/types"
import { blockNamed, codeOf, groupOf } from "./group-fixture"

const classificationsIn = (group: StoredCodeGroupGraph, filePath: string): CodeBlockClassification[] => [
  ...new Set(group.codeBlocks.filter((block) => block.filePath === filePath).flatMap((block) => block.classifications)),
]

const NEST_FILTER = codeOf(
  "import { Catch } from \"@nestjs/common\"",
  "@Catch(HttpException)",
  "export class HttpExceptionFilter {",
  "  catch(exception, host) {",
  "    host.switchToHttp().getResponse().status(500)",
  "  }",
  "}",
)

const NEST_MODULE = codeOf(
  "import { Module } from \"@nestjs/common\"",
  "@Module({ controllers: [CatsController], providers: [CatsService] })",
  "export class AppModule {}",
)

const NEST_MAIN = codeOf(
  "import { NestFactory } from \"@nestjs/core\"",
  "const bootstrap = async () => {",
  "  const app = await NestFactory.create(AppModule)",
  "  await app.listen(3000)",
  "}",
  "bootstrap()",
)

const EXPRESS_SERVER = codeOf("import express from \"express\"", "const app = express()", "app.listen(3000, () => { console.log(\"ready\") })")

const FASTIFY_SERVER = codeOf(
  "import Fastify from \"fastify\"",
  "const app = Fastify()",
  "app.setErrorHandler((error, request, reply) => { reply.status(500).send({ ok: false }) })",
)

const REACT_THEME = codeOf(
  "import { createContext } from \"react\"",
  "export const ThemeContext = createContext(\"light\")",
  "export const ThemeRoot = ({ children }) => <ThemeContext.Provider value=\"dark\">{children}</ThemeContext.Provider>",
)

const FLASK_APP = codeOf(
  "from flask import Flask, render_template",
  "",
  "app = Flask(__name__)",
  "",
  "@app.errorhandler(404)",
  "def page_not_found(error):",
  "    return \"Not found\", 404",
  "",
  "@app.route(\"/\")",
  "def index():",
  "    return render_template(\"index.html\")",
  "",
  "if __name__ == \"__main__\":",
  "    app.run(debug=True)",
)

const FLASK_FACTORY = codeOf(
  "from flask import Flask",
  "",
  "def server_error(error):",
  "    return \"Oops\", 500",
  "",
  "app = Flask(__name__)",
  "app.register_error_handler(500, server_error)",
)

const FASTAPI_APP = codeOf(
  "from fastapi import FastAPI, Request",
  "from fastapi.templating import Jinja2Templates",
  "",
  "app = FastAPI()",
  "templates = Jinja2Templates(directory=\"templates\")",
  "",
  "@app.exception_handler(ValueError)",
  "async def value_error_handler(request: Request, exc: ValueError):",
  "    return None",
  "",
  "@app.get(\"/items/{id}\")",
  "async def read_item(request: Request, id: str):",
  "    return templates.TemplateResponse(request=request, name=\"item.html\", context={\"id\": id})",
)

const DJANGO_VIEWS = codeOf(
  "from django.shortcuts import render",
  "from django.template.response import TemplateResponse",
  "",
  "def blog_index(request):",
  "    return render(request, \"blog/index.html\", {})",
  "",
  "def entries(request):",
  "    return TemplateResponse(request, \"blog/entries.html\", {})",
)

describe("the classifications a framework gives", () => {
  it("classifies a NestJS exception filter, a Flask or FastAPI error handler and a Fastify error handler as error handling", () => {
    const group = groupOf({ "src/http-exception.filter.ts": NEST_FILTER, "src/server.ts": FASTIFY_SERVER, "app.py": FLASK_APP, "factory.py": FLASK_FACTORY, "main.py": FASTAPI_APP })

    expect(blockNamed(group, "class", "HttpExceptionFilter").classifications).toStrictEqual(["error-handling"])
    expect(blockNamed(group, "function", "page_not_found").classifications).toStrictEqual(["error-handling", "event"])
    expect(blockNamed(group, "function", "value_error_handler").classifications).toStrictEqual(["error-handling", "event"])
    expect(classificationsIn(group, "src/server.ts")).toContain("error-handling")
    expect(classificationsIn(group, "factory.py")).toContain("error-handling")
  })

  it("classifies a React context, a NestJS module and the call that starts a server as context and wiring", () => {
    const group = groupOf({ "src/theme.tsx": REACT_THEME, "src/app.module.ts": NEST_MODULE, "src/main.ts": NEST_MAIN, "src/server.ts": EXPRESS_SERVER, "app.py": FLASK_APP })

    expect(blockNamed(group, "root-variable", "ThemeContext").classifications).toStrictEqual(["context-and-wiring"])
    expect(blockNamed(group, "component", "ThemeRoot").classifications).toStrictEqual(["component", "context-and-wiring"])
    expect(blockNamed(group, "class", "AppModule").classifications).toStrictEqual(["context-and-wiring"])
    expect(blockNamed(group, "call", "app.listen").classifications).toStrictEqual(["context-and-wiring"])
    expect(classificationsIn(group, "src/server.ts")).toContain("context-and-wiring")
    expect(blockNamed(group, "call", "app.run").classifications).toStrictEqual(["context-and-wiring"])
  })

  it("puts page above api-route for a view that renders a template", () => {
    const group = groupOf({ "app.py": FLASK_APP, "main.py": FASTAPI_APP, "blog/views.py": DJANGO_VIEWS })

    expect(blockNamed(group, "function", "index").classifications).toStrictEqual(["page", "api-route"])
    expect(blockNamed(group, "function", "read_item").classifications).toStrictEqual(["page", "api-route"])
    expect(blockNamed(group, "function", "blog_index").classifications).toStrictEqual(["page"])
    expect(blockNamed(group, "function", "entries").classifications).toStrictEqual(["page"])
  })

  it("classifies the methods of a React error boundary, and a Next.js error file, as error-handling", () => {
    const boundary = codeOf(
      "import { Component } from \"react\"",
      "export class ErrorBoundary extends Component {",
      "  static getDerivedStateFromError(error) {",
      "    return { hasError: true }",
      "  }",
      "  componentDidCatch(error, info) {",
      "    report(error)",
      "  }",
      "}",
    )
    const errorPage = codeOf("\"use client\"", "export default function Error({ error, reset }) {", "  return <button onClick={() => reset()}>Try again</button>", "}")
    const group = groupOf({
      "package.json": JSON.stringify({ dependencies: { next: "15.0.0", react: "19.0.0" } }),
      "src/error-boundary.tsx": boundary,
      "app/dashboard/error.tsx": errorPage,
    })

    expect(blockNamed(group, "method", "ErrorBoundary.componentDidCatch").classifications).toStrictEqual(["error-handling", "event"])
    expect(blockNamed(group, "method", "ErrorBoundary.getDerivedStateFromError").classifications).toStrictEqual(["error-handling", "event"])
    expect(blockNamed(group, "class", "ErrorBoundary").classifications).toContain("error-handling")
    expect(blockNamed(group, "component", "Error").classifications.slice(0, 3)).toStrictEqual(["page", "component", "error-handling"])
  })

  it("classifies an Express handler with four arguments as error-handling, written in place or by name, and no other middleware", () => {
    const server = codeOf(
      "import express from \"express\"",
      "const app = express()",
      "function handleErrors(error, req, res, next) {",
      "  res.status(500).json({ message: error.message })",
      "}",
      "const logRequests = (req, res, next) => next()",
      "app.use(logRequests)",
      "app.use(handleErrors)",
      "app.use((error, req, res, next) => res.status(500).end())",
    )
    const group = groupOf({ "src/server.ts": server })
    const inline = group.codeBlocks.find((block) => block.filePath === "src/server.ts" && block.lineOfCodeRangeReference[0].start.line === 9 && block.type !== "root-statement")

    expect(blockNamed(group, "function", "handleErrors").classifications).toContain("error-handling")
    expect(blockNamed(group, "function", "logRequests").classifications).not.toContain("error-handling")
    expect(inline?.classifications).toContain("error-handling")
  })

  it("classifies the assignment of a Vue app's error handler as error-handling", () => {
    const main = codeOf(
      "import { createApp } from \"vue\"",
      "const app = createApp(App)",
      "app.config.errorHandler = (err, instance, info) => {",
      "  report(err, info)",
      "}",
    )

    expect(classificationsIn(groupOf({ "src/main.ts": main }), "src/main.ts")).toContain("error-handling")
  })
})
