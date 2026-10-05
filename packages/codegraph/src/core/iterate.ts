export const iterateUntil = <State>(initial: State, isDone: (state: State) => boolean, step: (state: State) => State): State => {
  for (let state = initial; ; state = step(state)) {
    if (isDone(state)) return state
  }
}
