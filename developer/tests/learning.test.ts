import { describe, expect, it } from "vitest";
import { day, nextReview } from "../src/lib/learning";
import type { Review } from "../src/lib/types";
describe("review rules", () => {
  it("uses Seoul calendar day at UTC day boundary", () =>
    expect(day(new Date("2026-11-07T16:00:00Z"))).toBe("2026-11-08"));
  it("schedules wrong, 1st, 2nd, 3rd correct as 1/3/7/14 days and resets on failure", () => {
    const now = new Date("2026-11-07T01:00:00Z");
    let prior: Review | undefined;
    const values: [[boolean, string], ...Array<[boolean, string]>] = [
      [false, "2026-11-08"],
      [true, "2026-11-10"],
      [true, "2026-11-14"],
      [true, "2026-11-21"],
      [true, "2026-11-21"],
      [false, "2026-11-08"],
    ];
    for (const [correct, due] of values) {
      const next = nextReview(prior, correct, now);
      expect(next.due).toBe(due);
      prior = {
        userId: "one",
        packId: "pack",
        revisionId: "v1",
        itemId: "q1",
        kind: "question",
        ...next,
      };
    }
    expect(prior!.streak).toBe(0);
  });
  it("handles month and year boundaries", () =>
    expect(
      nextReview(undefined, false, new Date("2026-12-31T01:00:00Z")).due,
    ).toBe("2027-01-01"));
});
