import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { apiClient } from "../api/client";
import { ENV } from "../utils/env";

const IDLE = "idle";
const PENDING = "pending";
const OK = "ok";
const FAIL = "fail";

function Badge({ status, label }) {
  const color =
    status === OK ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
    : status === FAIL ? "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100"
    : status === PENDING ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${color}`}>{label}</span>
  );
}

export default function ConnectionTest() {
  const [springHealth, setSpringHealth] = useState({ status: IDLE, detail: "" });
  const [springApi, setSpringApi] = useState({ status: IDLE, detail: "" });
  const [nodeRest, setNodeRest] = useState({ status: IDLE, detail: "" });
  const [aiHealth, setAiHealth] = useState({ status: IDLE, detail: "" });
  const [socketStatus, setSocketStatus] = useState({ status: IDLE, detail: "" });
  const socketRef = useRef(null);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const pingSpringHealth = useCallback(async () => {
    setSpringHealth({ status: PENDING, detail: "" });
    try {
      const { data } = await apiClient.get("/health");
      const ok = data?.success === true && data?.data?.status === "ok";
      setSpringHealth({
        status: ok ? OK : FAIL,
        detail: ok ? JSON.stringify(data?.data ?? {}) : JSON.stringify(data ?? {}),
      });
    } catch (e) {
      setSpringHealth({ status: FAIL, detail: e?.message || "error" });
    }
  }, []);

  const pingSpringCompanies = useCallback(async () => {
    setSpringApi({ status: PENDING, detail: "" });
    try {
      const { data } = await apiClient.get("/companies", { params: { region: "SEOUL" } });
      const list = data?.success ? data.data : [];
      const n = Array.isArray(list) ? list.length : 0;
      setSpringApi({
        status: OK,
        detail: `공장 ${n}개 조회됨 (region=SEOUL)`,
      });
    } catch (e) {
      setSpringApi({ status: FAIL, detail: e?.message || "error" });
    }
  }, []);

  const pingNode = useCallback(async () => {
    setNodeRest({ status: PENDING, detail: "" });
    try {
      const base = ENV.SOCKET_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/chat/rooms/1`);
      const ok = res.ok;
      setNodeRest({
        status: ok ? OK : FAIL,
        detail: `HTTP ${res.status}`,
      });
    } catch (e) {
      setNodeRest({ status: FAIL, detail: e?.message || "error" });
    }
  }, []);

  const pingAi = useCallback(async () => {
    setAiHealth({ status: PENDING, detail: "" });
    try {
      const res = await fetch("http://localhost:8000/health");
      const json = await res.json().catch(() => ({}));
      const ok = res.ok && json?.status === "ok";
      setAiHealth({
        status: ok ? OK : FAIL,
        detail: JSON.stringify(json),
      });
    } catch (e) {
      setAiHealth({ status: FAIL, detail: e?.message || "error" });
    }
  }, []);

  const pingSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocketStatus({ status: PENDING, detail: "" });
    const socket = io(ENV.SOCKET_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: false,
      timeout: 8000,
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      setSocketStatus({ status: OK, detail: `id=${socket.id}` });
      socket.disconnect();
      socketRef.current = null;
    });
    socket.on("connect_error", (err) => {
      setSocketStatus({ status: FAIL, detail: err?.message || "connect_error" });
    });
  }, []);

  const label = (status) =>
    status === OK ? "연결됨"
    : status === FAIL ? "실패"
    : status === PENDING ? "확인 중"
    : "대기";

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <div>
        <h1 className="text-2xl font-extrabold text-on-surface">연결 진단 (/dev/connection-test)</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Spring · Node REST · AI · Socket.io 상태를 빠르게 확인합니다.
        </p>
      </div>

      <ul className="space-y-4">
        <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <p className="font-semibold text-on-surface">Spring Boot Health</p>
            <p className="text-xs text-on-surface-variant">GET {ENV.API_BASE_URL}/health</p>
            {springHealth.detail && (
              <p className="mt-1 font-mono text-[11px] text-slate-500">{springHealth.detail}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge status={springHealth.status} label={label(springHealth.status)} />
            <button
              type="button"
              onClick={pingSpringHealth}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Ping
            </button>
          </div>
        </li>

        <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <p className="font-semibold text-on-surface">Spring Boot API</p>
            <p className="text-xs text-on-surface-variant">GET /companies?region=SEOUL</p>
            {springApi.detail && (
              <p className="mt-1 font-mono text-[11px] text-slate-500">{springApi.detail}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge status={springApi.status} label={label(springApi.status)} />
            <button
              type="button"
              onClick={pingSpringCompanies}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Ping
            </button>
          </div>
        </li>

        <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <p className="font-semibold text-on-surface">Node.js Chat REST</p>
            <p className="text-xs text-on-surface-variant">GET {ENV.SOCKET_URL}/api/chat/rooms/1</p>
            {nodeRest.detail && (
              <p className="mt-1 font-mono text-[11px] text-slate-500">{nodeRest.detail}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge status={nodeRest.status} label={label(nodeRest.status)} />
            <button
              type="button"
              onClick={pingNode}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Ping
            </button>
          </div>
        </li>

        <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <p className="font-semibold text-on-surface">Python AI Health</p>
            <p className="text-xs text-on-surface-variant">GET http://localhost:8000/health</p>
            {aiHealth.detail && (
              <p className="mt-1 font-mono text-[11px] text-slate-500">{aiHealth.detail}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge status={aiHealth.status} label={label(aiHealth.status)} />
            <button
              type="button"
              onClick={pingAi}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Ping
            </button>
          </div>
        </li>

        <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <p className="font-semibold text-on-surface">Socket.io</p>
            <p className="text-xs text-on-surface-variant">io({ENV.SOCKET_URL})</p>
            {socketStatus.detail && (
              <p className="mt-1 font-mono text-[11px] text-slate-500">{socketStatus.detail}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              status={socketStatus.status}
              label={
                socketStatus.status === OK ? "소켓 연결됨"
                : socketStatus.status === FAIL ? "소켓 실패"
                : socketStatus.status === PENDING ? "확인 중"
                : "대기"
              }
            />
            <button
              type="button"
              onClick={pingSocket}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Ping
            </button>
          </div>
        </li>
      </ul>
    </div>
  );
}
