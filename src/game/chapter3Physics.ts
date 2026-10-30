export type DipRescueState = {
  distance: number;
  time: number;
  danger: number;
};

export type DipRescueOutcome = "running" | "won" | "lost";

export const DIP_RESCUE_SECONDS = 22;
export const RUN_PER_PRESS = 2.5;

export function tapRun(state: DipRescueState): DipRescueState {
  if (dipRescueOutcome(state) !== "running") return state;
  return { ...state, distance: Math.min(100, state.distance + RUN_PER_PRESS) };
}

export function stepDipRescue(state: DipRescueState, seconds: number): DipRescueState {
  if (dipRescueOutcome(state) !== "running") return state;
  const elapsed = Math.max(0, seconds);
  return {
    ...state,
    time: Math.max(0, state.time - elapsed),
    danger: Math.min(100, state.danger + elapsed * (100 / DIP_RESCUE_SECONDS)),
  };
}

export function dipRescueOutcome(state: DipRescueState): DipRescueOutcome {
  if (state.distance >= 100) return "won";
  if (state.time <= 0 || state.danger >= 100) return "lost";
  return "running";
}
