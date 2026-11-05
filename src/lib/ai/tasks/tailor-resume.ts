import { z } from "zod";

import { unitsSchema, type Extracted, type Match, type Unit } from "@/lib/application-data";
import { publicationLabel } from "@/lib/citation";
import { documentLabels, ENGLISH_LABELS, languagesLine, type DocumentLabels } from "@/lib/document-labels";
import { bulletList, keyPoints, resumePublications, sameName, type ProfileData } from "@/lib/profile";

import { guardSources, guardUnits } from "../fact-guard";

import {
  applicationFacts,
  candidateFacts,
  CREATIVITY,
  jobForPrompt,
  KEY_POINTS,
  languageRule,
  NO_EM_DASHES,
  profileForPrompt,
  system,
  truthfulness,
  UNTRUSTED_POSTING,
  workHistoryForPrompt,
  workHistoryRule,
  type Task,
} from "./prompt-parts";

export const TAILOR_RESUME_VERSION = "tailor-resume@9";

const answerSchema = z.object({
  summary: z.string(),
  roles: z.array(z.object({ id: z.string(), bullets: z.array(z.string()) })),
  projects: z.array(z.object({ id: z.string(), bullets: z.array(z.string()) })),
  /** The profile's skills, most relevant first; leave out ones that don't help. */
  skills: z.array(z.string()),
  education: z.array(z.object({ id: z.string(), notes: z.string() })),
});

const INSTRUCTIONS = `You tailor a candidate's resume to one job, as JSON.

- summary: 2–3 sentences in the first person without "I" at the start of every sentence, about the candidate as this job would see them.
- roles: every role from the profile, by id, with 2–5 bullets each. Lead with what this job cares about, keep each bullet to one line, and start with a verb.
- projects: every project from the profile, by id, with 1–3 bullets each, written like the roles' bullets: what was built and what it shows that this job cares about.
- skills: the candidate's own skills, most relevant to this job first. Copy their names exactly; you may leave out ones that don't help.
- education: every entry by id, with its notes shortened or left empty. Notes are only for extras such as honors, a thesis or relevant coursework: the resume already shows the degree, school and dates, so never repeat them, and leave the notes empty when there's nothing else.
- The profile's publications go on the resume word for word, so don't answer with them; the summary may mention them.`;

/** SET-9: asked for when "Resume length" has a limit; anything still over is trimmed afterwards (E10-10). */
function pageFit(maxPages: number | null | undefined): string | null {
  if (maxPages === 1) {
    return "The resume has to fit on one page: keep the summary to two sentences, give the most relevant roles 3–4 bullets and older roles 2, and keep education and project notes to a few words.";
  }
  if (maxPages === 2) {
    return "The resume has to fit on two pages: keep the summary to three sentences, give the most relevant roles 4–5 bullets and older roles 2–3, and keep education and project notes short.";
  }
  return null;
}

export type TailorInput = {
  profile: ProfileData;
  extracted: Extracted;
  match: Match | null;
  /** What the candidate tells the AI for this application (APP-15). */
  facts: string[];
  /** The posting as pasted, for the fact guard. */
  posting: string;
};

