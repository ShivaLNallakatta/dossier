import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BASE_THEME, DEFAULT_MARKET, settingsFromRows, settingValue, type Market, type SettingsData } from "@/lib/settings";

/** The market DOSSIER_MARKET sets, for an install that hasn't chosen one in Settings. */
export function marketFromEnv(): Market {
  const market = env.DOSSIER_MARKET;
  return market === "international" ? "INTERNATIONAL" : market === "us" ? "US" : DEFAULT_MARKET;
}

/**
 * The settings in effect. Nothing in the database ties the base theme
 * setting to its theme, so a deleted custom theme reads as Editorial here.
 */
export async function loadSettings(): Promise<SettingsData> {
  const settings = settingsFromRows(await prisma.setting.findMany(), marketFromEnv());
  if (settings.baseThemeId !== DEFAULT_BASE_THEME) {
    const theme = await prisma.theme.findUnique({ where: { id: settings.baseThemeId }, select: { id: true } });
    if (!theme) return { ...settings, baseThemeId: DEFAULT_BASE_THEME };
  }
  return settings;
}

/**
 * Saves the given settings together; null removes one, so it reads as not
 * set. Pass a transaction client to save them as part of that transaction.
 */
export async function saveSettings(changes: Partial<SettingsData>, db?: Prisma.TransactionClient): Promise<void> {
  if (!db) return prisma.$transaction((tx) => saveSettings(changes, tx));
  for (const [key, change] of Object.entries(changes)) {
    if (change === undefined) continue;
    const value = settingValue(change);
    if (value === null) await db.setting.deleteMany({ where: { key } });
    else await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
}
