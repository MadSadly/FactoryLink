import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Send, Circle, Loader2, MessageCircle, FileText, Receipt } from "lucide-react";
import { chatSocket } from "../api/socket";
import { chatApiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { getUserIdFromToken } from "../auth/token";

function formatMsgTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatRoomTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) return formatMsgTime(iso);
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function avatarLetter(name) {
  const s = String(name || "?").trim();
  return s ? s.charAt(0) : "?";
}

export default function ChatPage() {
  const { token } = useAuth();
  const userId = token ? getUserIdFromToken(token) : null;
  const [searchParams, setSearchParams] = useSearchParams();
  const roomFromUrl = searchParams.get("room");

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");
  const [roomId, setRoomId] = useState(roomFromUrl || "");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [errorMessage, setErrorMessage] = useState("");
  const listEndRef = useRef(null);
  const textareaRef = useRef(null);

  const loadRooms = useCallback(async () => {
    if (userId == null) return;
    setRoomsLoading(true);
    try {
      const { data } = await chatApiClient.get(`/chat/rooms/${userId}`);
      const inner = data?.success ? data.data : data;
      setRooms(Array.isArray(inner) ? inner : []);
    } catch {
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (roomFromUrl) setRoomId(roomFromUrl);
  }, [roomFromUrl]);

  const fetchMessages = useCallback(
    async (rid) => {
      const id = Number(rid);
      if (Number.isNaN(id)) return;
      try {
        const { data } = await chatApiClient.get(`/chat/rooms/${id}/messages`);
        const inner = data?.success ? data.data : data;
        const rows = Array.isArray(inner) ? inner : [];
        setMessages(
          rows.map((m) => ({
            id: m.id,
            senderLabel: m.senderName || `사용자`,
            message: m.message,
            createdAt: m.createdAt,
            isMine: Number(m.senderUserId) === userId,
          })),
        );
      } catch {
        setMessages([]);
      }
    },
    [userId],
  );

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const rid = Number(roomId);
    if (!Number.isFinite(rid) || userId == null) return;
    fetchMessages(rid);
  }, [roomId, userId, fetchMessages]);

  useEffect(() => {
    chatSocket.connect();
    const rid = Number(roomId);
    const uid = userId != null ? Number(userId) : NaN;
    if (!Number.isNaN(rid) && !Number.isNaN(uid)) {
      chatSocket.emit("join_room", { roomId: rid, userId: uid });
    }

    const handleIncomingMessage = (payload) => {
      const uid = Number(userId);
      const sid = payload.senderUserId != null ? Number(payload.senderUserId) : NaN;
      const isMine = Number.isFinite(sid) && sid === uid;
      setMessages((prev) => [
        ...prev,
        {
          id: payload.id ?? `srv-${Date.now()}-${Math.random()}`,
          senderLabel: payload.senderName || `사용자 ${payload.senderUserId}`,
          message: payload.message,
          createdAt: payload.createdAt,
          isMine,
        },
      ]);
      loadRooms();
    };

    const handleConnect = () => {
      setConnectionStatus("connected");
      setErrorMessage("");
    };

    const handleDisconnect = () => {
      setConnectionStatus("disconnected");
    };

    const handleConnectError = (error) => {
      setConnectionStatus("error");
      setErrorMessage(error.message || "채팅 서버에 연결할 수 없습니다.");
    };

    const handleServerError = (payload) => {
      setErrorMessage(payload?.message || "채팅 오류");
    };

    chatSocket.on("connect", handleConnect);
    chatSocket.on("disconnect", handleDisconnect);
    chatSocket.on("connect_error", handleConnectError);
    chatSocket.on("message_received", handleIncomingMessage);
    chatSocket.on("error", handleServerError);

    return () => {
      chatSocket.off("message_received", handleIncomingMessage);
      chatSocket.off("connect", handleConnect);
      chatSocket.off("disconnect", handleDisconnect);
      chatSocket.off("connect_error", handleConnectError);
      chatSocket.off("error", handleServerError);
      chatSocket.disconnect();
    };
  }, [roomId, userId, loadRooms]);

  const handleSend = () => {
    if (!message.trim()) return;
    const rid = Number(roomId);
    const uid = userId != null ? Number(userId) : NaN;
    if (Number.isNaN(rid) || Number.isNaN(uid)) {
      setErrorMessage("채팅방과 로그인 정보를 확인하세요.");
      return;
    }

    const text = message.trim();
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        senderLabel: "나",
        message: text,
        createdAt: new Date().toISOString(),
        isMine: true,
      },
    ]);

    chatSocket.emit("send_message", {
      roomId: rid,
      userId: uid,
      message: text,
    });

    setMessage("");
  };

  const selectRoom = (id) => {
    const s = String(id);
    setRoomId(s);
    setSearchParams({ room: s });
    setMessages([]);
  };

  const filteredRooms = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) => {
      const name = String(r.otherCompanyName || "").toLowerCase();
      const prev = String(r.lastMessagePreview || "").toLowerCase();
      return name.includes(q) || prev.includes(q);
    });
  }, [rooms, roomSearch]);

  const currentRoom = rooms.find((r) => String(r.roomId) === String(roomId));

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex min-h-[min(680px,calc(100vh-10rem))] flex-col">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5ede6]">채팅</h1>
          <p className="mt-1 text-sm text-[#b8907a]">거래 상대와 실시간으로 메시지를 주고받습니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/contract"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50"
          >
            <FileText className="h-4 w-4 text-orange-600" />
            계약서
          </Link>
          <Link
            to="/contract"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50"
            title="견적·조건은 AI 계약서 화면에서 입력·초안 작성"
          >
            <Receipt className="h-4 w-4 text-orange-600" />
            견적서
          </Link>
        </div>
      </div>

      {userId == null && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          채팅을 쓰려면 로그인해 주세요.
        </p>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <aside className="flex w-72 shrink-0 flex-col border-r border-stone-200 bg-stone-50">
          <div className="border-b border-stone-200 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                placeholder="대화방 검색"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>
          <div className="fl-scroll-light min-h-0 flex-1 overflow-y-auto">
            {roomsLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-stone-500">
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                불러오는 중…
              </div>
            )}
            {!roomsLoading &&
              filteredRooms.map((r) => {
                const active = String(r.roomId) === String(roomId);
                return (
                  <button
                    key={r.roomId}
                    type="button"
                    onClick={() => selectRoom(r.roomId)}
                    className={`flex w-full gap-3 border-b border-stone-200/90 px-3 py-3 text-left transition-colors ${
                      active ? "bg-orange-50" : "hover:bg-white"
                    }`}
                  >
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-200 text-sm font-bold text-[#c2410c]">
                      {avatarLetter(r.otherCompanyName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <span className="truncate text-sm font-semibold text-stone-900">
                          {r.otherCompanyName || "상대 업체"}
                        </span>
                        <span className="shrink-0 text-[10px] text-stone-400">
                          {formatRoomTime(r.lastMessageAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">
                        {r.lastMessagePreview || "메시지 없음"}
                      </p>
                    </div>
                  </button>
                );
              })}
            {!roomsLoading && filteredRooms.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-stone-500">대화방이 없습니다.</p>
            )}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-stone-900">
                {currentRoom?.otherCompanyName || (roomId ? `방 #${roomId}` : "대화 선택")}
              </h2>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
                <Circle
                  className={`h-2 w-2 ${connectionStatus === "connected" ? "fill-emerald-500 text-emerald-500" : "fill-stone-300 text-stone-300"}`}
                />
                {connectionStatus === "connected" ? "연결됨" : connectionStatus}
              </div>
            </div>
            <MessageCircle className="h-5 w-5 shrink-0 text-[#c2410c]" aria-hidden />
          </header>

          {errorMessage && (
            <p className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{errorMessage}</p>
          )}

          <div className="fl-scroll-light min-h-0 flex-1 space-y-3 overflow-y-auto bg-stone-50/80 p-4">
            {!roomId && (
              <p className="py-12 text-center text-sm text-stone-500">왼쪽에서 대화방을 선택하세요.</p>
            )}
            {roomId && messages.length === 0 && (
              <p className="py-12 text-center text-sm text-stone-500">메시지가 없습니다.</p>
            )}
            {messages.map((item) => (
              <div key={item.id} className={`flex w-full flex-col ${item.isMine ? "items-end" : "items-start"}`}>
                <div
                  className={
                    item.isMine
                      ? "max-w-[85%] rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 px-4 py-2.5 text-sm text-white shadow-md"
                      : "max-w-[85%] rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 shadow-sm"
                  }
                >
                  {!item.isMine && <p className="mb-1 text-xs font-semibold text-[#c2410c]">{item.senderLabel}</p>}
                  <p className="whitespace-pre-wrap break-words">{item.message}</p>
                </div>
                <span className="mt-1 px-1 text-[10px] text-stone-400">{formatMsgTime(item.createdAt)}</span>
              </div>
            ))}
            <div ref={listEndRef} />
          </div>

          <div className="shrink-0 border-t border-stone-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={2}
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={roomId ? "메시지 입력 (Enter 전송 · Shift+Enter 줄바꿈)" : "대화방을 선택하세요"}
                disabled={!roomId}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!roomId}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md transition hover:brightness-105 disabled:opacity-40"
                aria-label="전송"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
