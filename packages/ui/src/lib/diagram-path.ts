export interface Point {
  readonly x: number
  readonly y: number
}

const HALF = 2
const WITHIN_RING_BULGE = 44

const midpointOf = (first: Point, second: Point): Point => ({
  x: Math.round((first.x + second.x) / HALF),
  y: Math.round((first.y + second.y) / HALF),
})

const at = ({ x, y }: Point): string => `${String(x)} ${String(y)}`

export const pointBeyondEnd = (points: readonly Point[], distance: number): Point => {
  const end = points[points.length - 1]
  const before = points.length > 1 ? points[points.length - HALF] : end
  const length = Math.hypot(end.x - before.x, end.y - before.y)
  if (length === 0) return end
  return {
    x: Math.round(end.x + ((end.x - before.x) / length) * distance),
    y: Math.round(end.y + ((end.y - before.y) / length) * distance),
  }
}

export const smoothPath = (points: readonly Point[]): string => {
  const [start, ...rest] = points
  if (points.length <= HALF) return points.map((point, position) => `${position === 0 ? "M" : "L"} ${at(point)}`).join(" ")
  const curves = rest.slice(0, -1).map((control, position) => {
    const following = rest.slice(position + 1)
    const [next] = following
    return `Q ${at(control)} ${at(following.length === 1 ? next : midpointOf(control, next))}`
  })
  return [`M ${at(start)}`, ...curves].join(" ")
}

export const acrossPath = (points: readonly Point[]): string => {
  const [start, end] = points
  const middleX = midpointOf(start, end).x
  return `M ${at(start)} C ${at({ x: middleX, y: start.y })} ${at({ x: middleX, y: end.y })} ${at(end)}`
}

export const withinPath = (points: readonly Point[]): string => {
  const [start, end] = points
  const bulgeX = Math.max(start.x, end.x) + WITHIN_RING_BULGE
  return `M ${at(start)} C ${at({ x: bulgeX, y: start.y })} ${at({ x: bulgeX, y: end.y })} ${at(end)}`
}
