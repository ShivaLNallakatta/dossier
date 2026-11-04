import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { BulletsField } from "./bullets-field";

function Field({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return <BulletsField value={value} placeholder="One point per line." onChange={setValue} />;
}

describe("BulletsField", () => {
  it("explains key points, and marks and unmarks the line you're on", async () => {
    const user = userEvent.setup();
    render(<Field initial={"Led the team\nGrew revenue 3%"} />);
    const field = screen.getByLabelText("What you did") as HTMLTextAreaElement;
    expect(field).toHaveAccessibleDescription("Lines starting with ★ are key points: every tailored resume keeps them.");

    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
    await user.click(screen.getByRole("button", { name: "★ Mark this line as a key point" }));
    expect(field).toHaveValue("Led the team\n★ Grew revenue 3%");

    field.setSelectionRange(field.value.length, field.value.length);
    await user.click(screen.getByRole("button", { name: "★ Mark this line as a key point" }));
    expect(field).toHaveValue("Led the team\nGrew revenue 3%");
  });
});
