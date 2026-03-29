import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import mysql from "mysql2/promise";

const PORT = Number(process.env.PORT || 3001);
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_NAME = process.env.DB_NAME || "factory_link";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "root";

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASS,
  waitForConnections: true,
  connectionLimit: 10,
});

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "server-node" });
});

app.get("/api/chat/rooms/:roomId/messages", async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    const before = req.query.before ? Number(req.query.before) : null;
    if (Number.isNaN(roomId)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Invalid room id",
      });
    }
    let sql = `
      SELECT m.id, m.message, m.created_at AS createdAt, u.name AS senderName
      FROM chat_messages m
      JOIN users u ON u.id = m.sender_user_id
      WHERE m.room_id = ?
    `;
    const params = [roomId];
    if (before != null && !Number.isNaN(before)) {
      sql += " AND m.id < ?";
      params.push(before);
    }
    sql += " ORDER BY m.id DESC LIMIT 50";
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows.reverse(), message: "OK" });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      data: null,
      message: "메시지 조회 중 오류가 발생했습니다.",
    });
  }
});

app.get("/api/chat/rooms/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Invalid user id",
      });
    }
    const [urows] = await pool.query(
      "SELECT company_id AS companyId FROM users WHERE id = ?",
      [userId]
    );
    if (!urows.length || urows[0].companyId == null) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "사용자 또는 소속 회사를 찾을 수 없습니다.",
      });
    }
    const companyId = urows[0].companyId;
    const sql = `
      SELECT
        cr.id AS roomId,
        CASE
          WHEN cr.buyer_company_id = ? THEN sc.name
          ELSE bc.name
        END AS otherCompanyName,
        p.name AS partName,
        (SELECT cm.message FROM chat_messages cm WHERE cm.room_id = cr.id ORDER BY cm.id DESC LIMIT 1) AS lastMessagePreview,
        (SELECT cm.created_at FROM chat_messages cm WHERE cm.room_id = cr.id ORDER BY cm.id DESC LIMIT 1) AS lastMessageAt
      FROM chat_rooms cr
      JOIN companies bc ON bc.id = cr.buyer_company_id
      JOIN companies sc ON sc.id = cr.seller_company_id
      LEFT JOIN parts p ON p.id = cr.part_id
      WHERE cr.buyer_company_id = ? OR cr.seller_company_id = ?
      ORDER BY COALESCE(
        (SELECT MAX(cm.created_at) FROM chat_messages cm WHERE cm.room_id = cr.id),
        cr.created_at
      ) DESC, cr.id DESC
    `;
    const [rows] = await pool.query(sql, [companyId, companyId, companyId]);
    res.json({ success: true, data: rows, message: "OK" });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      data: null,
      message: "채팅방 목록 조회 중 오류가 발생했습니다.",
    });
  }
});

app.post("/api/chat/rooms", async (req, res) => {
  try {
    const { buyerCompanyId, sellerCompanyId, partId } = req.body || {};
    if (!buyerCompanyId || !sellerCompanyId) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "buyerCompanyId와 sellerCompanyId가 필요합니다.",
      });
    }
    const [existing] = await pool.query(
      `SELECT id AS roomId, buyer_company_id AS buyerCompanyId, seller_company_id AS sellerCompanyId,
              part_id AS partId, status, created_at AS createdAt
       FROM chat_rooms
       WHERE buyer_company_id = ? AND seller_company_id = ? AND part_id <=> ?`,
      [buyerCompanyId, sellerCompanyId, partId ?? null]
    );
    if (existing.length) {
      return res.status(200).json({
        success: true,
        data: existing[0],
        message: "기존 채팅방을 반환했습니다.",
      });
    }
    const [result] = await pool.query(
      `INSERT INTO chat_rooms (buyer_company_id, seller_company_id, part_id, status)
       VALUES (?, ?, ?, 'ACTIVE')`,
      [buyerCompanyId, sellerCompanyId, partId ?? null]
    );
    const roomId = result.insertId;
    const [rows] = await pool.query(
      `SELECT id AS roomId, buyer_company_id AS buyerCompanyId, seller_company_id AS sellerCompanyId,
              part_id AS partId, status, created_at AS createdAt
       FROM chat_rooms WHERE id = ?`,
      [roomId]
    );
    return res.status(201).json({
      success: true,
      data: rows[0],
      message: "채팅방이 생성되었습니다.",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      data: null,
      message: "채팅방 생성 중 오류가 발생했습니다.",
    });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("join_room", async (payload) => {
    try {
      const roomId = payload?.roomId;
      const userId = payload?.userId;
      if (roomId == null || userId == null) {
        socket.emit("error", { message: "roomId와 userId가 필요합니다." });
        return;
      }
      const [rooms] = await pool.query("SELECT id FROM chat_rooms WHERE id = ?", [
        roomId,
      ]);
      if (!rooms.length) {
        socket.emit("error", { message: "채팅방을 찾을 수 없습니다." });
        return;
      }
      const [users] = await pool.query("SELECT id FROM users WHERE id = ?", [userId]);
      if (!users.length) {
        socket.emit("error", { message: "사용자를 찾을 수 없습니다." });
        return;
      }
      socket.join(String(roomId));
      io.to(String(roomId)).emit("user_joined", { userId, roomId });
    } catch (e) {
      console.error(e);
      socket.emit("error", { message: "join_room 처리 중 오류가 발생했습니다." });
    }
  });

  socket.on("send_message", async (payload) => {
    try {
      const roomId = payload?.roomId;
      const userId = payload?.userId;
      const message = payload?.message;
      if (roomId == null || userId == null || message == null || String(message).trim() === "") {
        socket.emit("error", { message: "roomId, userId, message가 필요합니다." });
        return;
      }
      const [rooms] = await pool.query("SELECT id FROM chat_rooms WHERE id = ?", [
        roomId,
      ]);
      if (!rooms.length) {
        socket.emit("error", { message: "채팅방을 찾을 수 없습니다." });
        return;
      }
      const [users] = await pool.query("SELECT id FROM users WHERE id = ?", [userId]);
      if (!users.length) {
        socket.emit("error", { message: "사용자를 찾을 수 없습니다." });
        return;
      }
      const [ins] = await pool.query(
        `INSERT INTO chat_messages (room_id, sender_user_id, message) VALUES (?, ?, ?)`,
        [roomId, userId, String(message)]
      );
      const msgId = ins.insertId;
      const [rows] = await pool.query(
        `SELECT m.id, m.room_id AS roomId, m.sender_user_id AS senderUserId, u.name AS senderName,
                m.message, m.created_at AS createdAt
         FROM chat_messages m
         JOIN users u ON u.id = m.sender_user_id
         WHERE m.id = ?`,
        [msgId]
      );
      const row = rows[0];
      io.to(String(roomId)).emit("message_received", {
        id: row.id,
        roomId: row.roomId,
        senderUserId: row.senderUserId,
        senderName: row.senderName,
        message: row.message,
        createdAt: row.createdAt,
      });
    } catch (e) {
      console.error(e);
      socket.emit("error", { message: "메시지 전송 중 오류가 발생했습니다." });
    }
  });

  socket.on("leave_room", (payload) => {
    try {
      const roomId = payload?.roomId;
      if (roomId != null) {
        socket.leave(String(roomId));
      }
    } catch (e) {
      console.error(e);
    }
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Chat server listening on port ${PORT}`);
});
