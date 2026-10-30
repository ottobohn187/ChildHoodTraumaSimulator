import { describe, expect, it } from "vitest";
import { YELLER_RESCUE_SECONDS, stepYellerRescue, tapYellerRun, yellerRescueOutcome, type YellerRescueState } from "./chapter4Physics";

const start = (): YellerRescueState => ({ elapsed: 0, time: YELLER_RESCUE_SECONDS, pace: 0, rawDistance: 0, distance: 0 });

function simulate(tapUntil: number, tapEvery = 1.5) {
  let state = start();
  let nextTap = 0;
  while (state.time > 0) {
    if (state.elapsed <= tapUntil && state.elapsed >= nextTap) {
      state = tapYellerRun(state);
      nextTap += tapEvery;
    }
    state = stepYellerRescue(state, .1);
  }
  return state;
}

describe("chapter 4 sustained vaccine run", () => {
  it("rewards maintaining the run for the full ninety seconds", () => {
    expect(yellerRescueOutcome(simulate(90))).toBe("won");
  });

  it("does not allow an early burst to carry the whole rescue", () => {
    expect(yellerRescueOutcome(simulate(15))).toBe("lost");
  });

  it("time-gates arrival so the rescue cannot finish before the shot moment", () => {
    let state = start();
    for (let i = 0; i < 300; i++) state = tapYellerRun(state);
    state = stepYellerRescue(state, 30);
    expect(state.distance).toBeLessThanOrEqual(100 / 3);
    expect(yellerRescueOutcome(state)).toBe("running");
  });
});
