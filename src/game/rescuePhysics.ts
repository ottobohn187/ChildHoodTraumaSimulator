export interface RescueState { depth: number; stamina: number; time: number; }

export type RescuePhase = "struggle" | "extract" | "release";

export function rescuePhase(audioSeconds: number): RescuePhase {
  if (audioSeconds < 80) return "struggle";
  if (audioSeconds < 109) return "extract";
  return "release";
}

export function canRescue(audioSeconds: number, effort: number, depth: number): boolean {
  return rescuePhase(audioSeconds) === "release" && effort >= 55 && depth <= 5;
}

export function tapPull(state: RescueState): RescueState {
  if (state.stamina < 6) return state;
  return {
    ...state,
    depth: PhaserMathClamp(state.depth - 2.4, 0, 100),
    stamina: PhaserMathClamp(state.stamina - 6, 0, 100),
  };
}

export function stepTapRescue(state: RescueState, deltaSeconds: number): RescueState {
  const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);
  return {
    depth: PhaserMathClamp(state.depth + 3.2 * dt, 0, 100),
    stamina: PhaserMathClamp(state.stamina + 15 * dt, 0, 100),
    time: Math.max(0, state.time - dt),
  };
}

export function stepRescue(state: RescueState, pulling: boolean, deltaSeconds: number): RescueState {
  const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);
  const stamina = PhaserMathClamp(state.stamina + (pulling ? -14 : 10) * dt, 0, 100);
  const pullRate = pulling ? (stamina < 15 ? 9 * 0.35 : 9) : 0;
  return {
    depth: PhaserMathClamp(state.depth + (5 - pullRate) * dt, 0, 100),
    stamina,
    time: Math.max(0, state.time - dt),
  };
}

function PhaserMathClamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
