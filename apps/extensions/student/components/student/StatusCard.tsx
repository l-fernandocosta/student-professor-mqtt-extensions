import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatusCardProps = {
  studentId: string;
  teacherId: string;
  activeSessionId: string;
  mqttConnected: boolean;
  autoReplyEnabled: boolean;
  onToggleAutoReply: () => void;
  onDisconnect: () => void;
};

export function StatusCard({
  studentId,
  teacherId,
  activeSessionId,
  mqttConnected,
  autoReplyEnabled,
  onToggleAutoReply,
  onDisconnect
}: StatusCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative h-9 w-9 rounded-full bg-[#f0d8c2] text-center text-sm font-semibold leading-9 text-[#7d5b30]">
            {studentId.slice(0, 1).toUpperCase()}
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                mqttConnected ? "bg-emerald-500" : "bg-zinc-400"
              }`}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-[#4d3728]">Você</p>
            <p className="text-xs text-[#8d6b4b]">{mqttConnected ? "Online" : "Conectando..."}</p>
          </div>
        </div>
        <p className="text-sm text-[#6a5038]">Professor atual: {teacherId || "-"}</p>
        <p className="text-sm text-[#6a5038]">Sessão: {activeSessionId || "-"}</p>
        <Button
          variant="ghost"
          onClick={onToggleAutoReply}
          disabled
          aria-disabled="true"
          title="Auto screenshot está sempre habilitado"
        >
          {autoReplyEnabled ? "Auto screenshot ligado" : "Auto screenshot desligado"}
        </Button>
        <Button variant="outline" onClick={onDisconnect} disabled={!mqttConnected}>
          Sair da conversa
        </Button>
      </CardContent>
    </Card>
  );
}
