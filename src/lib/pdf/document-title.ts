/**
 * A PDF's title, which PDF viewers show in their title bar or tab: the
 * candidate's name and what the document is, e.g. "Jane Doe – Resume".
 * Employers see it, so it never names Dossier or says "tailored".
 */
export function documentTitle(name: string, kind: "resume" | "letter"): string {
  const what = kind === "resume" ? "Resume" : "Cover Letter";
  const who = name.trim();
  return who ? `${who} – ${what}` : what;
}
