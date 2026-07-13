const { GoogleGenAI } = require("@google/genai");

// The key lives HERE, on the server, read from the .env drawer.
// The browser will NEVER see it again.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// If the first model is overcrowded (Google 503), try the lighter one.
const MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];

async function askGemini(prompt) {
  let lastError;
  for (const model of MODELS) {
    try {
      const result = await ai.models.generateContent({ model, contents: prompt });
      return result.text || "";
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

module.exports = { askGemini };
