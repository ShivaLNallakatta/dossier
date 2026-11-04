import "server-only";

import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { DocumentKind, VersionCause } from "@/generated/prisma/enums";
import { getAiProvider } from "@/lib/ai";
import { loadTaskOptions } from "@/lib/ai/task-options";
import { tailorResume } from "@/lib/ai/tasks";
import { extractedOf, matchSchema, unitsSchema } from "@/lib/application-data";
import { updateDocuments } from "@/lib/document-units";
import { saveVersion } from "@/lib/document-versions";
import { logServerError } from "@/lib/log";
import { describeTrim, fitResumeToPages } from "@/lib/page-limit";
import { prisma } from "@/lib/prisma";
import { loadFactTexts, loadProfile } from "@/lib/profile-data";

import { defineJob } from "./runner";

/** The key of an application's resume being written again, to find it after a reload. */
export const resumeJobKey = (applicationId: string) => `resume:${applicationId}`;

/**
 * "Write again" on an application's tailored resume: writes it again from
 * the profile as it is now, with Dossier's current resume writing (key
 * points, prompts and checks from newer releases), and the application's
 * posting, match and facts. The resume it replaces stays in its history and
 * comes back with Undo. A resume over the page limit is trimmed, as when the
 * application was created.
 */
export const rewriteResumeJob = defineJob({
  type: "rewrite-resume",
  input: z.object({ applicationId: z.string().min(1) }),
  result: z.object({
    /** The resume as written, before any trimming. */
    units: unitsSchema,
    /** The resume it replaced, for Undo; null when there wasn't one. */
    previous: unitsSchema.nullable(),
    /** What trimming to the page limit cut, in words, e.g. "Shortened the Microsoft role by 1 bullet to fit two pages". */
    trimmed: z.array(z.string()),
  }),
  async run({ applicationId }, { step, signal }) {
    await step("Writing the resume again");
    const application = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    const match = matchSchema.safeParse(application.match);
    const [provider, options, profile, facts] = await Promise.all([getAiProvider(), loadTaskOptions(), loadProfile(), loadFactTexts(applicationId)]);
    const { data, promptVersion } = await tailorResume(
      provider,
      { profile, extracted: extractedOf(application), match: match.success ? match.data : null, facts, posting: application.postingText },
      // In the application's language, like its other documents.
      { ...options, language: application.language || options.language, signal },
    );

    let previous: z.infer<typeof unitsSchema> | null = null;
    let created = false;
    const existing = await prisma.document.count({ where: { applicationId, kind: DocumentKind.RESUME } });
    if (!existing) {
      try {
        await prisma.$transaction(async (tx) => {
          const document = await tx.document.create({ data: { applicationId, kind: DocumentKind.RESUME, units: data, writtenWith: promptVersion } });
          await saveVersion(tx, document.id, data, { cause: VersionCause.WRITTEN });
        });
        created = true;
      } catch (error) {
        // Written meanwhile: write over it below.
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      }
    }
    if (!created) {
      previous = await updateDocuments(
        applicationId,
        async (documents) => {
          const before = documents[DocumentKind.RESUME] ?? null;
          documents[DocumentKind.RESUME] = data;
          return before;
        },
        { version: { cause: VersionCause.WRITTEN, detail: "Written again" } },
      );
      // A fresh resume: the old one's trimming no longer applies.
      await prisma.document.updateMany({
        where: { applicationId, kind: DocumentKind.RESUME },
        data: { writtenWith: promptVersion, trimmed: Prisma.DbNull },
      });
    }

    let trimmed: string[] = [];
    if (options.maxPages) {
      await step("Fitting it to the page limit");
      try {
        const fit = await fitResumeToPages(applicationId, profile, options.maxPages);
        trimmed = fit.trimmed.length > 0 ? describeTrim(fit.trimmed, profile, fit.fits, options.maxPages) : [];
      } catch (error) {
        // The resume as written is still better than none.
        logServerError("trimming a rewritten resume", error);
      }
    }
    return { units: data, previous, trimmed };
  },
});

export type RewriteResumeResult = z.infer<typeof rewriteResumeJob.result>;
