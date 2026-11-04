import type { Requirement, Unit } from "@/lib/application-data";

// How well a tailored resume itself answers its posting: which of the
// posting's requirements its text mentions. The profile match (matchScore)
// says what the candidate has; this says what the resume shows, so a skill
// left off the resume counts as missing here even when the profile has it.
// Worked out from the text alone, without the AI, so it follows every edit.

export type ResumeMatch = {
  /** Requirements the resume mentions, out of `total`. */
  hit: number;
  total: number;
  percent: number;
  /** What the resume doesn't mention yet, in the posting's terms: "BigQuery", "Dutch", "8+ years". */
  missing: string[];
};

const SMALL_WORDS = new Set(
  "a an the and or of to in on for by with at from as is are be our you your we this that these those using use used experience experienced knowledge strong solid good great proven ability able skills skill working work plus etc".split(
    " ",
  ),
);
const VENDORS = /^(azure|microsoft|aws|amazon|google|gcp|apache|ms)\s+/;

/** Lower case, with only letters, digits and the marks names use (C#, C++, Node.js), on single spaces. */
const plain = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}#+.\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether `text` (already plain) has `term` as a whole word or phrase, plural or not. */
function hasTerm(text: string, term: string): boolean {
  const word = plain(term).replace(/\.$/, "");
  if (!word) return false;
  return new RegExp(`(?<![\\p{L}\\p{N}])${escape(word)}(s|es)?(?![\\p{L}\\p{N}#+])`, "u").test(text);
}

/** "Azure Kubernetes Service (AKS)" can be written as itself, "Kubernetes Service" or "AKS". */
function variants(name: string): string[] {
  const match = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(name.trim());
  const names = match ? [match[1], match[2], name] : [name];
  return [...new Set(names.flatMap((entry) => [entry, plain(entry).replace(VENDORS, "")]))].filter((entry) => entry.trim());
}

const mentions = (text: string, name: string) => variants(name).some((variant) => hasTerm(text, variant));

/** The most years of experience the resume claims anywhere ("15+ years", "8 years of"), or 0. */
function yearsClaimed(text: string): number {
  return Math.max(0, ...[...text.matchAll(/(\d{1,2})\s*\+?\s*(?:years|yrs)/g)].map((found) => Number(found[1])));
}

/** For a requirement in other words: most of its own words are in the resume. */
function mostWordsIn(text: string, requirement: string): boolean {
  const words = [...new Set(plain(requirement).split(" ").filter((word) => word.length > 2 && !SMALL_WORDS.has(word) && !/^\d+$/.test(word)))];
  if (words.length === 0) return false;
  const found = words.filter((word) => hasTerm(text, word) || (word.length > 5 && text.includes(word.slice(0, 5))));
  return found.length / words.length >= 0.5;
}

/** How the posting names a requirement for "Not in your resume yet". */
function shortName(requirement: Requirement): string {
  if (requirement.kind === "skill" && requirement.skill) return requirement.skill;
  if (requirement.kind === "language" && requirement.language) return requirement.language;
  if (requirement.kind === "years" && requirement.years) return `${requirement.years}+ years`;
  return requirement.text.trim();
}

/** Whether the resume's text answers one requirement. */
export function resumeCovers(text: string, requirement: Requirement): boolean {
  switch (requirement.kind) {
    case "skill":
      return (requirement.skill ? mentions(text, requirement.skill) : false) || mostWordsIn(text, requirement.text);
    case "language":
      return requirement.language ? mentions(text, requirement.language) : mostWordsIn(text, requirement.text);
    case "years":
      return requirement.years !== null && yearsClaimed(text) >= requirement.years;
    default:
      return mostWordsIn(text, requirement.text);
  }
}

/**
 * Which of the posting's requirements the tailored resume mentions, or null
 * when there's no resume or no requirements to check it against.
 */
export function resumeMatch(units: readonly Unit[] | null | undefined, requirements: readonly Requirement[]): ResumeMatch | null {
  if (!units || units.length === 0 || requirements.length === 0) return null;
  const text = plain(units.map((unit) => unit.text).join("\n"));
  const missing = requirements.filter((requirement) => !resumeCovers(text, requirement)).map(shortName);
  const hit = requirements.length - missing.length;
  return { hit, total: requirements.length, percent: Math.round((hit / requirements.length) * 100), missing };
}
