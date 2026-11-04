"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toggleKeyPoint } from "@/lib/profile";

/**
 * "What you did" for a role or project: one point per line, and a button
 * that marks the line you're on as a key point (★), which every tailored
 * resume keeps.
 */
export function BulletsField({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (bullets: string) => void }) {
  const textarea = useRef<HTMLTextAreaElement>(null);

  const markLine = () => {
    const element = textarea.current;
    const next = toggleKeyPoint(value, element?.selectionStart ?? value.length);
    onChange(next.text);
    // Back to where you were typing, once the new text is in.
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(next.caret, next.caret);
    });
  };

  return (
    <div className="col-span-2 flex flex-col gap-1.5">
      <Textarea
        ref={textarea}
        label="What you did"
        placeholder={placeholder}
        hint="Lines starting with ★ are key points: every tailored resume keeps them."
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button
        type="button"
        variant="text"
        size="sm"
        className="self-start"
        // Keep the caret in the textarea, so the button knows which line you're on.
        onMouseDown={(event) => event.preventDefault()}
        onClick={markLine}
      >
        ★ Mark this line as a key point
      </Button>
    </div>
  );
}
