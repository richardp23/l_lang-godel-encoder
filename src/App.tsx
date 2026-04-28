import { useCallback, useEffect, useState } from "react";
import encoderSource from "../backend/encoder.py?raw";
import bridgeSource from "../backend/pyodide_bridge.py?raw";
import { formatResult, type Dict } from "./resultFormat.ts";

type PyodideApi = {
  runPython: (code: string) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: {
    get: (name: string) => (...args: unknown[]) => unknown;
    set: (name: string, value: unknown) => void;
  };
};

declare global {
  interface Window {
    loadPyodide: (options: { indexURL: string }) => Promise<PyodideApi>;
  }
}

type StatusKind = "loading" | "ready" | "error";

function App() {
  const [statusMessage, setStatusMessage] = useState("Loading Pyodide runtime...");
  const [statusKind, setStatusKind] = useState<StatusKind>("loading");
  const [callApi, setCallApi] = useState<((name: string, payloadJson: string) => string) | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [singleLine, setSingleLine] = useState("");
  const [singleShowMath, setSingleShowMath] = useState(false);
  const [singleOutput, setSingleOutput] = useState("");

  const [programLines, setProgramLines] = useState("");
  const [programIncludeProduct, setProgramIncludeProduct] = useState(false);
  const [programOutput, setProgramOutput] = useState("");

  const [decodeExponents, setDecodeExponents] = useState("");
  const [decodeExponentsShowMath, setDecodeExponentsShowMath] = useState(false);
  const [decodeExponentsOutput, setDecodeExponentsOutput] = useState("");

  const [decodeNumber, setDecodeNumber] = useState("");
  const [decodeNumberShowMath, setDecodeNumberShowMath] = useState(false);
  const [decodeNumberOutput, setDecodeNumberOutput] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("godelDarkMode");
      if (saved !== null) {
        setIsDarkMode(saved === "true");
      }
    } catch {
      // localStorage can fail in locked-down environments.
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", isDarkMode);
    try {
      window.localStorage.setItem("godelDarkMode", String(isDarkMode));
    } catch {
      // Ignore storage write failures.
    }
  }, [isDarkMode]);

  useEffect(() => {
    let cancelled = false;

    async function initRuntime(): Promise<void> {
      try {
        if (typeof window.loadPyodide !== "function") {
          throw new Error("Pyodide script did not load.");
        }

        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
        });
        if (!encoderSource.includes("def encode_instruction")) {
          throw new Error("backend/encoder.py did not contain expected function definitions.");
        }
        if (!bridgeSource.includes("def __call_api")) {
          throw new Error("backend/pyodide_bridge.py did not contain expected API definitions.");
        }
        const encoderCliMarker = "# --- Main Infinite Loop ---";
        const encoderPrelude = encoderSource.includes(encoderCliMarker)
          ? encoderSource.split(encoderCliMarker, 1)[0]
          : encoderSource;
        pyodide.globals.set("ENCODER_SOURCE", encoderPrelude);
        pyodide.globals.set("BRIDGE_SOURCE", bridgeSource);
        await pyodide.runPythonAsync(`
import types, sys

encoder_module = types.ModuleType("encoder_module")
encoder_module.__dict__["__name__"] = "encoder_module"
exec(ENCODER_SOURCE, encoder_module.__dict__)
sys.modules["encoder_module"] = encoder_module

bridge_module = types.ModuleType("pyodide_bridge")
bridge_module.__dict__["__name__"] = "pyodide_bridge"
exec(BRIDGE_SOURCE, bridge_module.__dict__)
sys.modules["pyodide_bridge"] = bridge_module

from pyodide_bridge import __call_api
`);

        if (cancelled) {
          return;
        }

        setCallApi(() => pyodide.globals.get("__call_api") as (name: string, payloadJson: string) => string);
        setStatusKind("ready");
        setStatusMessage("Pyodide ready.");
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Runtime failed to initialize.";
        setStatusKind("error");
        setStatusMessage(`Runtime error: ${message}`);
      }
    }

    void initRuntime();

    return () => {
      cancelled = true;
    };
  }, []);

  const runAction = useCallback(
    async (fnName: string, payload: Dict, setOutput: (value: string) => void): Promise<void> => {
      if (!callApi) {
        setOutput("Runtime is still loading.");
        return;
      }

      setOutput("Working...");
      try {
        const responseJson = callApi(fnName, JSON.stringify(payload));
        const result = JSON.parse(responseJson) as Dict;
        setOutput(formatResult(fnName, result));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Python call failed.";
        setOutput(`Error: ${message}`);
      }
    },
    [callApi]
  );

  const handleEncodeSingle = useCallback(async () => {
    const line = singleLine.trim();
    if (!line) {
      setSingleOutput("Enter an instruction first.");
      return;
    }
    await runAction("encode_instruction_line", { line, show_math: singleShowMath }, setSingleOutput);
  }, [runAction, singleLine, singleShowMath]);

  const handleEncodeProgram = useCallback(async () => {
    const lines = programLines
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setProgramOutput("Enter at least one program line.");
      return;
    }
    await runAction(
      "encode_program_lines",
      { lines, include_product: programIncludeProduct },
      setProgramOutput
    );
  }, [programIncludeProduct, programLines, runAction]);

  const handleDecodeExponents = useCallback(async () => {
    const raw = decodeExponents.trim();
    if (!raw) {
      setDecodeExponentsOutput("Enter one or more exponents.");
      return;
    }
    const tokens = raw.replace(/,/g, " ").split(/\s+/).filter(Boolean);
    const values = tokens.map((token) => Number.parseInt(token, 10));
    if (values.some((value) => Number.isNaN(value) || value < 0)) {
      setDecodeExponentsOutput("Exponents must be non-negative integers.");
      return;
    }
    await runAction(
      "decode_exponents",
      { values, show_math: decodeExponentsShowMath },
      setDecodeExponentsOutput
    );
  }, [decodeExponents, decodeExponentsShowMath, runAction]);

  const handleDecodeNumber = useCallback(async () => {
    const raw = decodeNumber.trim();
    if (!raw) {
      setDecodeNumberOutput("Enter x to decode.");
      return;
    }
    const x = Number.parseInt(raw, 10);
    if (Number.isNaN(x) || x < 0) {
      setDecodeNumberOutput("x must be a non-negative integer.");
      return;
    }
    await runAction(
      "decode_program_number",
      { x, show_math: decodeNumberShowMath },
      setDecodeNumberOutput
    );
  }, [decodeNumber, decodeNumberShowMath, runAction]);

  const isReady = statusKind === "ready";

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#top" aria-label="L Gödel encoder, home">
            <span className="brand-mark" aria-hidden="true">
              ℒ
            </span>
            <span className="brand-text">
              <span className="brand-title">L · Gödel</span>
              <span className="brand-sub">Encoder &amp; Decoder</span>
            </span>
          </a>
          <div className="topbar-controls">
            <button
              type="button"
              className="dark-mode-toggle"
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              data-active={isDarkMode ? "true" : "false"}
              onClick={() => setIsDarkMode((prev) => !prev)}
            >
              <span className="dark-mode-label">{isDarkMode ? "Dark mode" : "Light mode"}</span>
              <span className="dark-mode-icon" aria-hidden="true">
                ◐
              </span>
              <span className="toggle-slider" aria-hidden="true"></span>
            </button>
            <p id="runtime-status" className={`status ${statusKind}`} role="status" aria-live="polite">
              <span className="status-dot" aria-hidden="true"></span>
              <span className="status-text">{statusMessage}</span>
            </p>
          </div>
        </div>
      </header>

      <section className="credits-banner" aria-label="Project credits">
        <div className="credits-banner-inner">
          Built by Richard Perez Jr. (UI/website) and Jacob Montufar (backend encoder logic).{" "}
          <a
            href="https://github.com/richardp23/l_lang-godel-encoder"
            target="_blank"
            rel="noreferrer noopener"
          >
            View Repository on GitHub
          </a>
          .
        </div>
      </section>

      <section className="hero" id="top" aria-labelledby="hero-heading">
        <div className="hero-inner">
          <span className="eyebrow eyebrow-on-dark">Theoretical programming · Browser tooling</span>
          <h1 id="hero-heading" className="hero-title">
            L ↔ Gödel.
            <br />
            <span className="hero-accent">Encode and decode in the browser.</span>
          </h1>
          <p className="hero-sub">
            Translate L-language instructions into Gödel-encoded exponents — and reverse the process —
            directly in the browser. The original Python logic runs unmodified inside Pyodide.
          </p>
          <ul className="hero-meta" aria-label="Project highlights">
            <li>Vite + TypeScript + React</li>
            <li>Pyodide runtime</li>
            <li>Static · GitHub Pages</li>
          </ul>
        </div>
      </section>

      <main className="content" id="main">
        <section className="section" aria-labelledby="encode-heading">
          <header className="section-head">
            <span className="eyebrow">Encode</span>
            <h2 id="encode-heading" className="section-title">
              L instructions to Gödel exponents.
            </h2>
            <p className="section-lede">
              Compile L-code into per-line exponents and the prime-power factor expression that
              represents the program.
            </p>
          </header>

          <div className="grid">
            <article className="card" aria-labelledby="card-single">
              <span className="card-eyebrow">Single instruction</span>
              <h3 id="card-single" className="card-title">
                Encode one line.
              </h3>
              <p className="card-lede">
                Examples: <code>Y &lt;- Y + 1</code>, <code>[A] X &lt;- X - 1</code>,{" "}
                <code>IF Z =/= 0 GOTO [B1]</code>.
              </p>

              <div className="field">
                <label htmlFor="single-line">Instruction</label>
                <input
                  id="single-line"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="[A] X <- X - 1"
                  value={singleLine}
                  onChange={(event) => setSingleLine(event.target.value)}
                />
              </div>

              <label className="checkbox">
                <input
                  id="single-show-math"
                  type="checkbox"
                  checked={singleShowMath}
                  onChange={(event) => setSingleShowMath(event.target.checked)}
                />
                <span>Include math work</span>
              </label>

              <div className="actions">
                <button
                  id="encode-single-btn"
                  className="btn btn-primary"
                  type="button"
                  disabled={!isReady}
                  onClick={() => void handleEncodeSingle()}
                >
                  Encode line
                </button>
              </div>

              <pre id="encode-single-output" className="output" aria-live="polite">
                {singleOutput}
              </pre>
            </article>

            <article className="card" aria-labelledby="card-program">
              <span className="card-eyebrow">Whole program</span>
              <h3 id="card-program" className="card-title">
                Encode multiple lines.
              </h3>
              <p className="card-lede">
                Each line is paired with the next prime as base; the result is the factor expression{" "}
                <code>p₁^e₁ * p₂^e₂ …</code>.
              </p>

              <div className="field">
                <label htmlFor="program-lines">Program lines</label>
                <textarea
                  id="program-lines"
                  rows={7}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder={"Y <- Y + 1\n[A] X <- X - 1"}
                  value={programLines}
                  onChange={(event) => setProgramLines(event.target.value)}
                ></textarea>
              </div>

              <label className="checkbox">
                <input
                  id="program-include-product"
                  type="checkbox"
                  checked={programIncludeProduct}
                  onChange={(event) => setProgramIncludeProduct(event.target.checked)}
                />
                <span>Include full Gödel number</span>
              </label>

              <div className="actions">
                <button
                  id="encode-program-btn"
                  className="btn btn-primary"
                  type="button"
                  disabled={!isReady}
                  onClick={() => void handleEncodeProgram()}
                >
                  Encode program
                </button>
              </div>

              <pre id="encode-program-output" className="output" aria-live="polite">
                {programOutput}
              </pre>
            </article>
          </div>
        </section>

        <section className="section" aria-labelledby="decode-heading">
          <header className="section-head">
            <span className="eyebrow">Decode</span>
            <h2 id="decode-heading" className="section-title">
              Gödel data back to L instructions.
            </h2>
            <p className="section-lede">
              Reverse-engineer exponents or a full Gödel number into the L instructions they encode.
            </p>
          </header>

          <div className="grid">
            <article className="card" aria-labelledby="card-exp">
              <span className="card-eyebrow">Exponents</span>
              <h3 id="card-exp" className="card-title">
                Decode exponent values.
              </h3>
              <p className="card-lede">
                Provide one or more exponents (space- or comma-separated) and get the matching L
                instructions in order.
              </p>

              <div className="field">
                <label htmlFor="decode-exponents">Exponents</label>
                <input
                  id="decode-exponents"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="21 46"
                  value={decodeExponents}
                  onChange={(event) => setDecodeExponents(event.target.value)}
                />
              </div>

              <label className="checkbox">
                <input
                  id="decode-exponents-show-math"
                  type="checkbox"
                  checked={decodeExponentsShowMath}
                  onChange={(event) => setDecodeExponentsShowMath(event.target.checked)}
                />
                <span>Include math work</span>
              </label>

              <div className="actions">
                <button
                  id="decode-exponents-btn"
                  className="btn btn-primary"
                  type="button"
                  disabled={!isReady}
                  onClick={() => void handleDecodeExponents()}
                >
                  Decode exponents
                </button>
              </div>

              <pre id="decode-exponents-output" className="output" aria-live="polite">
                {decodeExponentsOutput}
              </pre>
            </article>

            <article className="card" aria-labelledby="card-x">
              <span className="card-eyebrow">Full Gödel number</span>
              <h3 id="card-x" className="card-title">
                Decode an integer x.
              </h3>
              <p className="card-lede">
                Factor <code>x</code> into prime powers and reconstruct each instruction.
              </p>

              <div className="field">
                <label htmlFor="decode-number">Gödel number x</label>
                <input
                  id="decode-number"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Enter x"
                  value={decodeNumber}
                  onChange={(event) => setDecodeNumber(event.target.value)}
                />
              </div>

              <label className="checkbox">
                <input
                  id="decode-number-show-math"
                  type="checkbox"
                  checked={decodeNumberShowMath}
                  onChange={(event) => setDecodeNumberShowMath(event.target.checked)}
                />
                <span>Include factoring &amp; math work</span>
              </label>

              <div className="actions">
                <button
                  id="decode-number-btn"
                  className="btn btn-primary"
                  type="button"
                  disabled={!isReady}
                  onClick={() => void handleDecodeNumber()}
                >
                  Decode x
                </button>
              </div>

              <pre id="decode-number-output" className="output" aria-live="polite">
                {decodeNumberOutput}
              </pre>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer" aria-label="About this project">
        <div className="footer-inner">
          <p className="footer-line">
            Inspired by Dr. Ronald Fechter&apos;s Theory of Computation class, and the original{" "}
            <a
              href="https://anthonyvallejo23.github.io/L-Theoretical-Programming-Language/"
              target="_blank"
              rel="noreferrer noopener"
            >
              L interpreter
            </a>{" "}
            by Anthony Vallejo.
          </p>

          <p className="footer-line muted">
            <a
              href="https://github.com/richardp23/l_lang-godel-encoder"
              target="_blank"
              rel="noreferrer noopener"
            >
              Repository
            </a>{" "}
            ·{" "}
            <a href="https://vite.dev/" target="_blank" rel="noreferrer noopener">
              Vite
            </a>{" "}
            ·{" "}
            <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer noopener">
              TypeScript
            </a>{" "}
            ·{" "}
            <a href="https://react.dev/" target="_blank" rel="noreferrer noopener">
              React
            </a>{" "}
            ·{" "}
            <a href="https://pyodide.org/" target="_blank" rel="noreferrer noopener">
              Pyodide
            </a>{" "}
            ·{" "}
            <a href="https://docs.github.com/en/pages" target="_blank" rel="noreferrer noopener">
              GitHub Pages
            </a>
            .
          </p>
        </div>
      </footer>
    </>
  );
}

export default App;
