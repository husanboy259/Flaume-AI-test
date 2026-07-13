// 1. Open the secrets drawer (.env)
require("dotenv").config();

// 2. Bring in the tools
const express = require("express");
const cors = require("cors");
const { register, login, requireAuth } = require("./auth");
const chatRoutes = require("./chat");
const voice = require("./voice");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 3. Build the robot's body
const app = express();

// 4. House rules
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// 5. The doors
app.get("/api/health", (req, res) => {
  res.json({ status: "alive!" });
});

app.post("/api/auth/register", register);
app.post("/api/auth/login", login);

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  res.json({ id: user.id, name: user.name, email: user.email, plan: user.plan, avatar: user.avatar });
});

app.post("/api/chat", requireAuth, chatRoutes.chat);
app.get("/api/conversations", requireAuth, chatRoutes.listConversations);
app.get("/api/conversations/:id", requireAuth, chatRoutes.getConversation);
app.patch("/api/conversations/:id", requireAuth, chatRoutes.updateConversation);
app.delete("/api/conversations/:id", requireAuth, chatRoutes.deleteConversation);
app.delete("/api/conversations", requireAuth, chatRoutes.clearHistory);

// -- voice: Whisper ears --
app.post("/api/voice/chat", requireAuth, voice.upload.single("audio"), voice.voiceChat);
app.get("/api/voice/sessions", requireAuth, voice.listSessions);

// 6. LAST LINE: stay awake and listen
app.listen(process.env.PORT, () =>
  console.log(`🤖 FLAUME brain awake on http://localhost:${process.env.PORT}`)
);
