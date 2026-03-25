import React from "react";
import { Badge } from "@/components/ui/badge";
import { ChatCard } from "@/components/professor/ChatCard";
import { LoginCard } from "@/components/professor/LoginCard";
import { OnlineStudentsCard } from "@/components/professor/OnlineStudentsCard";
import { ScreenshotRequestDialog } from "@/components/professor/ScreenshotRequestDialog";
import { useProfessorHome } from "@/hooks/useProfessorHome";

export default function ProfessorHome(): React.JSX.Element {
  const {
    authForm,
    registerMutation,
    loginMutation,
    onlineStudentIds,
    refreshOnlineFromRest,
    teacherId,
    token,
    selectedStudentId,
    sessionId,
    message,
    mqttConnected,
    chatFeed,
    screenshotDataUrl,
    screenshotHistory,
    screenshotUiState,
    activityMessage,
    toastMessage,
    showScreenshotDialog,
    logs,
    setMessage,
    setShowScreenshotDialog,
    startConversation,
    sendMessage,
    requestScreenshot
  } = useProfessorHome();

  if (!token) {
    return (
      <LoginCard
        authForm={authForm}
        onRegister={(values) => registerMutation.mutate(values)}
        onLogin={(values) => loginMutation.mutate(values)}
      />
    );
  }

  return (
    <main className="app-shell flex flex-col gap-4">
      <header className="surface-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Teacher Dashboard</h1>
          <p className="text-sm text-[#7a6047]">Atenda alunos com chat e screenshot em tempo real.</p>
          <p className="mt-2 text-xs text-[#9f7d5e]">ID da sessão atual: {sessionId || "nenhuma sessão ativa"}</p>
        </div>
        <Badge variant={mqttConnected ? "success" : "warning"}>{mqttConnected ? "Online" : "Offline"}</Badge>
      </header>

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-[#4d3728] px-4 py-3 text-sm text-white shadow-xl">{toastMessage}</div>
      )}

      {activityMessage && (
        <div className="rounded-xl border border-[#ecdccf] bg-[#fff4ea] px-4 py-3 text-sm text-[#7d5b30]">{activityMessage}</div>
      )}

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <OnlineStudentsCard
          selectedStudentId={selectedStudentId}
          studentIds={onlineStudentIds}
          onRefresh={() => void refreshOnlineFromRest()}
          onStartConversation={startConversation}
        />

        <ChatCard
          selectedStudentId={selectedStudentId}
          sessionId={sessionId}
          chatFeed={chatFeed}
          message={message}
          screenshotDataUrl={screenshotDataUrl}
          screenshotHistory={screenshotHistory}
          waitingScreenshot={screenshotUiState === "waiting"}
          onMessageChange={setMessage}
          onSendMessage={sendMessage}
          onOpenScreenshotDialog={() => setShowScreenshotDialog(true)}
        />
      </div>

      {showScreenshotDialog && (
        <ScreenshotRequestDialog
          selectedStudentId={selectedStudentId}
          onCancel={() => setShowScreenshotDialog(false)}
          onConfirm={() => {
            setShowScreenshotDialog(false);
            requestScreenshot();
          }}
        />
      )}

      <details>
        <summary className="cursor-pointer text-xs text-[#9f7d5e]">Diagnóstico técnico</summary>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-[#fffdf9] p-3 text-xs">
          {logs.join("\n")}
        </pre>
      </details>
    </main>
  );
}
