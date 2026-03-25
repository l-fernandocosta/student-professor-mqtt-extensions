import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnlineStudentsCard } from "./OnlineStudentsCard";

describe("OnlineStudentsCard", () => {
  it("shows empty state when there are no students online", () => {
    render(
      <OnlineStudentsCard selectedStudentId="" studentIds={[]} onRefresh={() => {}} onStartConversation={() => {}} />
    );

    expect(screen.getByText("Nenhum aluno online.")).toBeInTheDocument();
  });

  it("calls onRefresh and onStartConversation", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    const onStartConversation = vi.fn();

    render(
      <OnlineStudentsCard
        selectedStudentId=""
        studentIds={["student-abc"]}
        onRefresh={onRefresh}
        onStartConversation={onStartConversation}
      />
    );

    await user.click(screen.getByRole("button", { name: "Atualizar lista" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Student button label is truncated and composed from multiple nodes,
    // so rely on ordering: first is "Atualizar lista", second is the student entry.
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[1]);
    expect(onStartConversation).toHaveBeenCalledWith("student-abc");
  });
});

