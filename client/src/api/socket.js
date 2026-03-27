import { io } from "socket.io-client";

const chatSocketUrl = import.meta.env.VITE_CHAT_SERVER_URL || "http://localhost:3001";

export const chatSocket = io(chatSocketUrl, {
  autoConnect: false,
});
