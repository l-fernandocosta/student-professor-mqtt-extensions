import React from "react";
import { Button } from "@/components/ui/button";

type ScreenshotDialogProps = {
  incomingScreenshotAt: string;
  lastScreenshotPreview: string;
  screenshotResponseState: "idle" | "received_request" | "sending" | "sent" | "error";
  canSend: boolean;
  onLater: () => void;
  onSendNow: () => void;
};

export function ScreenshotDialog({
  incomingScreenshotAt,
  lastScreenshotPreview,
  screenshotResponseState,
  canSend,
  onLater,
  onSendNow
}: ScreenshotDialogProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-[#4d3728]">Solicitação de screenshot</h3>
        <p className="mt-2 text-sm text-[#7a6047]">
          O professor solicitou sua tela{incomingScreenshotAt ? ` às ${new Date(incomingScreenshotAt).toLocaleTimeString()}` : ""}.
        </p>
        {lastScreenshotPreview && (
          <img src={lastScreenshotPreview} alt="Preview da sua tela" className="mt-3 max-h-48 rounded border border-border" />
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onLater}>
            Depois
          </Button>
          <Button onClick={onSendNow} disabled={!canSend || screenshotResponseState === "sending"}>
            {screenshotResponseState === "sending" ? "Enviando..." : "Enviar agora"}
          </Button>
        </div>
      </div>
    </div>
  );
}
