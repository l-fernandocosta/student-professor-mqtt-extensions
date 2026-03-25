import type { MqttClient } from "mqtt";
import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

const MqttTopics = {
  screenshotRequest: (studentId: string) => `screenshot/request/${studentId}`,
  screenshotResponse: (teacherId: string) => `screenshot/response/${teacherId}`,
  chatDeliver: (sessionId: string) => `chat/session/${sessionId}/deliver`,
  chatActive: (studentId: string) => `chat/active/${studentId}`,
  presenceHeartbeat: (studentId: string) => `presence/student/${studentId}/heartbeat`
};

const authSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres")
});

type AuthFormData = z.infer<typeof authSchema>;
type ScreenshotResponseState = "idle" | "received_request" | "sending" | "sent" | "error";
type MqttConnectFn = (url: string, options?: { reconnectPeriod?: number }) => MqttClient;
type ChatAuthor = "teacher" | "student";

type ChatMessage = {
  from: ChatAuthor;
  text: string;
  at: string;
};

function pickConnectExport(value: unknown, depth = 0): MqttConnectFn | null {
  if (depth > 4 || !value) return null;
  if (typeof value === "function") return value as MqttConnectFn;
  if (typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.connect === "function") return candidate.connect as MqttConnectFn;

  for (const nestedValue of Object.values(candidate)) {
    const found = pickConnectExport(nestedValue, depth + 1);
    if (found) return found;
  }

  return null;
}

async function loadMqttConnect(): Promise<MqttConnectFn> {
  const fromPackage = await import("mqtt");
  const packageConnect = pickConnectExport(fromPackage);
  if (packageConnect) return packageConnect;

  const fromBrowserBundle = await import("mqtt/dist/mqtt");
  const browserConnect = pickConnectExport(fromBrowserBundle);
  if (browserConnect) return browserConnect;

  throw new Error("MQTT connect function not found in browser bundle.");
}

