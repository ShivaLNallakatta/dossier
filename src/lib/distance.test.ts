import { describe, expect, it } from "vitest";

import { distanceLabel, usesMiles } from "./distance";

describe("search distances", () => {
  it("are kilometres outside the US", () => {
    expect(usesMiles("INTERNATIONAL")).toBe(false);
    expect(distanceLabel(25, "INTERNATIONAL")).toBe("25 km");
  });

  it("are friendly miles in the US", () => {
    expect(usesMiles("US")).toBe(true);
    expect([10, 25, 50, 100, 200].map((km) => distanceLabel(km, "US"))).toEqual(["5 mi", "15 mi", "30 mi", "60 mi", "125 mi"]);
  });
});
