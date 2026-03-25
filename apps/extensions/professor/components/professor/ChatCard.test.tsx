import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatCard } from "./ChatCard";

function renderChatCard(partial?: Partial<React.ComponentProps<typeof ChatCard>>) {
  const onMessageChange = vi.fn();
  const onSendMessage = vi.fn();
  const onOpenScreenshotDialog = vi.fn();

  render(
    <ChatCard
      selectedStudentId=""
      sessionId=""
      chatFeed={[]}
      message=""
      screenshotDataUrl=""
      screenshotHistory={[]}
      waitingScreenshot={false}
      onMessageChange={onMessageChange}
      onSendMessage={onSendMessage}
      onOpenScreenshotDialog={onOpenScreenshotDialog}
      {...partial}
    />
  );

  return { onMessageChange, onSendMessage, onOpenScreenshotDialog };
}

describe("ChatCard", () => {
  it("shows empty state when no chat messages", () => {
    renderChatCard();
    expect(screen.getByText("Inicie uma conversa selecionando um aluno.")).toBeInTheDocument();
  });

  it("disables send when there is no active student/session or message", () => {
    renderChatCard();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("enables send when student + session + message are present and calls handlers", async () => {
    const user = userEvent.setup();
    const { onMessageChange, onSendMessage } = renderChatCard({
      selectedStudentId: "student-1",
      sessionId: "session-1",
      message: "hello"
    });

    const input = screen.getByPlaceholderText("Digite sua mensagem");
    await user.type(input, "!");
    expect(onMessageChange).toHaveBeenCalled();

    const sendButton = screen.getByRole("button", { name: "Enviar" });
    expect(sendButton).not.toBeDisabled();

    await user.click(sendButton);
    expect(onSendMessage).toHaveBeenCalledTimes(1);
  });

  it("renders waiting screenshot banner", () => {
    renderChatCard({
      waitingScreenshot: true,
      selectedStudentId: "student-1",
      sessionId: "session-1"
    });
    expect(screen.getByText("Aguardando screenshot do aluno...")).toBeInTheDocument();
  });

  it("renders screenshot image when screenshotDataUrl exists", () => {
    renderChatCard({
      screenshotDataUrl: "data:image/png;base64,AAAA",
      selectedStudentId: "student-1",
      sessionId: "session-1"
    });
    expect(screen.getByAltText("Screenshot do aluno")).toBeInTheDocument();
  });

  it("renders screenshot history thumbnails", () => {
    renderChatCard({
      selectedStudentId: "student-1",
      sessionId: "session-1",
      screenshotHistory: [
        {
          correlationId: "c1",
          studentId: "student-1",
          status: "completed",
          storageUrl: "http://localhost:4566/bucket/key.png",
          capturedAt: null,
          createdAt: new Date().toISOString()
        }
      ]
    });

    expect(screen.getByText("Histórico de screenshots")).toBeInTheDocument();
    expect(screen.getByAltText("Screenshot histórico")).toBeInTheDocument();
  });

  it("opens screenshot dialog via action", async () => {
    const user = userEvent.setup();
    const { onOpenScreenshotDialog } = renderChatCard({
      selectedStudentId: "student-1",
      sessionId: "session-1"
    });

    await user.click(screen.getByRole("button", { name: "Solicitar screenshot" }));
    expect(onOpenScreenshotDialog).toHaveBeenCalledTimes(1);
  });
});