export function useStudentHome() {
  const apiBase = useMemo(() => "http://localhost:3000/api", []);
  const isExtensionContext =
    typeof window !== "undefined" && window.location?.protocol === "chrome-extension:";
  const STORAGE_KEY = "studentSessionState";
  const [studentId, setStudentId] = useState("");
  const [token, setToken] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [activeSessionId, setActiveSessionId] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [chatFeed, setChatFeed] = useState<ChatMessage[]>([]);
  const [lastCorrelationId, setLastCorrelationId] = useState("");
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [unreadTeacherMessages, setUnreadTeacherMessages] = useState(0);
  const [lastScreenshotAt, setLastScreenshotAt] = useState("");
  const [lastScreenshotPreview, setLastScreenshotPreview] = useState("");
  const [screenshotResponseState, setScreenshotResponseState] = useState<ScreenshotResponseState>("idle");
  const [incomingScreenshotAt, setIncomingScreenshotAt] = useState("");
  const [activityMessage, setActivityMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [showScreenshotDialog, setShowScreenshotDialog] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const mqttRef = useRef<MqttClient | null>(null);
  const recentChatKeysRef = useRef<string[]>([]);

  const persistAuthForWorker = (nextToken: string, nextStudentId: string): void => {
    const chromeApi = (globalThis as unknown as { chrome?: any }).chrome;
    if (!isExtensionContext || !chromeApi?.storage?.local) return;
    chromeApi.storage.local.set({
      studentAuth: {
        token: nextToken,
        studentId: nextStudentId,
        updatedAt: new Date().toISOString()
      }
    });
  };

  const authForm = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "aluno@example.com", password: "12345678" }
  });

  const pushLog = (entry: string): void => setLogs((prev) => [entry, ...prev].slice(0, 30));
  const pushActivity = (entry: string): void => {
    setActivityMessage(entry);
    setTimeout(() => setActivityMessage(""), 3000);
  };
  const pushToast = (entry: string): void => {
    setToastMessage(entry);
    setTimeout(() => setToastMessage(""), 2800);
  };

  const persistSessionState = (partial?: Record<string, unknown>): void => {
    const chromeApi = (globalThis as unknown as { chrome?: any }).chrome;
    if (!isExtensionContext || !chromeApi?.storage?.local) return;
    const snapshot = {
      studentId,
      token,
      teacherId,
      activeSessionId,
      chatFeed,
      lastCorrelationId,
      autoReplyEnabled,
      lastScreenshotPreview,
      screenshotResponseState,
      incomingScreenshotAt,
      updatedAt: new Date().toISOString(),
      ...(partial ?? {})
    };
    chromeApi.storage.local.set({ [STORAGE_KEY]: snapshot });
  };

  const appendChatMessage = (from: ChatAuthor, text: string): void => {
    const key = `${from}:${text.trim().toLowerCase()}`;
    if (recentChatKeysRef.current.includes(key)) return;
    recentChatKeysRef.current = [...recentChatKeysRef.current.slice(-19), key];
    setChatFeed((prev) => [...prev, { from, text, at: new Date().toISOString() }]);
    setTimeout(() => {
      recentChatKeysRef.current = recentChatKeysRef.current.filter((item) => item !== key);
    }, 2500);
  };

  const registerMutation = useMutation({
    mutationFn: async (values: AuthFormData) => {
      const response = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, role: "student" })
      });
      if (!response.ok) throw new Error("Falha ao registrar aluno");
      return (await response.json()) as { userId: string };
    },
    onSuccess: (data) => {
      setStudentId(data.userId);
      pushLog(`Aluno registrado: ${data.userId}`);
    },
    onError: (error) => pushLog((error as Error).message)
  });

  const loginMutation = useMutation({
    mutationFn: async (values: AuthFormData) => {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values)
      });
      if (!response.ok) throw new Error("Falha no login");
      return (await response.json()) as { accessToken: string; userId: string };
    },
    onSuccess: (data) => {
      setToken(data.accessToken);
      setStudentId(data.userId);
      persistAuthForWorker(data.accessToken, data.userId);
      persistSessionState({ token: data.accessToken, studentId: data.userId });
      pushLog(`Login OK: ${data.userId}`);
      pushToast("Login realizado com sucesso.");
    },
    onError: (error) => pushLog((error as Error).message)
  });

  useEffect(() => {
    const chromeApi = (globalThis as unknown as { chrome?: any }).chrome;
    if (!isExtensionContext || !chromeApi?.storage?.local) return;

    chromeApi.storage.local.get(["studentAuth"], (result: { studentAuth?: { token?: string; studentId?: string } }) => {
      const storedToken = String(result?.studentAuth?.token ?? "");
      const storedStudentId = String(result?.studentAuth?.studentId ?? "");
      if (!storedToken || !storedStudentId) return;
      setToken((prev) => prev || storedToken);
      setStudentId((prev) => prev || storedStudentId);
      pushLog("Sessao restaurada do storage local.");
    });
  }, [isExtensionContext]);

  useEffect(() => {
    const chromeApi = (globalThis as unknown as { chrome?: any }).chrome;
    if (!isExtensionContext || !chromeApi?.storage?.local) return;

    chromeApi.storage.local.get([STORAGE_KEY], (result: Record<string, unknown>) => {
      const stored = (result?.[STORAGE_KEY] as Record<string, unknown> | undefined) ?? undefined;
      if (!stored) return;
      setTeacherId(String(stored.teacherId ?? ""));
      setActiveSessionId(String(stored.activeSessionId ?? ""));
      setLastCorrelationId(String(stored.lastCorrelationId ?? ""));
      setAutoReplyEnabled(Boolean(stored.autoReplyEnabled ?? true));
      setLastScreenshotPreview(String(stored.lastScreenshotPreview ?? ""));
      setScreenshotResponseState((stored.screenshotResponseState as ScreenshotResponseState) ?? "idle");
      setIncomingScreenshotAt(String(stored.incomingScreenshotAt ?? ""));
      const storedFeed = Array.isArray(stored.chatFeed) ? (stored.chatFeed as ChatMessage[]) : [];
      setChatFeed(storedFeed);
      pushLog("Conversa do aluno restaurada do storage local.");
    });
  }, [isExtensionContext]);

  useEffect(() => {
    persistSessionState();
  }, [
    studentId,
    token,
    teacherId,
    activeSessionId,
    chatFeed,
    lastCorrelationId,
    autoReplyEnabled,
    lastScreenshotPreview,
    screenshotResponseState,
    incomingScreenshotAt
  ]);

  useEffect(() => {
    if (!token || !studentId) return;
    persistAuthForWorker(token, studentId);
  }, [token, studentId]);

  useEffect(() => {
    if (!activeSessionId || !studentId || chatFeed.length > 0) return;
    void (async () => {
      try {
        const response = await fetch(
          `${apiBase}/chat/history?sessionId=${encodeURIComponent(activeSessionId)}&limit=50`,
          { headers: { authorization: `Bearer ${token}` } }
        );
        if (!response.ok) return;
        const history = (await response.json()) as Array<{ senderId: string; content: string; createdAt: string }>;
        const restored = [...history]
          .reverse()
          .map((item) => ({
            from: item.senderId === studentId ? ("student" as const) : ("teacher" as const),
            text: item.content,
            at: item.createdAt
          }));
        if (restored.length > 0) {
          setChatFeed(restored);
          pushLog(`Historico restaurado (${restored.length} mensagens).`);
        }
      } catch (error) {
        pushLog(`Falha ao restaurar historico: ${(error as Error).message}`);
      }
    })();
  }, [apiBase, activeSessionId, studentId, chatFeed.length, token]);

  const screenshotMutation = useMutation({
    mutationFn: async (input: { correlationId: string; teacherId: string; imageBase64: string }) => {
      const fallbackImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2n4JQAAAAASUVORK5CYII=";
      const response = await fetch(`${apiBase}/screenshot/response`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({
          correlationId: input.correlationId,
          teacherId: input.teacherId,
          studentId,
          contentType: "image/png",
          imageBase64: input.imageBase64 || fallbackImage
        })
      });
      if (!response.ok) throw new Error("Falha ao responder screenshot");
      return (await response.json()) as { updated: boolean };
    },
    onMutate: () => {
      // When auto-reply already published via MQTT, keep the UI as "sent" and
      // treat this mutation as "persist to history" only (don't regress status).
      setScreenshotResponseState((current) => (current === "sent" ? "sent" : "sending"));
      pushActivity("Enviando screenshot...");
    },
    onSuccess: (data) => {
      pushLog(`Resposta screenshot enviada: ${data.updated}`);
      setScreenshotResponseState("sent");
      setLastScreenshotAt(new Date().toISOString());
      pushActivity("Screenshot enviado.");
    },
    onError: (error) => {
      // If MQTT send already succeeded, don't show a scary "failed to send".
      setScreenshotResponseState((current) => (current === "sent" ? "sent" : "error"));
      pushLog((error as Error).message);
      pushActivity("Falha ao salvar screenshot no histórico.");
    }
  });

  const replyChatMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeSessionId || !teacherId || !content) throw new Error("Sem conversa ativa para responder");
      const client = mqttRef.current;
      if (!client || !mqttConnected) throw new Error("MQTT desconectado. Aguarde reconexao.");
      client.publish(
        `chat/session/${activeSessionId}/send`,
        JSON.stringify({
          eventId: crypto.randomUUID(),
          eventType: "CHAT_MESSAGE",
          sessionId: activeSessionId,
          senderId: studentId,
          receiverId: teacherId,
          payload: { message: content },
          timestamp: new Date().toISOString(),
          version: 1
        }),
        { qos: 1 }
      );
      return { published: true };
    },
    onSuccess: (_, sentReply) => {
      appendChatMessage("student", sentReply);
      setReplyMessage("");
      setUnreadTeacherMessages(0);
      pushLog("Resposta enviada via MQTT");
      pushActivity("Mensagem enviada ao professor.");
      pushToast("Mensagem enviada.");
    },
    onError: (error) => pushLog((error as Error).message)
  });

  useEffect(() => {
    if (!heartbeatEnabled || !studentId) return;
    const client = mqttRef.current;
    if (!client || !mqttConnected) return;

    const sendHeartbeat = (): void => {
      client.publish(
        MqttTopics.presenceHeartbeat(studentId),
        JSON.stringify({
          eventType: "PRESENCE_HEARTBEAT",
          version: 1,
          timestamp: new Date().toISOString(),
          payload: { studentId }
        }),
        { qos: 0 }
      );
    };

    sendHeartbeat();
    const timer = setInterval(sendHeartbeat, 10_000);
    return () => clearInterval(timer);
  }, [heartbeatEnabled, studentId, mqttConnected]);

  const captureCurrentTabBase64 = async (): Promise<string> => {
    const fallbackImage =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2n4JQAAAAASUVORK5CYII=";
    const chromeApi = (globalThis as unknown as { chrome?: any }).chrome;
    const isExtensionPage = globalThis.location?.protocol === "chrome-extension:";
    const extensionId = chromeApi?.runtime?.id;

    // In MV3 this must run inside the extension context; running in localhost/dev page won't work.
    if (!isExtensionPage || !extensionId || !chromeApi?.runtime?.sendMessage) {
      pushLog("Captura indisponivel fora da extensao. Abra pelo icone em chrome://extensions.");
      return fallbackImage;
    }

    try {
      const response = (await new Promise<{ ok: boolean; dataUrl?: string; error?: string }>((resolve, reject) => {
        chromeApi.runtime.sendMessage({ type: "CAPTURE_VISIBLE_TAB" }, (value: { ok: boolean; dataUrl?: string; error?: string }) => {
          const runtimeError = chromeApi.runtime?.lastError;
          if (runtimeError) {
            reject(new Error(runtimeError.message));
            return;
          }
          resolve(value);
        });
      })) as { ok: boolean; dataUrl?: string; error?: string };

      if (!response?.ok || !response.dataUrl) {
        throw new Error(response?.error || "Resposta invalida do service worker");
      }

      const dataUrl = response.dataUrl;
      return dataUrl.replace(/^data:image\/png;base64,/, "");
    } catch (error) {
      pushLog(`Falha na captura da aba ativa: ${(error as Error).message}`);
      return fallbackImage;
    }
  };

  const connectMqtt = async (): Promise<void> => {
    if (mqttRef.current || !studentId) return;
    let client: MqttClient;
    try {
      const mqttConnect = await loadMqttConnect();
      client = mqttConnect("ws://localhost:8083/mqtt", { reconnectPeriod: 1500 });
      mqttRef.current = client;
    } catch (error) {
      pushLog((error as Error).message);
      return;
    }

    client.on("connect", () => {
      setMqttConnected(true);
      client.subscribe(MqttTopics.screenshotRequest(studentId), { qos: 1 });
      client.subscribe("chat/session/+/deliver", { qos: 1 });
      client.subscribe(MqttTopics.chatActive(studentId), { qos: 1 });
      pushLog("MQTT conectado e inscrito");
    });

    client.on("message", async (topic, payload) => {
      pushLog(`MQTT recebido em ${topic}`);
      if (topic === MqttTopics.chatActive(studentId)) {
        const parsed = JSON.parse(payload.toString()) as { sessionId?: string; teacherId?: string };
        const nextSessionId = String(parsed.sessionId ?? "");
        const nextTeacherId = String(parsed.teacherId ?? "");
        if (nextTeacherId) setTeacherId(nextTeacherId);
        if (nextSessionId) setActiveSessionId(nextSessionId);
        pushActivity("Sessão iniciada pelo professor.");
        return;
      }
      if (topic.startsWith("chat/session/") && topic.endsWith("/deliver")) {
        const parts = topic.split("/");
        const incomingSessionId = parts[2] ?? "";
        const parsed = JSON.parse(payload.toString()) as {
          senderId?: string;
          payload?: { message?: string };
        };
        const senderId = String(parsed.senderId ?? "");
        const incomingText = String(parsed.payload?.message ?? payload.toString());
        if (incomingSessionId) setActiveSessionId(incomingSessionId);
        if (!senderId || senderId !== studentId) {
          if (senderId) setTeacherId(senderId);
          appendChatMessage("teacher", incomingText);
          setUnreadTeacherMessages((prev) => prev + 1);
          pushActivity("Nova mensagem do professor.");
        } else {
          appendChatMessage("student", incomingText);
        }
      }

      if (topic === MqttTopics.screenshotRequest(studentId)) {
        const parsed = JSON.parse(payload.toString()) as {
          correlationId?: string;
          senderId?: string;
        };
        const responseCorrelationId = String(parsed.correlationId ?? "");
        const responseTeacherId = String(parsed.senderId ?? teacherId);
        setTeacherId(responseTeacherId);
        setLastCorrelationId(responseCorrelationId);
        setIncomingScreenshotAt(new Date().toISOString());
        setScreenshotResponseState("received_request");
        pushActivity("Professor solicitou um screenshot.");

        const imageBase64 = await captureCurrentTabBase64();
        setLastScreenshotAt(new Date().toISOString());
        setLastScreenshotPreview(`data:image/png;base64,${imageBase64}`);

        if (autoReplyEnabled) {
          client.publish(
            MqttTopics.screenshotResponse(responseTeacherId),
            JSON.stringify({
              eventId: crypto.randomUUID(),
              eventType: "SCREENSHOT_RESPONSE",
              version: 1,
              timestamp: new Date().toISOString(),
              senderId: studentId,
              receiverId: responseTeacherId,
              correlationId: responseCorrelationId,
              payload: { capturedAt: new Date().toISOString(), contentType: "image/png", imageBase64 }
            }),
            { qos: 1 }
          );
          pushLog("Screenshot respondido automaticamente via MQTT");
          setScreenshotResponseState("sent");
          pushActivity("Screenshot enviado automaticamente.");
          pushToast("Screenshot enviado.");
          screenshotMutation.mutate({
            correlationId: responseCorrelationId,
            teacherId: responseTeacherId,
            imageBase64
          });
        } else {
          setShowScreenshotDialog(true);
          pushLog("Pedido de screenshot recebido. Auto resposta desativada.");
        }
      }
    });

    client.on("close", () => {
      setMqttConnected(false);
      pushLog("MQTT desconectado");
      mqttRef.current = null;
    });
    client.on("error", (err) => {
      pushLog(`MQTT erro: ${err.message}`);
      mqttRef.current = null;
    });
  };

  const disconnectMqtt = (): void => {
    if (!mqttRef.current) return;
    mqttRef.current.end(true);
    mqttRef.current = null;
    setMqttConnected(false);
  };

  const sendReply = (): void => {
    const content = replyMessage.trim();
    if (!content) return;
    replyChatMutation.mutate(content);
  };

  const sendScreenshotNow = (): void => {
    screenshotMutation.mutate({
      correlationId: lastCorrelationId,
      teacherId,
      imageBase64: lastScreenshotPreview.replace(/^data:image\/png;base64,/, "")
    });
  };

  useEffect(() => {
    if (token && studentId) {
      void connectMqtt();
      setHeartbeatEnabled(true);
    }
  }, [token, studentId]);

  useEffect(() => {
    if (!token || !studentId || mqttConnected) return;
    const reconnectTimer = setInterval(() => void connectMqtt(), 3000);
    return () => clearInterval(reconnectTimer);
  }, [token, studentId, mqttConnected]);

  return {
    isExtensionContext,
    authForm,
    registerMutation,
    loginMutation,
    screenshotMutation,
    replyChatMutation,
    studentId,
    token,
    teacherId,
    activeSessionId,
    replyMessage,
    chatFeed,
    lastCorrelationId,
    autoReplyEnabled,
    mqttConnected,
    unreadTeacherMessages,
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
  };
}
