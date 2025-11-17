import { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export function ScriptStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [lengthMinutes, setLengthMinutes] = useState(3);
  const [script, setScript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!prompt.trim()) {
      setError("Please enter a prompt for your script.");
      return;
    }

    try {
      setIsGenerating(true);

      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          lengthMinutes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate script");
      }

      const data = await response.json();
      setScript(data.script ?? "");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while generating the script.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">
            Script Studio <span className="text-indigo-400">AI</span>
          </h1>
          <span className="text-xs text-slate-400">
            MVP • Generate and refine scripts
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 lg:flex-row">
        {/* Left column: prompt + controls */}
        <section className="w-full lg:w-1/3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">
              Generate a script
            </h2>
            <p className="mb-3 text-xs text-slate-400">
              Describe your video idea and choose an approximate length.
            </p>

            <form className="space-y-3" onSubmit={handleGenerate}>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Prompt
                </label>
                <textarea
                  className="h-28 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Explain how gravity works in a fun way for short-form video..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-300">
                    Target length
                  </label>
                  <span className="text-slate-400">{lengthMinutes} min</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={lengthMinutes}
                  onChange={(e) => setLengthMinutes(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>1 min</span>
                  <span>5 min</span>
                </div>
              </div>

              {error && (
                <p className="rounded-md bg-red-950/40 px-2 py-1 text-xs text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isGenerating}
                className="flex w-full items-center justify-center rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isGenerating ? "Generating…" : "Generate script"}
              </button>
            </form>
          </div>
        </section>

        {/* Right column: script viewer/editor */}
        <section className="w-full lg:w-2/3">
          <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">
                Script
              </h2>
              <span className="text-[11px] text-slate-500">
                {script ? "Select text to edit (coming next)" : "No script yet"}
              </span>
            </div>

            <textarea
              className="min-h-[260px] flex-1 resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Your generated script will appear here."
              value={script}
              onChange={(e) => setScript(e.target.value)}
            />
          </div>
        </section>
      </main>
    </div>
  );
}