import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScreenshotRequestDialog } from "./ScreenshotRequestDialog";

describe("ScreenshotRequestDialog", () => {
  it("renders selected student and triggers actions", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(<ScreenshotRequestDialog selectedStudentId="student-1" onCancel={onCancel} onConfirm={onConfirm} />);

    expect(screen.getByText("student-1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

