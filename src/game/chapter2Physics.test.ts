import { describe, expect, it } from "vitest";
import { battleOutcome, rexAttack, tailStrike } from "./chapter2Physics";

describe("chapter 2 battle", () => {
  it("tail strikes reduce the predator's health", () => {
    expect(tailStrike({ motherHealth: 100, rexHealth: 100 }).rexHealth).toBe(92);
  });

  it("predator attacks reduce the mother's health", () => {
    expect(rexAttack({ motherHealth: 100, rexHealth: 100 }).motherHealth).toBe(89);
  });

  it("reports either combat ending", () => {
    expect(battleOutcome({ motherHealth: 50, rexHealth: 0 })).toBe("won");
    expect(battleOutcome({ motherHealth: 0, rexHealth: 50 })).toBe("lost");
  });
});
