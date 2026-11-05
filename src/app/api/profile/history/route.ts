import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { HISTORY_KEY, HISTORY_MAX_CHARACTERS } from "@/lib/profile";
import { RESUME_MAX_BYTES, RESUME_MESSAGES, resumeText } from "@/lib/resume-text";
import { route } from "@/lib/route";

/**
 * Reads a working resume from a file (PDF, Word, Markdown or text), sent as
 * the request body, and keeps its text as the profile's working resume. No
 * AI: the text is kept as it is, for tailoring to draw from. A route
 * handler, since Server Actions take at most 1 MB.
 */
export const POST = route(async (request) => {
  if (Number(request.headers.get("content-length") ?? 0) > RESUME_MAX_BYTES) {
    return NextResponse.json({ error: RESUME_MESSAGES.tooBig }, { status: 413 });
  }
  const read = await resumeText(new Uint8Array(await request.arrayBuffer()));
  if (!read.ok) return NextResponse.json({ error: read.error }, { status: 400 });
  const text = read.text.trim().slice(0, HISTORY_MAX_CHARACTERS);
  await prisma.profileField.upsert({ where: { key: HISTORY_KEY }, create: { key: HISTORY_KEY, value: text }, update: { value: text } });
  return NextResponse.json({ text });
});
