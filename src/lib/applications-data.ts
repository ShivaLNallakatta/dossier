import "server-only";

import { DocumentKind, type ApplicationStatus } from "@/generated/prisma/enums";
import { extractedSchema, matchSchema, matchScore, unitsSchema, type MatchSummary } from "@/lib/application-data";
import { sortRows, updatedAgo, type Sort } from "@/lib/applications-list";
import { formatCalendarDate, formatShortDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { resumeMatch, type ResumeMatch } from "@/lib/resume-match";

/** An application as the board and the table show it (E9-2, E9-3). */
export type ApplicationRow = {
  id: string;
  company: string;
  /** The role, or the title when there's no role. */
  role: string;
  location: string;
  mode: string;
  status: ApplicationStatus;
  archived: boolean;
  /** "Apply by" on draft cards, e.g. "3 Oct 2026". */
  deadline: string | null;
  /** Requirements covered (5/7) and the match percentage, or null when not matched. */
  match: MatchSummary | null;
  /** How much of the posting the tailored resume mentions, or null without a resume or requirements. */
  resume?: ResumeMatch | null;
  /** When it was sent, e.g. "18 Aug"; null while never sent. */
  sent: string | null;
  /** "Today", "3 days ago"… */
  updated: string;
  /** For the board, which shows the latest update first. */
  updatedAt: number;
};

/** Every application, archived ones only when asked for, sorted for the table; agent drafts once approved (#195). */
export async function loadApplicationRows({ archived, sort }: { archived: boolean; sort: Sort }, now = new Date()) {
  const applications = await prisma.application.findMany({
    where: { awaitingReview: false, ...(archived ? {} : { archivedAt: null }) },
    select: {
      id: true,
      title: true,
      company: true,
      role: true,
      location: true,
      mode: true,
      status: true,
      archivedAt: true,
      deadline: true,
      match: true,
      extracted: true,
      documents: { where: { kind: DocumentKind.RESUME }, select: { units: true } },
      sentAt: true,
      updatedAt: true,
    },
  });
  const rows = applications.map((application) => {
    const match = matchSchema.safeParse(application.match);
    const extracted = extractedSchema.safeParse(application.extracted);
    const units = unitsSchema.safeParse(application.documents[0]?.units);
    return {
      id: application.id,
      company: application.company.trim(),
      role: application.role.trim() || application.title.trim() || "Untitled application",
      location: application.location.trim(),
      mode: application.mode.trim(),
      status: application.status,
      archived: application.archivedAt !== null,
      deadline: application.deadline ? formatCalendarDate(application.deadline) : null,
      match: match.success && match.data.items.length > 0 ? matchScore(match.data) : null,
      resume: extracted.success && units.success ? resumeMatch(units.data, extracted.data.requirements) : null,
      sentAt: application.sentAt,
      updatedAt: application.updatedAt,
    };
  });
  return sortRows(rows, sort).map(({ sentAt, updatedAt, ...row }): ApplicationRow => ({
    ...row,
    sent: sentAt ? formatShortDate(sentAt, now) : null,
    updated: updatedAgo(updatedAt, now),
    updatedAt: updatedAt.getTime(),
  }));
}