/** APP-4: the tailored resume as units (summary, each role, each project, skills, each degree, each publication, languages). */
export const tailorResume: Task<TailorInput, Unit[]> = async (provider, { profile, extracted, match, facts, posting }, options) => {
  const answer = await provider.complete({
    system: system(
      INSTRUCTIONS,
      KEY_POINTS,
      pageFit(options.maxPages),
      truthfulness(options.strict),
      candidateFacts(profile, facts),
      workHistoryRule(profile),
      CREATIVITY[options.creativity],
      languageRule(options.language, options.market),
      UNTRUSTED_POSTING,
      NO_EM_DASHES,
    ),
    messages: [
      {
        role: "user",
        content: [
          `The candidate's profile:\n${profileForPrompt(profile)}`,
          workHistoryForPrompt(profile),
          `The job:\n${jobForPrompt(extracted, match)}`,
          applicationFacts(facts),
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    schema: answerSchema,
    schemaName: "tailored_resume",
    creativity: options.creativity,
    signal: options.signal,
  });
  // The languages line in the resume's language: the chosen one, or the posting's.
  const units = resumeUnits(profile, answer, documentLabels(options.language ?? extracted.language));
  // E6-6: in strict mode, note what the profile and posting don't back.
  return {
    data: options.strict ? guardUnits(units, guardSources(profile, extracted, posting, facts)) : units,
    promptVersion: TAILOR_RESUME_VERSION,
  };
};

/**
 * Turns the answer into units, trusting nothing: unknown roles, projects and
 * degrees are dropped, skills must be the profile's own, and a role or
 * project the model skipped keeps its bullets from the profile, and a key point (★) the model
 * left out goes back in, first (withKeyPoints). The publications and languages
 * come from the profile, publications word for word (#218), and languages with their levels in
 * the words of `labels`.
 */
export function resumeUnits(profile: ProfileData, answer: z.infer<typeof answerSchema>, labels: DocumentLabels = ENGLISH_LABELS): Unit[] {
  const roles = new Map(answer.roles.map((role) => [role.id, role.bullets]));
  const projects = new Map(answer.projects.map((project) => [project.id, project.bullets]));
  const notes = new Map(answer.education.map((entry) => [entry.id, entry.notes]));
  const skills = [
    ...new Set(answer.skills.flatMap((name) => profile.skills.find((skill) => sameName(skill.name, name))?.name ?? [])),
  ];
  const units: Unit[] = [
    { id: "summary", label: "Summary", text: answer.summary.trim() },
    ...profile.experience.map((entry) => {
      const bullets = withKeyPoints(roles.get(entry.id) ?? bulletList(entry.bullets), keyPoints(entry.bullets));
      return { id: `experience:${entry.id}`, label: `${entry.company || entry.role} role`, text: bullets.join("\n") };
    }),
    ...profile.projects.map((entry) => {
      const bullets = withKeyPoints(projects.get(entry.id) ?? bulletList(entry.bullets), keyPoints(entry.bullets));
      return { id: `project:${entry.id}`, label: `${entry.name || "Untitled"} project`, text: bullets.join("\n") };
    }),
    { id: "skills", label: "Skills", text: skills.join(" · ") },
    ...profile.education.map((entry) => ({
      id: `education:${entry.id}`,
      label: entry.degree || entry.school,
      text: (notes.get(entry.id) ?? entry.notes).trim(),
    })),
    ...resumePublications(profile.publications).map((entry) => ({
      id: `publication:${entry.id}`,
      label: publicationLabel(entry.citation),
      text: entry.citation.trim(),
    })),
    {
      id: "languages",
      label: "Languages",
      text: languagesLine(profile.languages, labels),
    },
  ];
  return unitsSchema.parse(units);
}

/** Lower-case words and numbers, for comparing a bullet with a key point. */
const tokens = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}$%.,+]+/gu)?.map((word) => word.replace(/[.,]+$/, "")) ?? [];
/** The numbers in a text, "$20M", "2–3%" and "4.5" included: a key point's figures have to survive. */
const numbers = (text: string): string[] => text.match(/\d+(?:[.,]\d+)?/g) ?? [];
const SMALL_WORDS = new Set(["a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "by", "with", "at", "from", "as", "its", "their"]);

/**
 * Whether a bullet says what a key point says: it keeps every number of the
 * key point, and most of its words. A tightened rewording counts; a bullet
 * about something else doesn't.
 */
export function coversKeyPoint(bullet: string, point: string): boolean {
  const said = tokens(bullet);
  if (!numbers(point).every((figure) => numbers(bullet).includes(figure))) return false;
  const words = [...new Set(tokens(point).filter((word) => !SMALL_WORDS.has(word)))];
  if (words.length === 0) return true;
  const kept = words.filter((word) => said.some((other) => other === word || (word.length > 4 && other.startsWith(word.slice(0, 5)))));
  return kept.length / words.length >= 0.6;
}

/**
 * A role's or project's bullets with its key points in them: each one the
 * model didn't keep goes back in, as written, ahead of the rest. Page
 * trimming cuts from the end, so they're the last to go.
 */
export function withKeyPoints(bullets: string[], points: string[]): string[] {
  const lines = bullets.map((line) => line.trim()).filter(Boolean);
  const missing = points.filter((point) => !lines.some((line) => coversKeyPoint(line, point)));
  return [...missing, ...lines];
}
