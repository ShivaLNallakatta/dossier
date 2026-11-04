import { matchPercent, type MatchSummary } from "@/lib/application-data";
import { cn } from "@/lib/cn";
import type { ResumeMatch } from "@/lib/resume-match";

/**
 * How well an application matches its posting: "71% match · 5/7", the
 * percentage stronger the better it is. `compact` drops the word "match",
 * for a table column already headed Match.
 */
export function MatchLabel({ match, compact = false }: { match: MatchSummary; compact?: boolean }) {
  const percent = matchPercent(match);
  return (
    <span title={`${match.hit} of ${match.total} requirements covered by your profile`} className="tabular-nums">
      <span className={cn(percent >= 80 ? "font-semibold text-ink" : percent >= 60 ? "font-medium text-ink" : undefined)}>{percent}%</span>
      {compact ? ` · ${match.hit}/${match.total}` : ` match · ${match.hit}/${match.total}`}
    </span>
  );
}

/**
 * How much of the posting the tailored resume itself mentions: "Resume 82%",
 * strong the better it is, with what's missing in its tooltip. `compact`
 * drops the word "Resume", for a column already headed Resume.
 */
export function ResumeMatchLabel({ resume, compact = false }: { resume: ResumeMatch; compact?: boolean }) {
  const title = [
    `Your tailored resume mentions ${resume.hit} of the posting's ${resume.total} requirements`,
    resume.missing.length > 0 ? `Not in it yet: ${resume.missing.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(". ");
  return (
    <span title={title} className="tabular-nums">
      {!compact && "Resume "}
      <span className={cn(resume.percent >= 80 ? "font-semibold text-ink" : resume.percent >= 60 ? "font-medium text-ink" : undefined)}>
        {resume.percent}%
      </span>
    </span>
  );
}
