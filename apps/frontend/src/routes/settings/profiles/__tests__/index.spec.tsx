import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createApp } from "@/app"
import { fakeBackendLinks, type ProcedureHandlers, type ProcedureReply } from "@/routes/__tests__/fake-backend"
import { createTrpcClient } from "@/trpc"

const plain = (text: string) => ({ text, kind: "plain" })

const standardRow = {
  id: "standard",
  name: "Standard",
  summary: "The agent writes the full review.",
  details: [plain("Ships with Flight Plan"), plain("No instruction changed")],
  defaultLabel: "Default",
  duplicateLabel: "Duplicate",
  duplicateName: "Duplicate Standard",
}

const terseRow = {
  id: "custom-terse",
  name: "Terse",
  summary: null,
  details: [plain("Based on Standard"), plain("1 instruction changed"), plain("Blast Diagram off")],
  defaultLabel: null,
  duplicateLabel: "Duplicate",
  duplicateName: "Duplicate Terse",
}

const configurationList = {
  groups: [
    { title: "Presets", rows: [standardRow], emptyMessage: null },
    { title: "Your configurations", rows: [terseRow], emptyMessage: null },
  ],
}

const emptyList = {
  groups: [
    { title: "Presets", rows: [standardRow], emptyMessage: null },
    { title: "Your configurations", rows: [], emptyMessage: "You have no configuration of your own yet." },
  ],
}

const index = [
  { title: null, entries: [{ key: "sections", label: "Sections", mark: "unchanged", markLabel: "Not changed", isOpen: true }] },
  {
    title: "Code Walkthrough",
    entries: [
      { key: "walkthrough.files.waypoints.title", label: "Waypoint title", mark: "changed", markLabel: "Changed", isOpen: false },
    ],
  },
  {
    title: "Blast Diagram",
    entries: [{ key: "blast.nodes.impactReason", label: "Blast file impact reason", mark: "off", markLabel: "Switched off", isOpen: false }],
  },
]

const switchesPanel = {
  kind: "switches",
  title: "Sections",
  summary: "Which optional parts of a review the agent writes.",
  sectionsTitle: "Optional sections",
  sections: [
    { section: "journey", label: "Journey Flow Diagrams", description: "How the changed code runs.", isOn: true },
    { section: "blast", label: "Blast Diagram", description: "The files the change can affect.", isOn: false },
    { section: "findings", label: "Findings", description: "What the agent reports on a waypoint.", isOn: true },
  ],
  alwaysWrittenNote: "The Context Section and the Code Walkthrough are always written.",
  contextKindsTitle: "Context code blocks",
  contextKindsHint: "Pick the kinds of name the agent describes.",
  contextKinds: [{ kind: "codebase", label: "Code of the repository", description: "What the code is.", isRequired: false }],
}

const fieldPanel = {
  kind: "field",
  path: "walkthrough.files.waypoints.title",
  title: "Waypoint title",
  summary: "What was done, and to what.",
  descriptionLabel: "What Flight Plan tells the agent this field is",
  description: "A waypoint's one-line heading.",
  offMessage: null,
  texts: [
    {
      key: "walkthrough.files.waypoints.title",
      label: "How to write it",
      value: "Three words.",
      shippedValue: "Say what was done.",
      shippedLabel: "Standard's instruction",
      isChanged: true,
    },
  ],
  resetLabel: "Reset to Standard",
}

const tersePage = {
  kind: "found",
  id: "custom-terse",
  name: "Terse",
  originLabel: "Based on Standard",
  notice: null,
  canRename: true,
  canDelete: true,
  duplicateLabel: "Duplicate",
  index,
  panel: switchesPanel,
}

const standardPage = {
  ...tersePage,
  id: "standard",
  name: "Standard",
  originLabel: "Ships with Flight Plan",
  notice: { lead: "A release of Flight Plan can overwrite what you change in a preset.", advice: "Duplicate it to keep your changes." },
  canRename: false,
  canDelete: false,
}

const creationForm = { sources: [standardRow, terseRow], selectedSourceId: "standard" }

const fieldOf = (input: unknown): string | null =>
  typeof input === "object" && input !== null && "field" in input && typeof input.field === "string" ? input.field : null

const idOf = (input: unknown): string =>
  typeof input === "object" && input !== null && "id" in input && typeof input.id === "string" ? input.id : ""

