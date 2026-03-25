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
  activeSessionId: string;
  chatFeed: ChatMessage[];
  replyMessage: string;
  screenshotResponseState: "idle" | "received_request" | "sending" | "sent" | "error";
  lastScreenshotPreview: string;
  onReplyChange: (value: string) => void;
  onSendReply: () => void;
};

export function ChatCard({
  activeSessionId,
  chatFeed,
  replyMessage,
  screenshotResponseState,
  lastScreenshotPreview,
  onReplyChange,
  onSendReply
}: ChatCardProps): React.JSX.Element {
  const screenshotLabel =
    screenshotResponseState === "sending"
      ? "Enviando screenshot..."
      : screenshotResponseState === "error"
        ? "Falha ao enviar screenshot"
        : screenshotResponseState === "received_request"
          ? "Preview do screenshot capturado"
          : "Screenshot enviado";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat com Professor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-[440px] space-y-2 overflow-auto rounded-xl border border-border bg-[#fffdf9] p-3">
          {chatFeed.length === 0 ? (
            <p className="text-xs text-[#9f7d5e]">Aguardando mensagens do professor.</p>
          ) : (
            chatFeed.map((item, index) => (
              <div
                key={`${item.at}-${index}`}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  item.from === "student" ? "ml-auto bg-[#7d5b30] text-white" : "bg-[#f4e9dc] text-[#4d3728]"
                }`}
              >
                {item.text}
              </div>
            ))
          )}
          {screenshotResponseState === "received_request" && (
            <div className="max-w-[90%] rounded-xl bg-[#fde7d4] px-3 py-2 text-sm text-[#7d5b30]">
              <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[#7d5b30]" />
              Professor solicitou screenshot
            </div>
          )}
          {lastScreenshotPreview && (
            <div className="max-w-[90%] rounded-xl border border-border bg-white p-2">
              <p className="mb-2 text-xs text-[#8d6b4b]">{screenshotLabel}</p>
              <img src={lastScreenshotPreview} alt="Último screenshot enviado" className="max-h-64 rounded border border-border" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={replyMessage}
            onChange={(event) => onReplyChange(event.target.value)}
            placeholder={activeSessionId ? "Digite sua resposta" : "Aguardando conversa do professor"}
          />
          <Button onClick={onSendReply} disabled={!activeSessionId || !replyMessage.trim()}>
            Enviar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
