import { describe, expect, it } from "vitest";
import { DIP_RESCUE_SECONDS, dipRescueOutcome, stepDipRescue, tapRun, type DipRescueState } from "./chapter3Physics";

describe("chapter 3 dip rescue", () => {
  const start = (): DipRescueState => ({ distance: 0, time: DIP_RESCUE_SECONDS, danger: 0 });

  it("requires forty presses to cross the factory", () => {
    let state = start();
    for (let i = 0; i < 39; i++) state = tapRun(state);
    expect(dipRescueOutcome(state)).toBe("running");
    state = tapRun(state);
    expect(dipRescueOutcome(state)).toBe("won");
  });

  it("lowers the toon toward the Dip as time passes", () => {
    const state = stepDipRescue(start(), 11);
    expect(state.time).toBe(11);
    expect(state.danger).toBeCloseTo(50);
  });

  it("loses when the Dip danger reaches the cage", () => {
    expect(dipRescueOutcome(stepDipRescue(start(), DIP_RESCUE_SECONDS))).toBe("lost");
  });
});
