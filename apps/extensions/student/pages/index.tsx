import React from "react";
import { Badge } from "@/components/ui/badge";
import { ChatCard } from "@/components/student/ChatCard";
import { LoginCard } from "@/components/student/LoginCard";
import { ScreenshotDialog } from "@/components/student/ScreenshotDialog";
import { StatusCard } from "@/components/student/StatusCard";
import { useStudentHome } from "@/hooks/useStudentHome";

export default function StudentHome(): React.JSX.Element {
  const {
    authForm,
    registerMutation,
    loginMutation,
    screenshotMutation,
    isExtensionContext,
    studentId,
    token,
    teacherId,
    activeSessionId,
    replyMessage,
    chatFeed,
    lastCorrelationId,
    autoReplyEnabled,
    mqttConnected,
    lastScreenshotPreview,
    screenshotResponseState,
    incomingScreenshotAt,
    activityMessage,
    toastMessage,
    showScreenshotDialog,
    logs,
    setReplyMessage,
    setAutoReplyEnabled,
    setShowScreenshotDialog,
    disconnectMqtt,
    sendReply,
    sendScreenshotNow
  } = useStudentHome();

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
      {!isExtensionContext && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Voce esta em modo web (localhost). Para testar screenshot em MV3, abra esta tela pelo icone da extensao no
          <span className="font-semibold"> chrome://extensions</span>.
        </div>
      )}

      <header className="surface-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Student Dashboard</h1>
          <p className="text-sm text-[#7a6047]">Fique online para conversar e responder screenshots.</p>
          <p className="mt-2 text-xs text-[#9f7d5e]">Sessão ativa: {activeSessionId || "aguardando professor"}</p>
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
        <StatusCard
          studentId={studentId}
          teacherId={teacherId}
          activeSessionId={activeSessionId}
          mqttConnected={mqttConnected}
          autoReplyEnabled={autoReplyEnabled}
          onToggleAutoReply={() => setAutoReplyEnabled((prev) => !prev)}
          onDisconnect={disconnectMqtt}
        />

        <ChatCard
          activeSessionId={activeSessionId}
          chatFeed={chatFeed}
          replyMessage={replyMessage}
          screenshotResponseState={screenshotResponseState}
          lastScreenshotPreview={lastScreenshotPreview}
          onReplyChange={setReplyMessage}
          onSendReply={sendReply}
        />
      </div>

      {showScreenshotDialog && (
        <ScreenshotDialog
          incomingScreenshotAt={incomingScreenshotAt}
          lastScreenshotPreview={lastScreenshotPreview}
          screenshotResponseState={screenshotResponseState}
          canSend={Boolean(token && teacherId && lastCorrelationId && lastScreenshotPreview)}
          onLater={() => setShowScreenshotDialog(false)}
          onSendNow={() => {
            setShowScreenshotDialog(false);
            sendScreenshotNow();
          }}
        />
      )}

      <details>
        <summary className="cursor-pointer text-xs text-[#9f7d5e]">Diagnóstico técnico</summary>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-[#fffdf9] p-3 text-xs">
          {logs.join("\n")}
        </pre>
      </details>
    </main>
  );
}
