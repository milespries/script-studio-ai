import { useEffect, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const STORAGE_KEY = "scriptStudio.mvp";

type SavedState = {
  prompt: string;
  script: string;
  lengthMinutes: number;
};

function loadInitialState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { prompt: "", script: "", lengthMinutes: 3 };
    }
    const parsed = JSON.parse(raw);
    return {
      prompt: typeof parsed.prompt === "string" ? parsed.prompt : "",
      script: typeof parsed.script === "string" ? parsed.script : "",
      lengthMinutes:
        typeof parsed.lengthMinutes === "number" ? parsed.lengthMinutes : 3,
    };
  } catch (err) {
    console.error("Failed to load saved script:", err);
    return { prompt: "", script: "", lengthMinutes: 3 };
  }
}

export function ScriptStudioPage() {
  const initial = loadInitialState();

  const [prompt, setPrompt] = useState(initial.prompt);
  const [lengthMinutes, setLengthMinutes] = useState(initial.lengthMinutes);
  const [script, setScript] = useState(initial.script);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection + edit state
  const scriptRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [editInstruction, setEditInstruction] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Undo
  const [lastScript, setLastScript] = useState<string | null>(null);
  const canUndo = lastScript !== null;

  // After an AI edit, we want to re-focus and re-highlight the updated chunk
  const [pendingSelection, setPendingSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);

  // 🔐 Persist core fields whenever they change
  useEffect(() => {
    try {
      const payload: SavedState = {
        prompt,
        script,
        lengthMinutes,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error("Failed to save script:", err);
    }
  }, [prompt, script, lengthMinutes]);

  // 🔁 Apply pending selection once script + DOM are updated
   useEffect(() => {
    if (!pendingSelection) return;
    const el = scriptRef.current;
    if (!el) return;

    const { start, end } = pendingSelection;
    const previousScrollTop = el.scrollTop;

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, end);
      // Restore scroll so it doesn't jump to the bottom
      el.scrollTop = previousScrollTop;
    });

    setPendingSelection(null);
  }, [pendingSelection, script]);

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
      // Reset selection & undo on new script
      clearSelectionState();
      setLastScript(null);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || "Something went wrong while generating the script."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function clearSelectionState() {
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectedText("");
    setEditInstruction("");
    setEditError(null);
  }

  function handleScriptChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setScript(e.target.value);
    // Text changed -> old indices may be invalid
    clearSelectionState();
  }

  function updateSelectionFromTextarea() {
    const el = scriptRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (start === end) {
      clearSelectionState();
      return;
    }

    const selected = el.value.slice(start, end);
    setSelectionStart(start);
    setSelectionEnd(end);
    setSelectedText(selected);
    setEditError(null);
  }

  function handleScriptSelect() {
    updateSelectionFromTextarea();
  }

  // Optional: when focusing manually, re-apply selection
  function handleScriptFocus() {
    if (
      scriptRef.current &&
      selectionStart !== null &&
      selectionEnd !== null &&
      selectionStart !== selectionEnd
    ) {
      scriptRef.current.setSelectionRange(selectionStart, selectionEnd);
    }
  }

  async function handleEditSelection() {
    if (
      selectionStart === null ||
      selectionEnd === null ||
      !selectedText ||
      !script
    ) {
      return;
    }

    if (!editInstruction.trim()) {
      setEditError("Please describe how you want to change the selected text.");
      return;
    }

    try {
      setIsEditing(true);
      setEditError(null);

      const response = await fetch(`${API_BASE_URL}/api/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          start: selectionStart,
          end: selectionEnd,
          selectedText,
          instruction: editInstruction,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to edit selection");
      }

      const data = await response.json();
      const replacement: string = data.replacement ?? selectedText;

      // Save for undo
      setLastScript(script);

      // Build updated script
      const before = script.slice(0, selectionStart);
      const after = script.slice(selectionEnd);
      const updatedScript = before + replacement + after;

      // New selection should cover the replacement text
      const newStart = selectionStart;
      const newEnd = selectionStart + replacement.length;

      setScript(updatedScript);
      setSelectionStart(newStart);
      setSelectionEnd(newEnd);
      setSelectedText(replacement);
      setEditInstruction("");

      // Mark that we want to re-focus and re-highlight this range
      setPendingSelection({ start: newStart, end: newEnd });
    } catch (err: any) {
      console.error(err);
      setEditError(
        err.message || "Something went wrong while editing the selection."
      );
    } finally {
      setIsEditing(false);
    }
  }

  function handleUndoLastEdit() {
    if (!lastScript) return;
    setScript(lastScript);
    setLastScript(null);
    clearSelectionState();
  }

  const hasSelection =
    selectionStart !== null &&
    selectionEnd !== null &&
    selectionStart !== selectionEnd &&
    !!selectedText;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">
            Script Studio <span className="text-indigo-400">AI</span>
          </h1>
          <span className="text-xs text-slate-400">
            MVP • Generate and edit scripts
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
              <h2 className="text-sm font-semibold text-slate-200">Script</h2>
              <div className="flex items-center gap-2">
                {canUndo && (
                  <button
                    type="button"
                    onClick={handleUndoLastEdit}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-indigo-500 hover:text-indigo-300"
                  >
                    Undo last edit
                  </button>
                )}
                <span className="text-[11px] text-slate-500">
                  {hasSelection
                    ? "Selection locked for AI edit"
                    : script
                    ? "Select text to edit"
                    : "No script yet"}
                </span>
              </div>
            </div>

            <textarea
              ref={scriptRef}
              className="min-h-[260px] flex-1 resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Your generated script will appear here."
              value={script}
              onChange={handleScriptChange}
              onSelect={handleScriptSelect}
              onMouseUp={handleScriptSelect}
              onKeyUp={handleScriptSelect}
              onTouchEnd={handleScriptSelect}
              onFocus={handleScriptFocus}
            />

            {/* Edit panel */}
            {hasSelection && (
              <div className="mt-3 space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
                <div className="mb-1 text-[11px] font-medium text-slate-300">
                  Selected text
                </div>
                <div className="max-h-16 overflow-y-auto rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-200">
                  {selectedText}
                </div>

                <div className="mt-2">
                  <label className="mb-1 block text-[11px] font-medium text-slate-300">
                    How should we change this?
                  </label>
                  <input
                    type="text"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder='e.g. "make it more casual"'
                    value={editInstruction}
                    onChange={(e) => setEditInstruction(e.target.value)}
                  />
                </div>

                {editError && (
                  <p className="rounded bg-red-950/40 px-2 py-1 text-[11px] text-red-300">
                    {editError}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleEditSelection}
                    disabled={isEditing}
                    className="rounded-md bg-indigo-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isEditing ? "Rewriting…" : "Rewrite selection with AI"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}