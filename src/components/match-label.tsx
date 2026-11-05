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
      <span className={cn("font-semibold", TEXT[matchTone(percent)])}>{percent}%</span>
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
      <span className={cn("font-semibold", TEXT[matchTone(resume.percent)])}>
        {resume.percent}%
      </span>
    </span>
  );
}

/** Green from 80%, amber from 60%, red below: how a match is colored where it's shown large. */
export function matchTone(percent: number): "strong" | "fair" | "weak" {
  return percent >= 80 ? "strong" : percent >= 60 ? "fair" : "weak";
}

const TEXT = { strong: "text-success", fair: "text-warning", weak: "text-danger" } as const;

const TONE = {
  strong: "border-success-line bg-success-surface text-success",
  fair: "border-warning-line bg-warning-surface text-warning",
  weak: "border-danger-line bg-danger-surface text-danger",
} as const;

/**
 * A match shown large at the top of an application: the percentage big and
 * colored by how good it is, with what it counts under it. Used for the
 * profile match ("Profile match · 5/7") and the tailored resume's own match.
 */
export function MatchBadge({ label, percent, detail, title }: { label: string; percent: number; detail: string; title?: string }) {
  const tone = matchTone(percent);
  return (
    <div
      title={title}
      data-tone={tone}
      className={cn("flex items-center gap-3 rounded-xl border px-4 py-2", TONE[tone])}
    >
      <span className="font-serif text-[34px] leading-none font-semibold tabular-nums">{percent}%</span>
      <span className="flex flex-col text-meta leading-tight">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums opacity-80">{detail}</span>
      </span>
    </div>
  );
}
