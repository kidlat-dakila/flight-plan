import type { PatternFixture } from "@/catalogue/types"

const STYLED_COMPONENTS = "styled-components"

export const styledComponentsFixtures: readonly PatternFixture[] = [
  {
    library: STYLED_COMPONENTS,
    patternKey: "factory:default:*",
    matches: [
      "import styled from \"styled-components\"\nconst StyledLink = styled(Link)",
    ],
    rejects: [
      "const styled = (component) => component\nconst StyledLink = styled(Link)",
    ],
  },
  {
    library: STYLED_COMPONENTS,
    patternKey: "factory:default:*>called",
    matches: [
      "import styled from \"styled-components\"\nconst StyledLink = styled(Link)`\n  color: palevioletred;\n`",
    ],
    rejects: [
      "const styled = (component) => component\nconst StyledLink = styled(Link)`\n  color: palevioletred;\n`",
    ],
  },
  {
    library: STYLED_COMPONENTS,
    patternKey: "call:default.*:*",
    matches: [
      "import styled from \"styled-components\"\nconst Styled = styled.a`\n  color: palevioletred;\n`",
      "import styled from \"styled-components\"\nconst Styled = styled.li`\n  color: palevioletred;\n`",
      "import styled from \"styled-components\"\nconst Styled = styled.article`\n  color: palevioletred;\n`",
    ],
    rejects: [
      "const styled = makeLocalStyled()\nconst Styled = styled.span`\n  color: palevioletred;\n`",
    ],
  },
  {
    library: STYLED_COMPONENTS,
    patternKey: "call:css:*",
    matches: [
      "import { css } from \"styled-components\"\nconst truncate = css`\n  white-space: nowrap;\n`",
    ],
    rejects: [
      "const css = (parts) => parts.join(\"\")\nconst truncate = css`\n  white-space: nowrap;\n`",
    ],
  },
  {
    library: STYLED_COMPONENTS,
    patternKey: "call:keyframes:*",
    matches: [
      "import { keyframes } from \"styled-components\"\nconst rotate = keyframes`\n  from { transform: rotate(0deg); }\n`",
    ],
    rejects: [
      "const keyframes = (parts) => parts.join(\"\")\nconst rotate = keyframes`\n  from { transform: rotate(0deg); }\n`",
    ],
  },
  {
    library: STYLED_COMPONENTS,
    patternKey: "call:createGlobalStyle:*",
    matches: [
      "import { createGlobalStyle } from \"styled-components\"\nconst GlobalStyle = createGlobalStyle`\n  body { margin: 0; }\n`",
    ],
    rejects: [
      "const createGlobalStyle = (parts) => parts.join(\"\")\nconst GlobalStyle = createGlobalStyle`\n  body { margin: 0; }\n`",
    ],
  },
  {
    library: STYLED_COMPONENTS,
    patternKey: "element:ThemeProvider:*",
    matches: [
      "import { ThemeProvider } from \"styled-components\"\nconst app = <ThemeProvider theme={theme}><Card /></ThemeProvider>",
    ],
    rejects: [
      "const ThemeProvider = (props) => props.children\nconst app = <ThemeProvider theme={theme}><Card /></ThemeProvider>",
    ],
  },
]

const EMOTION = "Emotion"

