"use client";

import { useId, useRef, useState } from "react";

import { useTrackSave } from "@/components/save-tracker";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAutosave } from "@/hooks/use-autosave";
import { messages } from "@/lib/messages";
import { HISTORY_MAX_CHARACTERS, type ProfileData } from "@/lib/profile";

import { saveHistory } from "./actions";
import type { UpdateProfile } from "./skills-section";

const ACCEPT =
  ".pdf,.docx,.md,.markdown,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain";

/**
 * The working resume: the whole work history, longer than any resume, read
 * from a file or pasted. Tailoring picks the points that fit each job from it
 * and the profile together; it's never printed as it is.
 */
export function HistorySection({ profile, update }: { profile: ProfileData; update: UpdateProfile }) {
  const text = profile.history ?? "";
  const track = useTrackSave();
  const setText = (history: string) => update((current) => ({ ...current, history }));
  const { flush } = useAutosave(text, (value) => track(saveHistory({ text: value })));
  const fileId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  async function read(file: File) {
    setReading(true);
    try {
      const response = await fetch("/api/profile/history", {
        method: "POST",
        body: file,
        headers: { "content-type": file.type || "application/octet-stream" },
      });
      const body = (await response.json().catch(() => null)) as { text?: string; error?: string } | null;
      if (!response.ok || typeof body?.text !== "string") return toast(body?.error ?? messages.unexpected);
      setText(body.text);
      toast(`Read ${file.name}. Write a resume again to use it.`);
    } catch {
      toast(messages.unexpected);
    } finally {
      setReading(false);
      if (input.current) input.current.value = "";
    }
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={fileId} className="sr-only">
          Working resume file
        </label>
        <input
          ref={input}
          id={fileId}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void read(file);
          }}
        />
        <Button variant="secondary" aria-disabled={reading || undefined} onClick={() => (reading ? undefined : input.current?.click())}>
          {reading ? "Reading…" : text.trim() ? "Replace with a file…" : "Upload a file…"}
        </Button>
        <span className="text-meta text-muted">PDF, Word (.docx), Markdown or text. Or paste it below.</span>
      </div>
      <Textarea
        label="Working resume"
        hint={
          words > 0
            ? `${words.toLocaleString("en")} words. Tailored resumes take the points that fit each job from here and your profile, under the right role. Key points (★) in your profile still come first.`
            : "Your full work history, as long as you like. Tailored resumes take the points that fit each job from here, under the right role."
        }
        placeholder="Paste your working resume: every role, project and result, in as much detail as you have."
        rows={18}
        maxLength={HISTORY_MAX_CHARACTERS}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={flush}
      />
    </div>
  );
}
