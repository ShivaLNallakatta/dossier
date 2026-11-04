import type { ProfileData } from "@/lib/profile";

// Things in a profile that read badly on a resume, though nothing is missing:
// a name without a surname, a summary about yourself in the third person,
// and the same skill listed twice under two names. Shown under the profile
// strength so they're fixed where they're written.

export type ProfileCheck = {
  /** Stable, for React keys and tests. */
  id: string;
  /** What to change, in a sentence or two. */
  message: string;
};

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean);

/** A name of one word, like "Shiva", which a resume header prints on its own. */
function oneWordName(name: string): boolean {
  return words(name).length === 1;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A summary that talks about its owner by name ("Shiva is an accomplished…"),
 * as a bio does. Resumes leave the name out: "Data engineer with 15+ years…".
 */
function thirdPersonSummary(summary: string, name: string): boolean {
  const first = words(name)[0];
  if (!first || first.length < 2) return false;
  // The first name, perhaps with a surname or two, then a verb about them; or "Shiva's".
  const byName = new RegExp(`^\\s*${escape(first)}(\\s+\\S+){0,2}\\s+(is|has|was|brings|leads|holds)\\b`, "iu");
  const possessive = new RegExp(`^\\s*${escape(first)}['’]s\\b`, "iu");
  return byName.test(summary) || possessive.test(summary);
}

const VENDORS = /^(azure|microsoft|aws|amazon|google|gcp|apache|ms)\s+/;

/** A skill's name compared loosely: lower case, without a vendor in front or a plural at the end. */
function loose(name: string): string {
  const plain = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#.\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(VENDORS, "");
  return plain.length > 3 ? plain.replace(/s$/, "") : plain;
}

/** "Azure Kubernetes Service (AKS)" is ["Azure Kubernetes Service", "AKS"]; "Figma" is ["Figma"]. */
function namesOf(skill: string): string[] {
  const match = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(skill.trim());
  return (match ? [match[1], match[2]] : [skill]).map(loose).filter(Boolean);
}

/** Pairs of skills that are probably the same one under two names, in the profile's order. */
export function similarSkills(skills: readonly { name: string }[]): [string, string][] {
  const pairs: [string, string][] = [];
  skills.forEach((a, index) => {
    const aNames = namesOf(a.name);
    for (const b of skills.slice(index + 1)) {
      const bNames = namesOf(b.name);
      if (aNames.some((name) => bNames.includes(name))) pairs.push([a.name.trim(), b.name.trim()]);
    }
  });
  return pairs;
}

/** What's worth fixing in the profile before it goes on a resume. */
export function profileChecks(profile: Pick<ProfileData, "basics" | "skills">): ProfileCheck[] {
  const { name, summary } = profile.basics;
  const checks: ProfileCheck[] = [];
  if (oneWordName(name)) {
    checks.push({
      id: "name",
      message: `Add your full name. Resumes print it as written, so “${name.trim()}” appears on its own.`,
    });
  }
  if (summary.trim() && thirdPersonSummary(summary, name)) {
    checks.push({
      id: "summary",
      message: `Your summary talks about you by name. Resumes usually leave the name and “I” out: “Data engineer with 15 years…”.`,
    });
  }
  for (const [a, b] of similarSkills(profile.skills)) {
    checks.push({
      id: `skills:${a}|${b}`,
      message: `“${a}” and “${b}” look like the same skill. Keep one, so the Skills section doesn't repeat itself.`,
    });
  }
  return checks;
}
