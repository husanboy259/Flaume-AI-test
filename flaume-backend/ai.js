const { GoogleGenAI } = require("@google/genai");

// The key lives HERE, on the server, read from the .env drawer.
// The browser will NEVER see it again.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function askGemini(prompt) {
  const result = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: prompt,
  });
  return result.text || "";
}

module.exports = { askGemini };