export const emotionFixtures: readonly PatternFixture[] = [
  {
    library: EMOTION,
    patternKey: "factory:default@@emotion/styled:*",
    matches: [
      "import styled from \"@emotion/styled\"\nconst StyledLink = styled(Link)",
    ],
    rejects: [
      "const styled = (component) => component\nconst StyledLink = styled(Link)",
    ],
  },
  {
    library: EMOTION,
    patternKey: "factory:default@@emotion/styled:*>called",
    matches: [
      "import styled from \"@emotion/styled\"\nconst StyledLink = styled(Link)`\n  color: hotpink;\n`",
    ],
    rejects: [
      "const styled = (component) => component\nconst StyledLink = styled(Link)`\n  color: hotpink;\n`",
    ],
  },
  {
    library: EMOTION,
    patternKey: "call:default.*:*",
    matches: [
      "import styled from \"@emotion/styled\"\nconst Styled = styled.a`\n  color: palevioletred;\n`",
      "import styled from \"@emotion/styled\"\nconst Styled = styled.li`\n  color: palevioletred;\n`",
      "import styled from \"@emotion/styled\"\nconst Styled = styled.article`\n  color: palevioletred;\n`",
    ],
    rejects: [
      "const styled = makeLocalStyled()\nconst Styled = styled.span`\n  color: palevioletred;\n`",
    ],
  },
  {
    library: EMOTION,
    patternKey: "call:css:*",
    matches: [
      "import { css } from \"@emotion/css\"\nconst card = css`\n  padding: 32px;\n`",
    ],
    rejects: [
      "const css = (parts) => parts.join(\"\")\nconst card = css`\n  padding: 32px;\n`",
    ],
  },
  {
    library: EMOTION,
    patternKey: "call:keyframes:*",
    matches: [
      "import { keyframes } from \"@emotion/react\"\nconst bounce = keyframes`\n  from { transform: translate3d(0, 0, 0); }\n`",
    ],
    rejects: [
      "const keyframes = (parts) => parts.join(\"\")\nconst bounce = keyframes`\n  from { transform: translate3d(0, 0, 0); }\n`",
    ],
  },
  {
    library: EMOTION,
    patternKey: "call:cx:*",
    matches: [
      "import { cx } from \"@emotion/css\"\nconst className = cx(\"some-class\", highlighted)",
    ],
    rejects: [
      "const cx = (...names) => names.join(\" \")\nconst className = cx(\"some-class\", highlighted)",
    ],
  },
  {
    library: EMOTION,
    patternKey: "call:injectGlobal:*",
    matches: [
      "import { injectGlobal } from \"@emotion/css\"\ninjectGlobal`\n  body { margin: 0; }\n`",
    ],
    rejects: [
      "const injectGlobal = (parts) => parts.join(\"\")\ninjectGlobal`\n  body { margin: 0; }\n`",
    ],
  },
  {
    library: EMOTION,
    patternKey: "element:Global:*",
    matches: [
      "import { Global } from \"@emotion/react\"\nconst reset = <Global styles={{ body: { margin: 0 } }} />",
    ],
    rejects: [
      "const Global = (props) => null\nconst reset = <Global styles={{ body: { margin: 0 } }} />",
    ],
  },
  {
    library: EMOTION,
    patternKey: "element:ThemeProvider:*",
    matches: [
      "import { ThemeProvider } from \"@emotion/react\"\nconst app = <ThemeProvider theme={theme}><SomeText /></ThemeProvider>",
    ],
    rejects: [
      "const ThemeProvider = (props) => props.children\nconst app = <ThemeProvider theme={theme}><SomeText /></ThemeProvider>",
    ],
  },
]

const LINARIA = "Linaria"

export const linariaFixtures: readonly PatternFixture[] = [
  {
    library: LINARIA,
    patternKey: "factory:styled:*",
    matches: [
      "import { styled } from \"@linaria/react\"\nconst StyledCoolComponent = styled(CoolComponent)",
    ],
    rejects: [
      "const styled = (component) => component\nconst StyledCoolComponent = styled(CoolComponent)",
    ],
  },
  {
    library: LINARIA,
    patternKey: "factory:styled:*>called",
    matches: [
      "import { styled } from \"@linaria/react\"\nconst StyledCoolComponent = styled(CoolComponent)`\n  background-color: tomato;\n`",
    ],
    rejects: [
      "const styled = (component) => component\nconst StyledCoolComponent = styled(CoolComponent)`\n  background-color: tomato;\n`",
    ],
  },
  {
    library: LINARIA,
    patternKey: "call:styled.*:*",
    matches: [
      "import { styled } from \"@linaria/react\"\nconst Styled = styled.a`\n  color: palevioletred;\n`",
      "import { styled } from \"@linaria/react\"\nconst Styled = styled.li`\n  color: palevioletred;\n`",
      "import { styled } from \"@linaria/react\"\nconst Styled = styled.article`\n  color: palevioletred;\n`",
    ],
    rejects: [
      "const styled = makeLocalStyled()\nconst Styled = styled.span`\n  color: palevioletred;\n`",
    ],
  },
  {
    library: LINARIA,
    patternKey: "call:css:*",
    matches: [
      "import { css } from \"@linaria/core\"\nconst flower = css`\n  display: inline;\n`",
    ],
    rejects: [
      "const css = (parts) => parts.join(\"\")\nconst flower = css`\n  display: inline;\n`",
    ],
  },
  {
    library: LINARIA,
    patternKey: "call:cx:*",
    matches: [
      "import { cx } from \"@linaria/core\"\nconst className = cx(atomicCss, blueBackground)",
    ],
    rejects: [
      "const cx = (...names) => names.join(\" \")\nconst className = cx(atomicCss, blueBackground)",
    ],
  },
]

const VANILLA_EXTRACT = "vanilla-extract"

