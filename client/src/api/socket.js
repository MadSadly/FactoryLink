import { io } from "socket.io-client";
import { ENV } from "../utils/env";

export const chatSocket = io(ENV.SOCKET_URL, {
  autoConnect: false,
  path: "/socket.io",
});
