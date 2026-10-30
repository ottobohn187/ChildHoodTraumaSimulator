export interface BattleState { motherHealth: number; rexHealth: number; }

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function tailStrike(state: BattleState): BattleState {
  return { ...state, rexHealth: clamp(state.rexHealth - 8) };
}

export function rexAttack(state: BattleState): BattleState {
  return { ...state, motherHealth: clamp(state.motherHealth - 11) };
}

export function battleOutcome(state: BattleState): "fighting" | "won" | "lost" {
  if (state.rexHealth <= 0) return "won";
  if (state.motherHealth <= 0) return "lost";
  return "fighting";
}
