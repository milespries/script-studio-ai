import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/generate", async (req, res) => {
  const { prompt, lengthMinutes } = req.body as {
    prompt?: string;
    lengthMinutes?: number;
  };

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt is required" });
  }

  // Validate and normalize length
  let minutes = Number(lengthMinutes);
  if (Number.isNaN(minutes) || minutes < 1 || minutes > 5) {
    minutes = 3; // default
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-5";

  if (!apiKey) {
    console.error("Missing OPENROUTER_API_KEY");
    return res.status(500).json({ error: "Server not configured for AI" });
  }

  try {
    const systemPrompt = [
      "You are an AI script writer for short-form video content.",
      `Write a script for a video that is roughly ${minutes} minute(s) long.`,
      "Write it as a script the creator can read out loud.",
      "Do not include explanations, notes, or analysis. Only return the script text."
    ].join(" ");

    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
          // optional headers
          // "HTTP-Referer": "https://your-domain-or-github",
          // "X-Title": "Script Studio AI"
        }
      }
    );

    const script =
      response.data?.choices?.[0]?.message?.content ??
      "Sorry, I couldn't generate a script.";

    res.json({ script });
  } catch (err: any) {
    console.error("Error calling OpenRouter:", err?.response?.data || err.message);
    res.status(500).json({ error: "Failed to generate script" });
  }
});

// MVP stub: edit selected section
app.post("/api/edit", (req, res) => {
  const { fullScript, selectedText, instruction } = req.body;

  // For now just uppercase the selected text to prove the flow works
  if (!fullScript || !selectedText) {
    return res.status(400).json({ error: "fullScript and selectedText are required" });
  }

  const updatedChunk = selectedText.toUpperCase() + ` [edited: ${instruction ?? "no instruction"}]`;
  const updatedScript = fullScript.replace(selectedText, updatedChunk);

  res.json({ updatedScript });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});