const getConfiguration = (input: unknown): ProcedureReply => {
  const page = idOf(input) === "standard" ? standardPage : tersePage
  return { data: fieldOf(input) === null ? page : { ...page, panel: fieldPanel } }
}

const BASE_HANDLERS: ProcedureHandlers = {
  "configuration.list": () => ({ data: configurationList }),
  "configuration.get": getConfiguration,
  "configuration.creationForm": () => ({ data: creationForm }),
}

const renderApp = (handlers: ProcedureHandlers, path: string) => {
  const history = createMemoryHistory({ initialEntries: [path] })
  render(
    createApp({
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      trpcClient: createTrpcClient(fakeBackendLinks({ ...BASE_HANDLERS, ...handlers })),
      history,
    }),
  )
  return history
}

describe("the configurations list", () => {
  it("lists the presets and the user's configurations as links, with the default marked", async () => {
    renderApp({}, "/settings/profiles")

    expect(await screen.findByRole("heading", { level: 2, name: "Configurations" })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 3, name: "Presets" })).toBeTruthy()
    expect(screen.getByRole("link", { name: /Standard.*Default/ }).getAttribute("href")).toBe("/settings/profiles/standard")
    expect(screen.getByRole("link", { name: /Terse.*Blast Diagram off/ }).getAttribute("href")).toBe("/settings/profiles/custom-terse")
    expect(screen.getByRole("link", { name: "New configuration" }).getAttribute("href")).toBe("/settings/profiles/create")
  })

  it("says so when the user has no configuration of their own", async () => {
    renderApp({ "configuration.list": () => ({ data: emptyList }) }, "/settings/profiles")

    expect(await screen.findByText("You have no configuration of your own yet.")).toBeTruthy()
  })

  it("duplicates a configuration and opens the copy", async () => {
    const create = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "created", id: "custom-terse" } })
    const history = renderApp({ "configuration.create": create }, "/settings/profiles")

    fireEvent.click(await screen.findByRole("button", { name: "Duplicate Standard" }))

    await waitFor(() => {
      expect(history.location.pathname).toBe("/settings/profiles/custom-terse")
    })
    expect(create).toHaveBeenCalledWith({ name: null, sourceId: "standard" })
  })
})