export const vanillaExtractFixtures: readonly PatternFixture[] = [
  {
    library: VANILLA_EXTRACT,
    patternKey: "call:style:*",
    matches: [
      "import { style } from \"@vanilla-extract/css\"\nexport const spin = style({ animationDuration: \"3s\" })",
    ],
    rejects: [
      "const style = (...parts) => parts\nexport const spin = style({ animationDuration: \"3s\" })",
    ],
  },
  {
    library: VANILLA_EXTRACT,
    patternKey: "call:styleVariants:*",
    matches: [
      "import { styleVariants } from \"@vanilla-extract/css\"\nexport const background = styleVariants({ primary: { background: \"blue\" } })",
    ],
    rejects: [
      "const styleVariants = (...parts) => parts\nexport const background = styleVariants({ primary: { background: \"blue\" } })",
    ],
  },
  {
    library: VANILLA_EXTRACT,
    patternKey: "call:globalStyle:*",
    matches: [
      "import { globalStyle } from \"@vanilla-extract/css\"\nglobalStyle(\"html, body\", { margin: 0 })",
    ],
    rejects: [
      "const globalStyle = (...parts) => parts\nglobalStyle(\"html, body\", { margin: 0 })",
    ],
  },
  {
    library: VANILLA_EXTRACT,
    patternKey: "call:keyframes:*",
    matches: [
      "import { keyframes } from \"@vanilla-extract/css\"\nconst rotate = keyframes({ \"0%\": { transform: \"rotate(0deg)\" } })",
    ],
    rejects: [
      "const keyframes = (...parts) => parts\nconst rotate = keyframes({ \"0%\": { transform: \"rotate(0deg)\" } })",
    ],
  },
  {
    library: VANILLA_EXTRACT,
    patternKey: "call:createTheme:*",
    matches: [
      "import { createTheme } from \"@vanilla-extract/css\"\nexport const [themeClass, vars] = createTheme({ color: { brand: \"blue\" } })",
    ],
    rejects: [
      "const createTheme = (...parts) => parts\nexport const [themeClass, vars] = createTheme({ color: { brand: \"blue\" } })",
    ],
  },
  {
    library: VANILLA_EXTRACT,
    patternKey: "call:createGlobalTheme:*",
    matches: [
      "import { createGlobalTheme } from \"@vanilla-extract/css\"\ncreateGlobalTheme(\":root\", vars, { color: { brand: \"blue\" } })",
    ],
    rejects: [
      "const createGlobalTheme = (...parts) => parts\ncreateGlobalTheme(\":root\", vars, { color: { brand: \"blue\" } })",
    ],
  },
  {
    library: VANILLA_EXTRACT,
    patternKey: "call:createThemeContract:*",
    matches: [
      "import { createThemeContract } from \"@vanilla-extract/css\"\nexport const vars = createThemeContract({ color: { brand: null } })",
    ],
    rejects: [
      "const createThemeContract = (...parts) => parts\nexport const vars = createThemeContract({ color: { brand: null } })",
    ],
  },
  {
    library: VANILLA_EXTRACT,
    patternKey: "call:recipe:*",
    matches: [
      "import { recipe } from \"@vanilla-extract/recipes\"\nexport const button = recipe({ base: { borderRadius: 6 } })",
    ],
    rejects: [
      "const recipe = (...parts) => parts\nexport const button = recipe({ base: { borderRadius: 6 } })",
    ],
  },
]

const STYLEX = "StyleX"

export const stylexFixtures: readonly PatternFixture[] = [
  {
    library: STYLEX,
    patternKey: "call:create:*",
    matches: [
      "import * as stylex from \"@stylexjs/stylex\"\nconst styles = stylex.create({ root: { padding: 10 } })",
    ],
    rejects: [
      "const stylex = makeLocalStylex()\nconst styles = stylex.create({ root: { padding: 10 } })",
    ],
  },
  {
    library: STYLEX,
    patternKey: "call:props:*",
    matches: [
      "import * as stylex from \"@stylexjs/stylex\"\nconst styleProps = stylex.props(styles.root, styles.element)",
    ],
    rejects: [
      "const stylex = makeLocalStylex()\nconst styleProps = stylex.props(styles.root, styles.element)",
    ],
  },
  {
    library: STYLEX,
    patternKey: "call:defineVars:*",
    matches: [
      "import * as stylex from \"@stylexjs/stylex\"\nexport const tokens = stylex.defineVars({ accent: \"blue\" })",
    ],
    rejects: [
      "const stylex = makeLocalStylex()\nexport const tokens = stylex.defineVars({ accent: \"blue\" })",
    ],
  },
  {
    library: STYLEX,
    patternKey: "call:createTheme:*",
    matches: [
      "import * as stylex from \"@stylexjs/stylex\"\nexport const darkTheme = stylex.createTheme(colors, { primary: \"lightblue\" })",
    ],
    rejects: [
      "const stylex = makeLocalStylex()\nexport const darkTheme = stylex.createTheme(colors, { primary: \"lightblue\" })",
    ],
  },
  {
    library: STYLEX,
    patternKey: "call:keyframes:*",
    matches: [
      "import * as stylex from \"@stylexjs/stylex\"\nconst pulse = stylex.keyframes({ \"0%\": { transform: \"scale(1)\" } })",
    ],
    rejects: [
      "const stylex = makeLocalStylex()\nconst pulse = stylex.keyframes({ \"0%\": { transform: \"scale(1)\" } })",
    ],
  },
]
