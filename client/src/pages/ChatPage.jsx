import { useEffect, useState } from "react";
import { chatSocket } from "../api/socket";
import { btnPrimaryClass, cardClass, inputClass } from "../lib/ui";

export default function ChatPage() {
  const [roomId, setRoomId] = useState("1");
  const [userId, setUserId] = useState("1");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    chatSocket.connect();
    const rid = Number(roomId);
    const uid = Number(userId);
    if (!Number.isNaN(rid) && !Number.isNaN(uid)) {
      chatSocket.emit("join_room", { roomId: rid, userId: uid });
    }

    const handleIncomingMessage = (payload) => {
      setMessages((prev) => [
        ...prev,
        {
          id: payload.id,
          senderLabel: payload.senderName || `user ${payload.senderUserId}`,
          message: payload.message,
          createdAt: payload.createdAt,
        },
      ]);
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
  }, [roomId, userId]);

  const handleSend = () => {
    if (!message.trim()) return;
    const rid = Number(roomId);
    const uid = Number(userId);
    if (Number.isNaN(rid) || Number.isNaN(uid)) {
      setErrorMessage("채팅방 ID와 사용자 ID는 숫자여야 합니다.");
      return;
    }

    chatSocket.emit("send_message", {
      roomId: rid,
      userId: uid,
      message: message.trim(),
    });

    setMessage("");
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-on-surface">1:1 실시간 채팅</h2>
        <p className="text-on-surface-variant">거래 상대와 실시간으로 메시지를 주고받습니다.</p>
      </div>

      <div className={cardClass}>
        <p className="mb-4 text-sm">
          연결 상태:{" "}
          <span className="font-semibold text-primary">
            {connectionStatus === "connected" ? "연결됨" : connectionStatus}
          </span>
        </p>
        {errorMessage && <p className="mb-4 rounded-lg bg-error-container/30 p-3 text-sm text-error">{errorMessage}</p>}

        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              채팅방 ID (숫자)
            </label>
            <input className={inputClass} value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="1" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
              사용자 ID (숫자)
            </label>
            <input className={inputClass} value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="1" />
          </div>
        </div>

        <div className="mb-4 max-h-72 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container/40 p-4">
          {messages.length === 0 && <p className="text-center text-sm text-on-surface-variant">메시지가 없습니다.</p>}
          {messages.map((item) => (
            <div key={item.id ?? `${item.createdAt}-${item.senderLabel}`} className="mb-3 text-sm">
              <span className="font-semibold text-primary">{item.senderLabel}</span>
              <span className="text-on-surface-variant"> · </span>
              {item.message}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className={`${inputClass} sm:flex-1`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="메시지를 입력하세요"
          />
          <button type="button" className={`${btnPrimaryClass} shrink-0`} onClick={handleSend}>
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
