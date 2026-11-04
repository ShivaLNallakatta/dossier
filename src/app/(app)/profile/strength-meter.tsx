"use client";

import { useId } from "react";

import { profileStrength, type ProfileData } from "@/lib/profile";
import { profileChecks } from "@/lib/profile-checks";

/**
 * "Profile strength" with a progress bar and an encouraging hint (PRO-9),
 * then anything worth fixing before it goes on a resume (profileChecks).
 */
export function StrengthMeter({ profile }: { profile: ProfileData }) {
  const labelId = useId();
  const hintId = useId();
  const { percent, hint } = profileStrength({
    basics: profile.basics,
    experience: profile.experience.length,
    education: profile.education.length,
    skills: profile.skills.length,
  });
  const checks = profileChecks(profile);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-meta">
        <span id={labelId} className="text-muted">
          Profile strength
        </span>
        <span className="font-medium tabular-nums">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-describedby={hintId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p id={hintId} className="text-label text-muted">
        {hint}
      </p>
      {checks.length > 0 && (
        <div role="note" aria-label="Worth fixing" className="flex flex-col gap-1.5 rounded-card bg-warning-surface px-3 py-2.5 text-label text-warning">
          <p className="font-medium">Worth fixing</p>
          <ul className="flex list-disc flex-col gap-1.5 ps-4">
            {checks.map((check) => (
              <li key={check.id}>{check.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
