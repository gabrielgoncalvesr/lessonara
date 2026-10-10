"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type JitsiApi = { addListener(event: string, callback: (data: { id?: string; on?: boolean; error?: { isFatal?: boolean } }) => void): void; executeCommand(command: string, ...args: unknown[]): void; pinParticipant(id: string): void; dispose(): void };
declare global { interface Window { JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi } }
type JoinResponse = { error?: string; opensAt?: string; closesAt?: string; jitsiUrl: string; roomName: string; jwt: string; displayName: string; lesson: { title: string } };

export function Classroom({ joinUrl, backHref }: { joinUrl: string; backHref: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ message: string; window?: string; active?: boolean; left?: boolean; loading?: boolean }>({ message: "Preparando sua aula…", loading:true });
  useEffect(() => {
    const controller = new AbortController();
    let api: JitsiApi | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let script: HTMLScriptElement | null = null;
    const fail = (message: string) => { if (controller.signal.aborted) return; clearTimeout(timer); api?.dispose(); api = null; setState({ message }); };
    async function start() {
      timer = setTimeout(() => { fail("O servidor de vídeo não respondeu. Tente novamente."); controller.abort(); },30_000);
      try {
        const response = await fetch(joinUrl, { method: "POST", cache: "no-store", signal: controller.signal });
        const data = await response.json() as JoinResponse;
        if (controller.signal.aborted) return;
        if (!response.ok) {
          clearTimeout(timer);
          const format = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
          setState({ message: data.error ?? "Não foi possível entrar na aula.", window: data.opensAt && data.closesAt ? `Acesso de ${format(data.opensAt)} até ${format(data.closesAt)} (São Paulo).` : undefined });
          return;
        }
        if (!window.JitsiMeetExternalAPI) await new Promise<void>((resolve, reject) => {
          script = document.createElement("script"); script.src = `${data.jitsiUrl}/external_api.js`; script.async = true;
          script.onload = () => resolve(); script.onerror = () => reject(new Error("video_unavailable")); document.head.appendChild(script);
          controller.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        });
        if (controller.signal.aborted || !container.current || !window.JitsiMeetExternalAPI) return;
        clearTimeout(timer);
        api = new window.JitsiMeetExternalAPI(new URL(data.jitsiUrl).host, { roomName: data.roomName, jwt: data.jwt, parentNode: container.current, width: "100%", height: "100%", lang: "pt-BR", userInfo: { displayName: data.displayName },
          configOverwrite: { prejoinConfig: { enabled: true }, disableDeepLinking: true, startWithAudioMuted: true, startWithVideoMuted: true } });
        setState({ message: "Conectando à sala…", active: true });
        let myId: string | undefined;
        api.addListener("videoConferenceJoined", ({ id }) => { clearTimeout(timer); myId = id; api?.executeCommand("localSubject", data.lesson.title); });
        api.addListener("errorOccurred", ({ error }) => { if (error?.isFatal) fail("Não foi possível conectar à videochamada. Tente novamente."); });
        api.addListener("screenSharingStatusChanged", ({ on }) => { if (on && myId) api?.pinParticipant(`${myId}-v1`); });
        api.addListener("readyToClose", () => { clearTimeout(timer); api?.dispose(); api = null; if (!controller.signal.aborted) setState({ message: "Você saiu da aula.", left: true }); });
        // Pré-entrada pode permanecer aberta enquanto a pessoa escolhe seus dispositivos.
        timer = setTimeout(() => { if (!container.current?.querySelector("iframe")) fail("O servidor de vídeo não respondeu."); }, 30_000);
      } catch { fail("Não foi possível carregar a sala. Verifique sua conexão e tente novamente."); }
    }
    void start();
    return () => { controller.abort(); clearTimeout(timer); api?.dispose(); script?.remove(); };
  }, [joinUrl, attempt]);
  return <main className="classroom-screen"><div ref={container} className="classroom-video" hidden={!state.active} />{!state.active && <section className="classroom-state" role="status">{state.loading ? <p className="flex items-center justify-center gap-3"><span className="action-spinner" aria-hidden="true"/>{state.message}</p> : <h1>{state.message}</h1>}{state.window && <p>{state.window}</p>}{!state.loading && <div className="flex flex-wrap justify-center gap-3"><button className="btn" onClick={() => { setState({ message: "Preparando sua aula…", loading:true }); setAttempt(a => a + 1); }}>{state.left ? "Entrar novamente" : "Tentar novamente"}</button><Link className="btn-ghost" href={backHref}>Voltar ao meu espaço</Link></div>}</section>}</main>;
}
