import { useEffect, useState } from "react";
import { chatSocket } from "../api/socket";

export default function ChatPage() {
  const [roomId, setRoomId] = useState("factory-room-1");
  const [senderId, setSenderId] = useState("buyer-001");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // 실시간 이벤트 구독을 초기화한다.
    chatSocket.connect();
    chatSocket.emit("join-room", { roomId, senderId });

    const handleIncomingMessage = (payload) => {
      setMessages((prev) => [...prev, payload]);
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

    chatSocket.on("connect", handleConnect);
    chatSocket.on("disconnect", handleDisconnect);
    chatSocket.on("connect_error", handleConnectError);
    chatSocket.on("chat-message", handleIncomingMessage);

    return () => {
      chatSocket.off("chat-message", handleIncomingMessage);
      chatSocket.off("connect", handleConnect);
      chatSocket.off("disconnect", handleDisconnect);
      chatSocket.off("connect_error", handleConnectError);
      chatSocket.disconnect();
    };
  }, [roomId, senderId]);

  const handleSend = () => {
    if (!message.trim()) return;

    chatSocket.emit("chat-message", {
      roomId,
      senderId,
      message,
      timestamp: new Date().toISOString(),
    });

    setMessage("");
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h2 className="mb-4 text-xl font-semibold">1:1 실시간 채팅</h2>
      <p className="mb-2 text-sm">
        연결 상태:{" "}
        <span className="font-semibold">
          {connectionStatus === "connected" ? "연결됨" : connectionStatus}
        </span>
      </p>
      {errorMessage && <p className="mb-3 text-sm text-red-600">{errorMessage}</p>}
      <div className="mb-4 grid gap-2 md:grid-cols-2">
        <input
          className="rounded border p-2"
          value={roomId}
          onChange={(event) => setRoomId(event.target.value)}
          placeholder="roomId"
        />
        <input
          className="rounded border p-2"
          value={senderId}
          onChange={(event) => setSenderId(event.target.value)}
          placeholder="senderId"
        />
      </div>

      <div className="mb-4 h-60 overflow-y-auto rounded border bg-slate-50 p-3">
        {messages.map((item, index) => (
          <div key={`${item.timestamp}-${index}`} className="mb-2 text-sm">
            <span className="font-medium">{item.senderId}:</span> {item.message}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border p-2"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && handleSend()}
          placeholder="메시지를 입력하세요"
        />
        <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={handleSend}>
          전송
        </button>
      </div>
    </div>
  );
}
