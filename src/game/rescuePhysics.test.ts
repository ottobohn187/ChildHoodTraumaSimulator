import { describe, expect, it } from "vitest";
import { canRescue, rescuePhase, stepRescue, stepTapRescue, tapPull } from "./rescuePhysics";

describe("rescue physics", () => {
  it("raises the pony when pulling with stamina", () => {
    expect(stepRescue({ depth: 55, stamina: 100, time: 60 }, true, 1).depth).toBeLessThan(55);
  });
  it("sinks and recovers stamina while resting", () => {
    const next = stepRescue({ depth: 55, stamina: 50, time: 60 }, false, 1);
    expect(next.depth).toBeGreaterThan(55);
    expect(next.stamina).toBeGreaterThan(50);
  });
  it("moves the pony upward on each discrete pull", () => {
    expect(tapPull({ depth: 55, stamina: 100, time: 30 }).depth).toBeLessThan(55);
  });
  it("lets the pony sink between pulls", () => {
    expect(stepTapRescue({ depth: 55, stamina: 100, time: 30 }, .05).depth).toBeGreaterThan(55);
  });
  it("unlocks extraction and release at the music cues", () => {
    expect(rescuePhase(79.9)).toBe("struggle");
    expect(rescuePhase(80)).toBe("extract");
    expect(rescuePhase(109)).toBe("release");
  });
  it("requires sustained effort before the final release", () => {
    expect(canRescue(109, 54, 4)).toBe(false);
    expect(canRescue(109, 55, 5)).toBe(true);
  });
});
