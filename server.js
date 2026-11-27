// レスバトル・キーボード音楽 サーバー
// 起動: npm start  →  スマホ: http://<host>:3000/   会場PC: http://<host>:3000/stage.html?key=<STAGE_KEY>
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const STAGE_KEY = process.env.STAGE_KEY || "stage"; // 会場PC用の合言葉（本番では必ず変える）

// NGワード（必要に応じて追加）
const NG_WORDS = ["死ね", "殺す", "しね", "ころす", "きえろ", "消えろ"];

const app = express();
app.use(express.static(__dirname + "/public"));
const server = http.createServer(app);
const io = new Server(server);

let nextId = 1;
const messages = []; // 直近のメッセージ
const online = new Map(); // id -> {id,name,os}
const MAX_MESSAGES = 200;

function maskNG(text) {
  let t = text;
  for (const w of NG_WORDS) t = t.split(w).join("●".repeat(w.length));
  return t;
}

io.on("connection", (socket) => {
  const isStage = socket.handshake.auth && socket.handshake.auth.key === STAGE_KEY;

  if (isStage) {
    socket.join("stage");
    socket.emit("init", { messages, users: [...online.values()] });
    socket.on("deleteMessage", (id) => {
      const i = messages.findIndex((m) => m.id === id);
      if (i >= 0) messages.splice(i, 1);
      io.emit("deleted", id);
    });
    return;
  }

  // 参加者
  const user = {
    id: nextId++,
    os: "other",
    name: "",
    lastKey: 0,
    keyCount: 0,
    keyWindow: Date.now(),
    lastMsg: 0,
  };
  user.name = "名無し" + String(user.id).padStart(3, "0");
  socket.emit("init", { messages, name: user.name, id: user.id });

  socket.on("hello", (info) => {
    const os = info && info.os;
    user.os = os === "ios" || os === "android" ? os : "other";
    online.set(user.id, { id: user.id, name: user.name, os: user.os });
    io.to("stage").emit("join", { id: user.id, name: user.name, os: user.os });
  });

  // 入力イベント: type = "char" | "delete" | "enter"
  socket.on("k", (type) => {
    if (type !== "char" && type !== "delete" && type !== "enter") return;
    const now = Date.now();
    // 1人あたり毎秒30回までに制限
    if (now - user.keyWindow > 1000) { user.keyWindow = now; user.keyCount = 0; }
    if (++user.keyCount > 30) return;
    io.to("stage").emit("k", { id: user.id, os: user.os, t: type });
  });

  socket.on("msg", (text) => {
    const now = Date.now();
    if (now - user.lastMsg < 800) return; // 連投制限
    user.lastMsg = now;
    text = String(text || "").trim().slice(0, 140);
    if (!text) return;
    const m = { id: now + "-" + user.id, uid: user.id, name: user.name, os: user.os, text: maskNG(text), at: now };
    messages.push(m);
    if (messages.length > MAX_MESSAGES) messages.shift();
    io.emit("msg", m);
  });

  socket.on("disconnect", () => {
    online.delete(user.id);
    io.to("stage").emit("leave", { id: user.id });
  });
});

server.listen(PORT, () => {
  console.log(`起動しました: http://localhost:${PORT}/`);
  console.log(`会場PC用: http://localhost:${PORT}/stage.html?key=${STAGE_KEY}`);
});
