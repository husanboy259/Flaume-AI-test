const multer = require("multer");
const { execFile } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { askGemini } = require("./ai");

const prisma = new PrismaClient();

// the doorman that catches audio files (max 25 MB)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// THE EARS: Whisper running on this computer
function transcribe(audioBuffer, mimeType) {
  return new Promise((resolve, reject) => {
    const ext = mimeType.includes("webm") ? ".webm" : mimeType.includes("wav") ? ".wav" : ".mp3";
    const tmpFile = path.join(os.tmpdir(), `voice_${Date.now()}${ext}`);
    fs.writeFileSync(tmpFile, audioBuffer);

    execFile("python", ["transcribe.py", tmpFile], { timeout: 180000, env: { ...process.env, PYTHONIOENCODING: "utf-8" } }, (err, stdout) => {
      fs.unlink(tmpFile, () => {});
      if (err) return reject(err);
      resolve(JSON.parse(stdout).text.trim());
    });
  });
}

// DOOR 1: hear + think + remember
async function voiceChat(req, res) {
  if (!req.file) return res.status(400).json({ error: "No audio file" });

  const transcript = await transcribe(req.file.buffer, req.file.mimetype);
  if (!transcript) return res.status(422).json({ error: "Could not hear any words" });

  const response = await askGemini(transcript);

  const session = await prisma.voiceSession.create({
    data: { transcript, response, userId: req.userId },
  });
  res.json(session);
}

// DOOR 2: my voice history
async function listSessions(req, res) {
  const sessions = await prisma.voiceSession.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json(sessions);
}

module.exports = { upload, voiceChat, listSessions };
