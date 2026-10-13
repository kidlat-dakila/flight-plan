# Prompt configurations

## Definition

A prompt configuration decides how the agent writes a [review artifact](review-artifact.md): the voice of its prose, how each field is worded, which sections it generates, and whether its [context code blocks](review-artifact.md#context-code-blocks) are described. The artifact's structure never changes with the configuration. Only the words, and whether optional sections and descriptions are written, do.

A configuration is built from three layers:

| Layer | Who writes it | Changes per configuration |
|---|---|---|
| [System instructions](#system-instructions) | Flight Plan | No |
| [Preset configuration](#preset-configurations) | Flight Plan | Yes, one per preset |
| [Custom configuration](#custom-configuration) | The user | Yes, one per custom configuration |

## Field instructions

Every field of a review artifact has guidance attached to it, and the configuration layers fill that guidance in.

- **Field description**: what the field is, its shape, and example values. Every field has one. It belongs to the system instructions.
- **How-to-write instruction**: how to word the field. Only **editable** fields have one, and it belongs to the preset or custom configuration.
- **Option meanings**: for a field with a fixed set of values, such as a finding's kind or a Blast Diagram impact type, one meaning per value. For an editable field, they are part of the configuration.

A field is either **editable**, when a configuration can change how it is written (a waypoint's reading, a finding's title), or **static**, when its wording is fixed by Flight Plan (an identifier, a range). A segment's id and title are static: they have a field description and no how-to-write instruction.

A field is named by its path inside a segment, such as `context`, `journey.nodes.label` or `walkthrough.files.waypoints.findings.kind`. A finding lives on a waypoint, so every field of a finding is under `walkthrough.files.waypoints.findings`.

Each field's guidance is attached to the field itself in the artifact's schema: a version, whether it is editable, its field description, an example value, and for an editable field the title and description the settings screen shows it with.

The **writing style** is the one instruction that belongs to no field: the voice all prose shares. By default it is Simplified Technical English: one idea per sentence, active voice, present tense, plain words, and no claim about code that does not name the code. It is editable like any how-to-write instruction.

## System instructions

The fixed part of every configuration: the artifact's format and every field's description. They define what a valid artifact is, so no configuration can change them. They are shipped with Flight Plan and read once when it starts.

## Preset configurations

A preset is a complete, read-only configuration that ships with Flight Plan: a how-to-write instruction for every editable field it writes, a writing style, which optional sections are on, and whether it requires context code blocks. Each preset writes for a different reader.

| Preset | Written for |
|---|---|
| **Standard** | A reviewer who knows the codebase and wants the full review. The default. |
| **Minimal** | A reviewer who wants the shortest artifact that still answers the review's questions. It writes every field in fragments that keep each fact once, and leaves the Journey Flow Diagram, the Blast Diagram and the findings out. |
| **Onboardee** | A reader new to the codebase, who needs more context about the code around the change. It writes every field as Standard does, and it requires a description of every context code block. |
| **Unfamiliar territory** | A reviewer who knows the codebase, but not the area this change touches. |

## Custom configuration

A configuration the user creates, based on a preset. It overrides any how-to-write instruction, the writing style, and the section switches. Anything it does not override comes from its preset, so a custom configuration never becomes incomplete when Flight Plan adds a field.

## Section switches

A configuration turns the optional parts of an artifact on or off:

| Section | Standard | Minimal | Onboardee | Unfamiliar territory |
|---|---|---|---|---|
| Journey Flow Diagram | On | Off | On | On |
| Blast Diagram | On | Off | On | On |
| Code Walkthrough | On | On | On | On |
| Findings | On | Off | On | On |

The Context Section is always generated. The findings are a switch of their own, inside the Code Walkthrough: with it off, the waypoints are written and carry no findings.

The switches are data of the configuration, and nothing else decides them: no preset is treated differently by name. When a review is requested, its switches are copied onto the [review artifact](review-artifact.md#sections), and from then on the artifact's own switches are what the page and the agent's tools read.

### A section that is off

A section that is off is **not generated**:

- Flight Plan builds no structure for it. The artifact holds no Journey Flow Diagram and no Blast Diagram.
- The agent is not asked to write it. It is no part of what is left to write, and its fields are not in the index of instructions.
- The agent's tools refuse it. Reading it, asking how to write it and writing it each return a message that says the reviewer chose not to generate it.
- The page says so where the section would be, and offers to generate it.

### Generating a section on demand

"Generate" on that offer switches the section on for the whole Flight Plan, every segment of it. For a diagram, Flight Plan first builds its structure from the two commits the artifact compares, and puts it on each segment that still holds the same changed files, so nothing that is written changes. Then the review's writer is asked for that section alone, with the configuration the review was written with: the agent is started or sent a message, a reviewer who prompts their own agent gets the prompt to paste, and an author gets the structure to write themselves.

## Context code blocks

A configuration says whether it requires [context code blocks](review-artifact.md#context-code-blocks): a written description of each code block a reader can open by hovering its name in a code view.

| | Standard | Minimal | Onboardee | Unfamiliar territory |
|---|---|---|---|---|
| Requires context code blocks | No | No | Yes | No |

Like a section switch, the requirement is data of the configuration and nothing else decides it. When a review is requested it is copied onto every context code block of the artifact, and from then on the artifact's own blocks are what the page and the agent's tools read.

- **Where it is required**, each block with no description is work left to write, a finished artifact must have every one, and the page shows the description in the hover, above the code.
- **Where it is not required**, the agent is not asked for a description, the field is not in the index of instructions, and the agent's tools refuse one.

The description has one how-to-write instruction, `contextCodeBlocks.description`. Only a preset that requires context code blocks has a file for it. Onboardee writes for an engineer who has never opened the repository: what the code is, what it does, its arguments and what it returns or its props, and where the codebase uses it.

## Choosing a configuration

The user picks an active configuration, which applies to every review they start. A repository can also choose its own configuration, which applies to that repository's reviews instead.
