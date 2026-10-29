import { describe, expect, it } from "vitest";

import { documentTitle } from "./document-title";

describe("a PDF's title", () => {
  it("names the candidate and the document, never the app", () => {
    expect(documentTitle("Jane Doe", "resume")).toBe("Jane Doe – Resume");
    expect(documentTitle(" Jane Doe ", "letter")).toBe("Jane Doe – Cover Letter");
  });

  it("is just the document without a name", () => {
    expect(documentTitle("", "resume")).toBe("Resume");
  });
});
