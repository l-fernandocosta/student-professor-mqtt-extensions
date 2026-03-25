import type { MqttClient } from "mqtt";
import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

const MqttTopics = {
  chatDeliver: (sessionId: string) => `chat/session/${sessionId}/deliver`,
  screenshotResponse: (teacherId: string) => `screenshot/response/${teacherId}`
};

const authSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres")
});

type AuthFormData = z.infer<typeof authSchema>;
type ScreenshotUiState = "idle" | "requesting" | "waiting" | "received" | "error";
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
  for (const nested of Object.values(candidate)) {
    const found = pickConnectExport(nested, depth + 1);
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

export function useProfessorHome() {
  const apiBase = useMemo(() => "http://localhost:3000/api", []);
  const isExtensionContext =
    typeof window !== "undefined" && window.location?.protocol === "chrome-extension:";
  const STORAGE_KEY = "professorSessionState";
  const [teacherId, setTeacherId] = useState("");
  const [token, setToken] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const [mqttConnected, setMqttConnected] = useState(false);
  const [chatFeed, setChatFeed] = useState<ChatMessage[]>([]);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState("");
  const [screenshotUiState, setScreenshotUiState] = useState<ScreenshotUiState>("idle");
  const [lastScreenshotEventAt, setLastScreenshotEventAt] = useState("");
  const [activityMessage, setActivityMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [showScreenshotDialog, setShowScreenshotDialog] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const mqttRef = useRef<MqttClient | null>(null);
  const recentChatKeysRef = useRef<string[]>([]);
  const sessionIdRef = useRef("");
  const teacherIdRef = useRef("");

  const authForm = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "prof@example.com", password: "12345678" }
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
      teacherId,
      token,
      selectedStudentId,
      sessionId,
      chatFeed,
      screenshotDataUrl,
      screenshotUiState,
      correlationId,
      lastScreenshotEventAt,
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

  const onlineQuery = useQuery({
    queryKey: ["presence", "online"],
    queryFn: async () => {
      const response = await fetch(`${apiBase}/presence/online`);
      if (!response.ok) throw new Error("Falha ao carregar alunos online");
      return (await response.json()) as { studentIds: string[] };
    },
    enabled: false
  });

  const registerMutation = useMutation({
    mutationFn: async (values: AuthFormData) => {
      const response = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, role: "teacher" })
      });
      if (!response.ok) throw new Error("Falha ao registrar professor");
      return (await response.json()) as { userId: string };
    },
    onSuccess: (data) => {
      setTeacherId(data.userId);
      pushLog(`Professor registrado: ${data.userId}`);
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
      setTeacherId(data.userId);
      persistSessionState({ token: data.accessToken, teacherId: data.userId });
      pushLog(`Login OK: ${data.userId}`);
      pushToast("Login realizado com sucesso.");
    },
    onError: (error) => pushLog((error as Error).message)
  });

  const chatMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedStudentId || !sessionId) throw new Error("Selecione um aluno para iniciar conversa");
      const client = mqttRef.current;
      if (!client || !mqttConnected) throw new Error("MQTT desconectado. Aguarde reconexao.");
      client.publish(
        `chat/session/${sessionId}/send`,
        JSON.stringify({
          eventId: crypto.randomUUID(),
          eventType: "CHAT_MESSAGE",
          sessionId,
          senderId: teacherId,
          receiverId: selectedStudentId,
          payload: { message: content },
          timestamp: new Date().toISOString(),
          version: 1
        }),
        { qos: 1 }
      );
      return { published: true };
    },
    onSuccess: (_, sentMessage) => {
      appendChatMessage("teacher", sentMessage);
      pushActivity("Mensagem enviada ao aluno.");
      pushToast("Mensagem enviada.");
      setMessage("");
    },
    onError: (error) => pushLog((error as Error).message)
  });

  const screenshotMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudentId) throw new Error("Selecione um aluno para solicitar screenshot");
      const response = await fetch(`${apiBase}/screenshot/request`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ teacherId, studentId: selectedStudentId })
      });
      if (!response.ok) throw new Error("Falha ao solicitar screenshot");
      return (await response.json()) as { correlationId: string };
    },
    onSuccess: (data) => {
      setCorrelationId(data.correlationId);
      setScreenshotUiState("waiting");
      setLastScreenshotEventAt(new Date().toISOString());
      pushActivity("Solicitação de screenshot enviada.");
      pushToast("Solicitação enviada.");
    },
    onMutate: () => {
      setScreenshotUiState("requesting");
      setScreenshotDataUrl("");
    },
    onError: (error) => {
      setScreenshotUiState("error");
      pushLog((error as Error).message);
    }
  });

  const connectMqtt = async (): Promise<void> => {
    if (mqttRef.current) return;
    try {
      const mqttConnect = await loadMqttConnect();
      const client = mqttConnect("ws://localhost:8083/mqtt", { reconnectPeriod: 1500 });
      mqttRef.current = client;
      client.on("connect", () => setMqttConnected(true));
      client.on("message", (topic, payload) => {
        const raw = payload.toString();
        try {
          const parsed = JSON.parse(raw) as {
            senderId?: string;
            payload?: { message?: string; imageBase64?: string; imageUrl?: string };
            correlationId?: string;
          };
          const currentSessionId = sessionIdRef.current;
          const currentTeacherId = teacherIdRef.current;
          if (currentSessionId && topic === MqttTopics.chatDeliver(currentSessionId)) {
            const text = parsed.payload?.message ?? raw;
            const senderId = parsed.senderId ?? "";
            if (!senderId || senderId !== currentTeacherId) {
              appendChatMessage("student", text);
              pushActivity("Nova mensagem do aluno.");
            }
          }
          if (currentTeacherId && topic === MqttTopics.screenshotResponse(currentTeacherId)) {
            const imageBase64 = parsed.payload?.imageBase64;
            const imageUrl = parsed.payload?.imageUrl;
            if (imageBase64) {
              setScreenshotDataUrl(`data:image/png;base64,${imageBase64}`);
              setScreenshotUiState("received");
              setLastScreenshotEventAt(new Date().toISOString());
              pushActivity("Screenshot recebido com sucesso.");
              pushToast("Screenshot recebido.");
            } else if (imageUrl) {
              setScreenshotDataUrl(imageUrl);
              setScreenshotUiState("received");
              setLastScreenshotEventAt(new Date().toISOString());
              pushActivity("Screenshot recebido com sucesso.");
              pushToast("Screenshot recebido.");
            }
            if (parsed.correlationId) setCorrelationId(parsed.correlationId);
          }
        } catch {
          pushLog(`Mensagem MQTT invalida em ${topic}`);
        }
      });
      client.on("close", () => {
        setMqttConnected(false);
        mqttRef.current = null;
      });
      client.on("error", (error) => {
        pushLog(`MQTT erro: ${error.message}`);
        mqttRef.current = null;
      });
    } catch (error) {
      pushLog((error as Error).message);
    }
  };

  const disconnectMqtt = (): void => {
    if (!mqttRef.current) return;
    mqttRef.current.end(true);
    mqttRef.current = null;
    setMqttConnected(false);
  };

  const startConversation = (studentId: string): void => {
    const nextSessionId = crypto.randomUUID();
    setSelectedStudentId(studentId);
    setSessionId(nextSessionId);
    const client = mqttRef.current;
    if (client && mqttConnected) {
      client.subscribe(MqttTopics.chatDeliver(nextSessionId), { qos: 1 });
    }
    setChatFeed([]);
    setScreenshotDataUrl("");
    setScreenshotUiState("idle");
    pushToast("Conversa iniciada.");
  };

  const sendMessage = (): void => {
    if (!message.trim()) return;
    chatMutation.mutate(message.trim());
  };

  const requestScreenshot = (): void => {
    screenshotMutation.mutate();
  };

  useEffect(() => {
    const chromeApi = (globalThis as unknown as { chrome?: any }).chrome;
    if (!isExtensionContext || !chromeApi?.storage?.local) return;
    chromeApi.storage.local.get([STORAGE_KEY], (result: Record<string, unknown>) => {
      const stored = (result?.[STORAGE_KEY] as Record<string, unknown> | undefined) ?? undefined;
      if (!stored) return;
      setTeacherId(String(stored.teacherId ?? ""));
      setToken(String(stored.token ?? ""));
      setSelectedStudentId(String(stored.selectedStudentId ?? ""));
      setSessionId(String(stored.sessionId ?? ""));
      setScreenshotDataUrl(String(stored.screenshotDataUrl ?? ""));
      setScreenshotUiState((stored.screenshotUiState as ScreenshotUiState) ?? "idle");
      setCorrelationId(String(stored.correlationId ?? ""));
      setLastScreenshotEventAt(String(stored.lastScreenshotEventAt ?? ""));
      const storedFeed = Array.isArray(stored.chatFeed) ? (stored.chatFeed as ChatMessage[]) : [];
      setChatFeed(storedFeed);
      pushLog("Sessao do professor restaurada do storage local.");
    });
  }, [isExtensionContext]);

  useEffect(() => {
    persistSessionState();
  }, [
    teacherId,
    token,
    selectedStudentId,
    sessionId,
    chatFeed,
    screenshotDataUrl,
    screenshotUiState,
    correlationId,
    lastScreenshotEventAt
  ]);

  useEffect(() => {
    if (!sessionId || !teacherId || chatFeed.length > 0) return;
    void (async () => {
      try {
        const response = await fetch(`${apiBase}/chat/history?sessionId=${encodeURIComponent(sessionId)}&limit=50`);
        if (!response.ok) return;
        const history = (await response.json()) as Array<{ senderId: string; content: string; createdAt: string }>;
        const restored = [...history]
          .reverse()
          .map((item) => ({
            from: item.senderId === teacherId ? ("teacher" as const) : ("student" as const),
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
  }, [apiBase, sessionId, teacherId, chatFeed.length]);

  useEffect(() => {
    const client = mqttRef.current;
    if (!client || !mqttConnected) return;
    if (sessionId) client.subscribe(MqttTopics.chatDeliver(sessionId), { qos: 1 });
    if (teacherId) client.subscribe(MqttTopics.screenshotResponse(teacherId), { qos: 1 });
  }, [mqttConnected, sessionId, teacherId]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    teacherIdRef.current = teacherId;
  }, [teacherId]);

  useEffect(() => {
    if (token && teacherId) {
      void connectMqtt();
    }
  }, [token, teacherId]);

  useEffect(() => {
    if (!token || !teacherId || mqttConnected) return;
    const reconnectTimer = setInterval(() => void connectMqtt(), 3000);
    return () => clearInterval(reconnectTimer);
  }, [token, teacherId, mqttConnected]);

  return {
    authForm,
    registerMutation,
    loginMutation,
    onlineQuery,
    chatMutation,
    screenshotMutation,
    teacherId,
    token,
    selectedStudentId,
    sessionId,
    message,
    correlationId,
    mqttConnected,
    chatFeed,
    screenshotDataUrl,
    screenshotUiState,
    lastScreenshotEventAt,
    activityMessage,
    toastMessage,
    showScreenshotDialog,
    logs,
    setMessage,
    setShowScreenshotDialog,
    disconnectMqtt,
    startConversation,
    sendMessage,
    requestScreenshot
  };
}
