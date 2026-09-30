# Prompt configurations

## Definition

A prompt configuration decides how the agent writes a [review artifact](review-artifact.md): the voice of its prose, how each field is worded, and which sections it generates. The artifact's structure never changes with the configuration. Only the words, and whether optional sections are generated, do.

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
- **Option meanings**: for a field with a fixed set of values, such as a finding's kind or a Blast Diagram verdict, one meaning per value. For an editable field, they are part of the configuration.

A field is either **editable**, when a configuration can change how it is written (a waypoint's reading, a finding's title), or **static**, when its wording is fixed by Flight Plan (an identifier, a range).

The **writing style** is the one instruction that belongs to no field: the voice all prose shares. By default it is Simplified Technical English: one idea per sentence, active voice, present tense, plain words, and no claim about code that does not name the code. It is editable like any how-to-write instruction.

## System instructions

The fixed part of every configuration: the artifact's format and every field's description. They define what a valid artifact is, so no configuration can change them. They are shipped with Flight Plan and read once when it starts.

## Preset configurations

A preset is a complete, read-only configuration that ships with Flight Plan: a how-to-write instruction for every editable field, a writing style, and which optional sections are on. Each preset writes for a different reader.

| Preset | Written for |
|---|---|
| **Standard** | A reviewer who knows the codebase and wants the full review. The default. |
| **Minimal** | A reviewer who wants the shortest artifact that still answers the review's questions. |
| **Onboardee** | A reader new to the codebase, who needs more context about the code around the change. |
| **Unfamiliar territory** | A reviewer who knows the codebase, but not the area this change touches. |

## Custom configuration

A configuration the user creates, based on a preset. It overrides any how-to-write instruction, the writing style, and the section switches. Anything it does not override comes from its preset, so a custom configuration never becomes incomplete when Flight Plan adds a field.

## Section switches

A configuration turns the optional parts of an artifact on or off:

| Section | Default |
|---|---|
| Journey Flow Diagram | On |
| Blast Diagram | On |
| Code Walkthrough | On |

The Context Section is always generated.

## Choosing a configuration

The user picks an active configuration, which applies to every review they start. A repository can also choose its own configuration, which applies to that repository's reviews instead.
