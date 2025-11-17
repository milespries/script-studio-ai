import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// MVP stub: generate script
app.post("/api/generate", (req, res) => {
  const { prompt, maxDurationMinutes } = req.body;

  // For now just return a fake script; we'll hook LLM later.
  const script = `This is a placeholder script for prompt: "${prompt}". (maxDurationMinutes: ${maxDurationMinutes ?? "default"})`;

  res.json({ script });
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