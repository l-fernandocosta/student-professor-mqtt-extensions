import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ChatMessage = {
  from: "teacher" | "student";
  text: string;
  at: string;
};

type ChatCardProps = {
  selectedStudentId: string;
  sessionId: string;
  chatFeed: ChatMessage[];
  message: string;
  screenshotDataUrl: string;
  screenshotHistory: Array<{
    correlationId: string | null;
    studentId: string;
    status: string;
    storageUrl: string | null;
    capturedAt: string | null;
    createdAt: string;
  }>;
  waitingScreenshot: boolean;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onOpenScreenshotDialog: () => void;
};

export function ChatCard({
  selectedStudentId,
  sessionId,
  chatFeed,
  message,
  screenshotDataUrl,
  screenshotHistory,
  waitingScreenshot,
  onMessageChange,
  onSendMessage,
  onOpenScreenshotDialog
}: ChatCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat com Aluno</CardTitle>
        <p className="text-xs text-[#7a6047]">Aluno: {selectedStudentId || "-"} | Sessão: {sessionId || "-"}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-[420px] space-y-2 overflow-auto rounded-xl border border-border bg-[#fffdf9] p-3">
          {chatFeed.length === 0 ? (
            <p className="text-xs text-[#9f7d5e]">Inicie uma conversa selecionando um aluno.</p>
          ) : (
            chatFeed.map((item, index) => (
              <div
                key={`${item.at}-${index}`}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  item.from === "teacher" ? "ml-auto bg-[#7d5b30] text-white" : "bg-[#f4e9dc] text-[#4d3728]"
                }`}
              >
                {item.text}
              </div>
            ))
          )}
          {waitingScreenshot && (
            <div className="max-w-[90%] rounded-xl bg-[#fde7d4] px-3 py-2 text-sm text-[#7d5b30]">
              <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[#7d5b30]" />
              Aguardando screenshot do aluno...
            </div>
          )}
          {screenshotDataUrl && (
            <div className="max-w-[90%] rounded-xl border border-border bg-white p-2">
              <p className="mb-2 text-xs text-[#8d6b4b]">Screenshot recebido</p>
              <img src={screenshotDataUrl} alt="Screenshot do aluno" className="max-h-64 rounded border border-border" />
            </div>
          )}
        </div>
        {screenshotHistory.length > 0 && (
          <div className="rounded-xl border border-border bg-white p-3">
            <p className="mb-2 text-xs font-medium text-[#8d6b4b]">Histórico de screenshots</p>
            <div className="grid grid-cols-3 gap-2">
              {screenshotHistory
                .filter((item) => Boolean(item.storageUrl))
                .slice(0, 9)
                .map((item) => (
                  <a
                    key={item.correlationId ?? item.createdAt}
                    href={item.storageUrl ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border border-border bg-[#fffdf9]"
                    title={`Aluno ${item.studentId} • ${item.capturedAt ?? item.createdAt}`}
                  >
                    <img
                      src={item.storageUrl ?? ""}
                      alt="Screenshot histórico"
                      className="h-20 w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder={selectedStudentId ? "Digite sua mensagem" : "Selecione um aluno para começar"}
          />
          <Button onClick={onSendMessage} disabled={!selectedStudentId || !sessionId || !message.trim()}>
            Enviar
          </Button>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onOpenScreenshotDialog} disabled={!selectedStudentId}>
            Solicitar screenshot
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
