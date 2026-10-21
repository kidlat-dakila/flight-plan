---
title: Context code blocks
description: Hover a name in the code to see where it comes from, and read what it is.
---

Hover a name in the code you read, and a card shows where it comes from. Flight Plan builds the card from the code, with no agent. For a function or a variable, it shows the lines that define it. For an exported name, it lists the files and lines that use it. For a library name, it shows the import, and doesn't follow it.

## Descriptions

A prompt configuration can also have your agent describe the names, under **Hover descriptions**:

| Kind | Which names | Presets that ask for it |
|---|---|---|
| **Code of the repository** | Functions, components and other declarations from other files of the repository | Onboardee, Unfamiliar territory |
| **Libraries** | Names imported from a library | Unfamiliar territory |
| **Language** | Names that are neither imported nor declared, so they belong to the language | Unfamiliar territory |

Your agent writes what the code is, what it does and, for the repository's code, where the codebase uses it.

## The card

The card shows where the name is defined, your agent's description when there is one, then the code. A library name says the import is shown and not followed. A language name says it's assumed to be part of the language. A language name is underlined only once its description is written.
