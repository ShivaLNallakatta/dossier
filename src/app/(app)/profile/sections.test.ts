import { describe, expect, it } from "vitest";

import { SECTIONS, sectionFromParam, sectionHref } from "./sections";

describe("profile sections", () => {
  it("come in the order Basics → Skills & languages → Experience → Projects → Education → Publications → References → Working resume → Facts about me", () => {
    expect(SECTIONS.map((section) => section.label)).toEqual([
      "Basics",
      "Skills & languages",
      "Experience",
      "Projects",
      "Education",
      "Publications",
      "References",
      "Working resume",
      "Facts about me",
    ]);
  });

  it("mark Projects, Publications, References, Working resume and Facts about me as optional (#216)", () => {
    expect(SECTIONS.filter((section) => section.optional).map((section) => section.id)).toEqual(["projects", "publications", "references", "history", "facts"]);
  });

  it("read the current section from the URL, falling back to Basics", () => {
    expect(sectionFromParam("experience")).toBe("experience");
    expect(sectionFromParam("facts")).toBe("facts");
    expect(sectionFromParam(undefined)).toBe("basics");
    expect(sectionFromParam("unknown")).toBe("basics");
    expect(sectionFromParam(["skills", "education"])).toBe("basics");
    expect(sectionHref("references")).toBe("/profile?section=references");
  });
});