describe("a configuration", () => {
  it("puts the field index where the settings list is, with a mark on each field", async () => {
    renderApp({}, "/settings/profiles/custom-terse")

    const fields = await screen.findByRole("navigation", { name: "Fields of this configuration" })

    expect(screen.queryByRole("navigation", { name: "Settings sections" })).toBeNull()
    expect(screen.getByRole("heading", { level: 2, name: "Terse" })).toBeTruthy()
    expect(within(fields).getByRole("link", { name: /^Sections\s*Not changed$/ }).getAttribute("aria-current")).toBe("page")
    expect(within(fields).getByRole("link", { name: /^Waypoint title\s*Changed$/ }).getAttribute("href")).toBe(
      "/settings/profiles/custom-terse?field=walkthrough.files.waypoints.title",
    )
    expect(within(fields).getByRole("link", { name: /^Blast file impact reason\s*Switched off$/ })).toBeTruthy()
  })

  it("warns that a release can overwrite a preset, and offers to duplicate it", async () => {
    const create = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "created", id: "custom-terse" } })
    const history = renderApp({ "configuration.create": create }, "/settings/profiles/standard")

    const notice = await screen.findByRole("note")

    expect(notice.textContent).toContain("A release of Flight Plan can overwrite what you change in a preset.")
    expect(screen.queryByRole("button", { name: "Rename" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull()

    fireEvent.click(within(notice).getByRole("button", { name: "Duplicate" }))

    await waitFor(() => {
      expect(history.location.pathname).toBe("/settings/profiles/custom-terse")
    })
    expect(create).toHaveBeenCalledWith({ name: null, sourceId: "standard" })
  })

  it("saves the sections that are ticked", async () => {
    const save = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "saved", message: "The sections are saved." } })
    renderApp({ "configuration.save": save }, "/settings/profiles/custom-terse")

    fireEvent.click(await screen.findByRole("checkbox", { name: "Findings" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Code of the repository" }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("The sections are saved.")).toBeTruthy()
    expect(save).toHaveBeenCalledWith({ change: "switches", id: "custom-terse", sections: ["journey"], contextCodeBlockKinds: ["codebase"] })
  })

  it("opens a field with its instruction in the text editor, without a code link control", async () => {
    renderApp({}, "/settings/profiles/custom-terse?field=walkthrough.files.waypoints.title")

    const editor = await screen.findByRole("textbox", { name: "Waypoint title: How to write it" })

    expect(editor.textContent).toBe("Three words.")
    expect(screen.getByRole("button", { name: "Bold" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Code link" })).toBeNull()
    expect(screen.getByText("Standard's instruction")).toBeTruthy()
    expect(screen.getByText("Say what was done.")).toBeTruthy()
  })

  it("saves a field and resets it", async () => {
    const save = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "saved", message: "This field is saved." } })
    renderApp({ "configuration.save": save }, "/settings/profiles/custom-terse?field=walkthrough.files.waypoints.title")

    fireEvent.click(await screen.findByRole("button", { name: "Save" }))

    expect(await screen.findByText("This field is saved.")).toBeTruthy()
    expect(save).toHaveBeenCalledWith({
      change: "field",
      id: "custom-terse",
      path: "walkthrough.files.waypoints.title",
      texts: [{ key: "walkthrough.files.waypoints.title", text: "Three words." }],
    })

    fireEvent.click(screen.getByRole("button", { name: "Reset to Standard" }))

    await waitFor(() => {
      expect(save).toHaveBeenLastCalledWith({ change: "reset", id: "custom-terse", path: "walkthrough.files.waypoints.title" })
    })
  })

  it("shows why a save was rejected", async () => {
    const save = (): ProcedureReply => ({ data: { kind: "rejected", message: "An instruction cannot be empty." } })
    renderApp({ "configuration.save": save }, "/settings/profiles/custom-terse?field=walkthrough.files.waypoints.title")

    fireEvent.click(await screen.findByRole("button", { name: "Save" }))

    expect((await screen.findByRole("alert")).textContent).toBe("An instruction cannot be empty.")
  })

  it("renames a configuration", async () => {
    const save = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "saved", message: "The name is saved." } })
    renderApp({ "configuration.save": save }, "/settings/profiles/custom-terse")

    fireEvent.click(await screen.findByRole("button", { name: "Rename" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Short" } })
    fireEvent.click(screen.getByRole("button", { name: "Save name" }))

    await waitFor(() => {
      expect(save).toHaveBeenCalledWith({ change: "rename", id: "custom-terse", name: "Short" })
    })
  })

  it("deletes a configuration after a second press and returns to the list", async () => {
    const remove = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "deleted" } })
    const history = renderApp({ "configuration.delete": remove }, "/settings/profiles/custom-terse")

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }))

    expect(screen.getByText("Delete Terse? This cannot be undone.")).toBeTruthy()
    expect(remove).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(history.location.pathname).toBe("/settings/profiles")
    })
    expect(remove).toHaveBeenCalledWith({ id: "custom-terse" })
  })

  it("says so when the configuration does not exist", async () => {
    renderApp({ "configuration.get": () => ({ errorMessage: "Flight Plan has no configuration at this address." }) }, "/settings/profiles/custom-gone")

    expect((await screen.findByRole("alert")).textContent).toContain("Flight Plan has no configuration at this address.")
  })
})

describe("the new configuration page", () => {
  it("creates a configuration from the chosen source and opens it", async () => {
    const create = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "created", id: "custom-terse" } })
    const history = renderApp({ "configuration.create": create }, "/settings/profiles/create")

    fireEvent.change(await screen.findByRole("textbox", { name: "Name" }), { target: { value: "Shorter" } })
    fireEvent.click(screen.getByRole("radio", { name: /Terse/ }))
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() => {
      expect(history.location.pathname).toBe("/settings/profiles/custom-terse")
    })
    expect(create).toHaveBeenCalledWith({ name: "Shorter", sourceId: "custom-terse" })
  })

  it("selects the default source and shows a rejected name under the field", async () => {
    const create = (): ProcedureReply => ({ data: { kind: "rejected", message: "Enter a name for the configuration.", field: "name" } })
    renderApp({ "configuration.create": create }, "/settings/profiles/create")

    expect(await screen.findByRole("radio", { name: /^Standard/ })).toHaveProperty("checked", true)

    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    expect((await screen.findByRole("alert")).textContent).toBe("Enter a name for the configuration.")
    expect(screen.getByRole("textbox", { name: "Name" }).getAttribute("aria-invalid")).toBe("true")
  })
})
