const PLAYING_CLASS = "is-playing"

export const prefersReducedMotion = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches

export const playVideo = async (video: HTMLVideoElement): Promise<boolean> => {
  video.addEventListener("playing", () => {
    video.classList.add(PLAYING_CLASS)
  }, { once: true })
  try {
    await video.play()
    return true
  } catch {
    return false
  }
}
