import typescriptEslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"
import stylistic from "@stylistic/eslint-plugin"

/**
 * One flat config for everything in the repository.
 *
 * It used to lint `src` alone and to match `**\/*.ts` only, so both packages
 * were unlinted and no `.tsx` in the project had ever been linted at all —
 * including the renderer, where most of the walkthrough view lives. That is the
 * same gap `check-types` had before it was pointed at the packages, and that
 * one was hiding four live bugs. This one was hiding two.
 *
 * The rules are set to describe the code that is here. Left at their defaults
 * they reported 3,952 warnings, none of them a defect: semicolons required in
 * a project written without them, braces required around the single-line
 * `if (x) return` used throughout, and `== null` flagged when it is the idiom
 * for "null or undefined" in one test. A warning nobody can act on hides the
 * one that matters, and 3,952 of them is the same as no lint at all.
 *
 * There is no formatter here, and that is a decision rather than an omission.
 * ESLint enforces named rules; a formatter imposes a layout. This code is
 * hand-formatted with intent — comment blocks and signatures are broken where
 * they read best — and running Prettier over it once reformatted a whole file
 * against the house style. Rules can insist on semicolons and braces without
 * touching any of that. Nothing guards against a stray `prettier --write`
 * either, because nothing needs to: `package` runs this, so the damage would
 * surface as thousands of warnings before a vsix could be built.
 */
export default [
  /*
   * Global ignores, and the shape matters.
   *
   * An `ignores` beside a `files` is scoped to that one config; only an object
   * carrying `ignores` alone ignores anything globally. Written the other way,
   * `eslint .` walked into `.vscode-test`, which holds a downloaded copy of VS
   * Code — thousands of files and eslint configs of its own — and died on a
   * package one of them imports.
   */
  {
    ignores: [
      "**/node_modules/**",
      "dist/**",
      "out/**",
      ".vscode-test/**",
      "**/*.d.ts",
    ],
  },
  { files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs"] },
  {
    plugins: {
      "@typescript-eslint": typescriptEslint.plugin,
      "@stylistic": stylistic,
      "react-hooks": reactHooks,
    },

    languageOptions: {
      parser: typescriptEslint.parser,
      ecmaVersion: 2022,
      sourceType: "module",
    },

    rules: {
      "@typescript-eslint/naming-convention": [
        "warn",
        { selector: "import", format: ["camelCase", "PascalCase"] },
      ],

      /*
       * `@stylistic/semi` rather than core `semi`.
       *
       * The core rule is deprecated: ESLint handed its stylistic rules to
       * ESLint Stylistic, and this project's single largest rule — 3,697 of
       * those 3,952 — was resting on one slated for removal. It would have
       * gone quietly, too: the lint would keep passing and simply stop
       * checking, which is the failure this whole config exists to avoid.
       *
       * `curly` and `eqeqeq` stay on core rules. Neither is purely stylistic
       * and neither is deprecated.
       */
      "@stylistic/semi": ["warn", "never"],
      curly: ["warn", "multi-line"],
      eqeqeq: ["warn", "always", { null: "ignore" }],
      "no-throw-literal": "warn",

      /*
       * The hooks rules, and the reason that plugin is a dependency.
       *
       * `rules-of-hooks` is an error because breaking it is a bug by
       * construction — it caught a `useMemo` placed after a conditional
       * return, which nothing else in the toolchain could see. `exhaustive-deps`
       * is a warning because a missing dependency is sometimes deliberate, but
       * it has to be argued for in a comment rather than left silent.
       */
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]
