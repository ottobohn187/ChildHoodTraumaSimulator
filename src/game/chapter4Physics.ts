export type YellerRescueState = {
  elapsed: number;
  time: number;
  pace: number;
  rawDistance: number;
  distance: number;
};

export type YellerRescueOutcome = "running" | "won" | "lost";

export const YELLER_RESCUE_SECONDS = 90;

export function tapYellerRun(state: YellerRescueState): YellerRescueState {
  if (yellerRescueOutcome(state) !== "running") return state;
  return { ...state, pace: Math.min(100, state.pace + 30) };
}

export function stepYellerRescue(state: YellerRescueState, seconds: number): YellerRescueState {
  if (yellerRescueOutcome(state) !== "running") return state;
  const delta = Math.max(0, Math.min(seconds, state.time));
  const elapsed = Math.min(YELLER_RESCUE_SECONDS, state.elapsed + delta);
  const pace = Math.max(0, state.pace - 14 * delta);
  const averagePace = (state.pace + pace) / 2;
  const rawDistance = state.rawDistance + delta * (.45 + averagePace * .009);
  const timeGate = elapsed / YELLER_RESCUE_SECONDS * 100;
  return {
    elapsed,
    time: Math.max(0, YELLER_RESCUE_SECONDS - elapsed),
    pace,
    rawDistance,
    distance: Math.min(rawDistance, timeGate),
  };
}

export function yellerRescueOutcome(state: YellerRescueState): YellerRescueOutcome {
  if (state.time > 0) return "running";
  return state.rawDistance >= 100 ? "won" : "lost";
}
