import App from "./app"
import { useBrowserPath } from "./browser-navigation"
import Playground from "./playground"
import { isPlaygroundPath } from "./playground-path"

const LabRoutes = () => {
  const { pathname, navigate, redirect } = useBrowserPath()
  return isPlaygroundPath(pathname) ? <Playground pathname={pathname} onNavigate={navigate} onRedirect={redirect} /> : <App />
}

export default LabRoutes
