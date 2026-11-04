import { describe, expect, it } from "vitest";

import { BASICS_FIELDS, type ProfileData } from "@/lib/profile";

import { profileChecks, similarSkills } from "./profile-checks";

const basics = (values: Partial<ProfileData["basics"]>): ProfileData["basics"] => ({
  ...(Object.fromEntries(BASICS_FIELDS.map((field) => [field, ""])) as Record<(typeof BASICS_FIELDS)[number], string>),
  showAge: false,
  ...values,
});
const skills = (...names: string[]) => names.map((name, index) => ({ id: `s${index}`, name }));
const ids = (profile: Pick<ProfileData, "basics" | "skills">) => profileChecks(profile).map((check) => check.id);

describe("profileChecks", () => {
  it("finds nothing to fix in a good profile, or an empty one", () => {
    expect(ids({ basics: basics({ name: "Jane Doe", summary: "Senior product designer with nine years…" }), skills: skills("Figma", "Prototyping") })).toEqual([]);
    expect(ids({ basics: basics({}), skills: [] })).toEqual([]);
  });

  it("asks for a full name when there's only one word", () => {
    const [check] = profileChecks({ basics: basics({ name: " Shiva " }), skills: [] });
    expect(check).toEqual({ id: "name", message: "Add your full name. Resumes print it as written, so “Shiva” appears on its own." });
  });

  it("notices a summary that talks about its owner by name", () => {
    const summary = (name: string, text: string) => ids({ basics: basics({ name, summary: text }), skills: [] }).includes("summary");
    expect(summary("Shiva Nallakatta", "Shiva is an accomplished Data Engineer with over 15 years…")).toBe(true);
    expect(summary("Shiva Nallakatta", "Shiva Nallakatta has built data platforms for…")).toBe(true);
    expect(summary("Shiva Nallakatta", "Shiva’s work spans lakehouses and streaming.")).toBe(true);
    expect(summary("Shiva Nallakatta", "Senior Data Engineer with 15+ years. Shiva led a team that is…")).toBe(false);
    expect(summary("Jane Doe", "Designer who is happiest in the details.")).toBe(false);
  });

  it("names skills that are probably the same one twice", () => {
    expect(profileChecks({ basics: basics({ name: "Jane Doe" }), skills: skills("AKS", "Azure Kubernetes Service (AKS)") })).toEqual([
      {
        id: "skills:AKS|Azure Kubernetes Service (AKS)",
        message: "“AKS” and “Azure Kubernetes Service (AKS)” look like the same skill. Keep one, so the Skills section doesn't repeat itself.",
      },
    ]);
  });
});

describe("similarSkills", () => {
  it("matches short forms, vendors in front and plurals, but not related skills", () => {
    expect(
      similarSkills(
        skills("Event Hub", "Azure Event Hubs", "Kusto", "Data Explorer (Kusto)", "Azure Data Explorer", "Apache Spark", "Spark", "Databricks", "Databricks Structured Streaming", "SQL", "SQL Server", "Cosmos DB", "Cosmos Big Data"),
      ),
    ).toEqual([
      ["Event Hub", "Azure Event Hubs"],
      ["Kusto", "Data Explorer (Kusto)"],
      ["Data Explorer (Kusto)", "Azure Data Explorer"],
      ["Apache Spark", "Spark"],
    ]);
  });
});
