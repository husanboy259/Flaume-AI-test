const { PrismaClient } = require("@prisma/client");
const { askGemini } = require("./ai");
const prisma = new PrismaClient();

// THE MAIN DOOR's brain: user says something, robot thinks, BOTH lines get remembered
async function chat(req, res) {
  const { conversationId, message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is empty" });

  let convo = null;
  if (conversationId) {
    convo = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: req.userId }, // only MY chats!
    });
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
  } else {
    convo = await prisma.conversation.create({
      data: { title: message.slice(0, 40), userId: req.userId },
    });
  }

  await prisma.message.create({
    data: { role: "user", content: message, conversationId: convo.id },
  });

  const reply = await askGemini(message);

  const aiMsg = await prisma.message.create({
    data: { role: "ai", content: reply, conversationId: convo.id },
  });

  res.json({ conversationId: convo.id, message: aiMsg });
}

async function listConversations(req, res) {
  const convos = await prisma.conversation.findMany({
    where: { userId: req.userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, isPinned: true, createdAt: true, updatedAt: true },
  });
  res.json(convos);
}

async function getConversation(req, res) {
  const convo = await prisma.conversation.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!convo) return res.status(404).json({ error: "Conversation not found" });
  res.json(convo);
}

async function updateConversation(req, res) {
  const { title, isPinned } = req.body;
  const result = await prisma.conversation.updateMany({
    where: { id: req.params.id, userId: req.userId },
    data: { ...(title !== undefined && { title }), ...(isPinned !== undefined && { isPinned }) },
  });
  if (result.count === 0) return res.status(404).json({ error: "Conversation not found" });
  res.json({ ok: true });
}

async function deleteConversation(req, res) {
  await prisma.conversation.deleteMany({ where: { id: req.params.id, userId: req.userId } });
  res.json({ ok: true });
}

async function clearHistory(req, res) {
  await prisma.conversation.deleteMany({ where: { userId: req.userId } });
  res.json({ ok: true });
}

module.exports = { chat, listConversations, getConversation, updateConversation, deleteConversation, clearHistory };
