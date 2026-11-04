import { TAILOR_RESUME_VERSION } from "@/lib/ai/tasks/tailor-resume";

/**
 * Why a tailored resume is worth writing again (Write again): written by an
 * older release of Dossier's resume writing ("release"), or before the
 * profile last changed ("profile"); null when it's up to date.
 */
export type ResumeStale = "release" | "profile" | null;

export function resumeStaleness({
  writtenWith,
  writtenAt,
  profileChangedAt,
  current = TAILOR_RESUME_VERSION,
}: {
  /** The prompt version that wrote it, e.g. "tailor-resume@7"; null when unknown. */
  writtenWith: string | null;
  /** When it was last written as a whole: created, or written again. */
  writtenAt: Date | null;
  profileChangedAt: Date | null;
  current?: string;
}): ResumeStale {
  if (writtenWith !== null && writtenWith !== current) return "release";
  if (writtenAt && profileChangedAt && profileChangedAt > writtenAt) return "profile";
  return null;
}
