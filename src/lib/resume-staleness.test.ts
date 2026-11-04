import { describe, expect, it } from "vitest";

import { resumeStaleness } from "./resume-staleness";

const written = new Date("2026-11-01T10:00:00Z");
const before = new Date("2026-10-30T10:00:00Z");
const after = new Date("2026-11-03T10:00:00Z");

describe("resumeStaleness", () => {
  it("is up to date when written by this release after the last profile change", () => {
    expect(resumeStaleness({ writtenWith: "tailor-resume@8", writtenAt: written, profileChangedAt: before, current: "tailor-resume@8" })).toBeNull();
  });

  it("says an older release wrote it, before anything else", () => {
    expect(resumeStaleness({ writtenWith: "tailor-resume@7", writtenAt: written, profileChangedAt: after, current: "tailor-resume@8" })).toBe("release");
  });

  it("says the profile changed since it was written", () => {
    expect(resumeStaleness({ writtenWith: "tailor-resume@8", writtenAt: written, profileChangedAt: after, current: "tailor-resume@8" })).toBe("profile");
  });

  it("doesn't guess without dates or a version", () => {
    expect(resumeStaleness({ writtenWith: null, writtenAt: null, profileChangedAt: after })).toBeNull();
    expect(resumeStaleness({ writtenWith: null, writtenAt: written, profileChangedAt: null })).toBeNull();
  });
});
