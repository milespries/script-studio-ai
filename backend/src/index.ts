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

app.post("/api/edit", async (req, res) => {
  const { script, start, end, selectedText, instruction } = req.body as {
    script?: string;
    start?: number;
    end?: number;
    selectedText?: string;
    instruction?: string;
  };

  if (!script || typeof script !== "string") {
    return res.status(400).json({ error: "script is required" });
  }

  if (typeof start !== "number" || typeof end !== "number") {
    return res.status(400).json({ error: "start and end must be numbers" });
  }

  if (start < 0 || end > script.length || start >= end) {
    return res.status(400).json({ error: "start and end must define a valid range" });
  }

  const selectedByIndex = script.slice(start, end);
  const selected = typeof selectedText === "string" ? selectedText : selectedByIndex;

  // Optional sanity check: if provided selectedText doesn't match the slice, log it
  if (selectedText && selectedText !== selectedByIndex) {
    console.warn("Selected text mismatch between indices and provided text.");
  }

  const before = script.slice(0, start);
  const after = script.slice(end);

  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-5";

  if (!apiKey) {
    console.error("Missing OPENROUTER_API_KEY");
    return res.status(500).json({ error: "Server not configured for AI" });
  }

  // Add markers around the selected part for extra context
  const scriptWithMarkers = `${before}<<SELECTED>>${selected}<<END_SELECTED>>${after}`;

  const systemPrompt = [
    "You are helping a creator refine a script.",
    "You will receive the full script with the selected section wrapped in <<SELECTED>> and <<END_SELECTED>> markers.",
    "You will also receive the exact selected text and an editing instruction.",
    "Rewrite only the selected text based on the instruction.",
    "IMPORTANT:",
    "- Do not rewrite any other part of the script.",
    "- Do not include the markers in your output.",
    '- Respond ONLY with a JSON object like {\"replacement\": \"new text here\"} and nothing else.'
  ].join(" ");

  try {
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              `Full script with markers:\n${scriptWithMarkers}`,
              "",
              `Selected text:\n${selected}`,
              "",
              `Editing instruction:\n${instruction || "Improve this text."}`
            ].join("\n")
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const raw = response.data?.choices?.[0]?.message?.content ?? "";

    let replacement = selected;

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.replacement === "string") {
        replacement = parsed.replacement;
      } else {
        replacement = raw.trim();
      }
    } catch {
      // If it's not valid JSON, fall back to raw text
      replacement = raw.trim();
    }

    return res.json({ replacement });
  } catch (err: any) {
    console.error("Error calling OpenRouter for edit:", err?.response?.data || err.message);
    return res.status(500).json({ error: "Failed to edit selection" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});