import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MatchBadge, matchTone } from "./match-label";

describe("MatchBadge", () => {
  it("shows the percentage large, with its label and count", () => {
    render(<MatchBadge label="Profile match" percent={71} detail="5 of 7 requirements" />);
    expect(screen.getByText("71%")).toBeInTheDocument();
    expect(screen.getByText("Profile match")).toBeInTheDocument();
    expect(screen.getByText("5 of 7 requirements")).toBeInTheDocument();
  });

  it("is green from 80%, amber from 60% and red below", () => {
    expect([95, 80, 79, 60, 59, 0].map(matchTone)).toEqual(["strong", "strong", "fair", "fair", "weak", "weak"]);
  });
});
