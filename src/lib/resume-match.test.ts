import { describe, expect, it } from "vitest";

import type { Requirement, Unit } from "@/lib/application-data";

import { resumeMatch } from "./resume-match";

const units: Unit[] = [
  { id: "summary", label: "Summary", text: "Senior Data Engineer with 15+ years building Azure and Databricks lakehouses." },
  { id: "experience:e1", label: "Simetric role", text: "Led migration of terabyte-scale data from SQL Server to Unity Catalog\nBuilt Airflow DAGs on AKS" },
  { id: "skills", label: "Skills", text: "Python · PySpark · Azure Kubernetes Service (AKS) · Power BI · Apache Spark" },
  { id: "languages", label: "Languages", text: "English: Fluent (C2)" },
];

const requirement = (kind: Requirement["kind"], text: string, extra: Partial<Requirement> = {}): Requirement => ({
  kind,
  text,
  skill: null,
  years: null,
  language: null,
  ...extra,
});

describe("resumeMatch", () => {
  it("counts the requirements the resume's text mentions, and names the ones it doesn't", () => {
    expect(
      resumeMatch(units, [
        requirement("skill", "Hands-on BigQuery", { skill: "BigQuery" }),
        requirement("skill", "Spark", { skill: "Spark" }),
        requirement("skill", "Kubernetes", { skill: "Kubernetes" }),
        requirement("skill", "Airflow orchestration", { skill: "Apache Airflow" }),
        requirement("years", "8+ years of data engineering", { years: 8 }),
        requirement("years", "20 years", { years: 20 }),
        requirement("language", "English", { language: "English" }),
        requirement("other", "Experience migrating legacy SQL Server workloads"),
        requirement("other", "Looker dashboards for stakeholders"),
        requirement("skill", "C#", { skill: "C#" }),
      ]),
    ).toEqual({ hit: 6, total: 10, percent: 60, missing: ["BigQuery", "20+ years", "Looker dashboards for stakeholders", "C#"] });
  });

  it("has nothing to say without a resume or requirements", () => {
    expect(resumeMatch(null, [requirement("skill", "Spark", { skill: "Spark" })])).toBeNull();
    expect(resumeMatch(units, [])).toBeNull();
  });
});
