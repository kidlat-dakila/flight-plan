import cIcon from "./icons/c.svg"
import cppIcon from "./icons/cpp.svg"
import csharpIcon from "./icons/csharp.svg"
import cssIcon from "./icons/css.svg"
import dockerIcon from "./icons/docker.svg"
import htmlIcon from "./icons/html.svg"
import javaIcon from "./icons/java.svg"
import javascriptIcon from "./icons/javascript.svg"
import kotlinIcon from "./icons/kotlin.svg"
import phpIcon from "./icons/php.svg"
import pythonIcon from "./icons/python.svg"
import reactIcon from "./icons/react.svg"
import rubyIcon from "./icons/ruby.svg"
import sassIcon from "./icons/sass.svg"
import svelteIcon from "./icons/svelte.svg"
import swiftIcon from "./icons/swift.svg"
import typescriptIcon from "./icons/typescript.svg"
import vueIcon from "./icons/vue.svg"
import type { FileIconKind } from "./kinds"

const pictureIcons: Readonly<Partial<Record<FileIconKind, string>>> = {
  c: cIcon,
  cpp: cppIcon,
  csharp: csharpIcon,
  css: cssIcon,
  docker: dockerIcon,
  html: htmlIcon,
  java: javaIcon,
  javascript: javascriptIcon,
  kotlin: kotlinIcon,
  php: phpIcon,
  python: pythonIcon,
  react: reactIcon,
  ruby: rubyIcon,
  sass: sassIcon,
  svelte: svelteIcon,
  swift: swiftIcon,
  typescript: typescriptIcon,
  vue: vueIcon,
}

export default pictureIcons
