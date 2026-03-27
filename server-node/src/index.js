import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "server-node" });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  // 방 단위 1:1 채팅을 위한 기본 이벤트
  socket.on("join-room", ({ roomId }) => {
    socket.join(roomId);
  });

  socket.on("chat-message", (payload) => {
    io.to(payload.roomId).emit("chat-message", payload);
  });
});

const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log(`Chat server listening on port ${port}`);
});
