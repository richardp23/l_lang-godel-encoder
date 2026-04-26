import { useCallback, useEffect, useState } from "react";
import encoderSource from "../backend/encoder.py?raw";
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

const MAX_PROGRAM_LINES = 200;
const MAX_DECODE_X = 100_000_000;

type StatusKind = "loading" | "ready" | "error";

function App() {
  const [statusMessage, setStatusMessage] = useState("Loading Pyodide runtime...");
  const [statusKind, setStatusKind] = useState<StatusKind>("loading");
  const [callApi, setCallApi] = useState<((name: string, payloadJson: string) => string) | null>(null);

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
    let cancelled = false;

    async function initRuntime(): Promise<void> {
      try {
        if (typeof window.loadPyodide !== "function") {
          throw new Error("Pyodide script did not load.");
        }

        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
        });
        const encoderPrelude = encoderSource.split("# --- Main Infinite Loop ---")[0];
        if (!encoderPrelude.includes("def encode_instruction")) {
          throw new Error("backend/encoder.py did not contain expected function definitions.");
        }

        pyodide.runPython(`
import types, sys
encoder_module = types.ModuleType("encoder_module")
encoder_module.__dict__["__name__"] = "encoder_module"
`);
        pyodide.globals.set("ENCODER_SOURCE", encoderPrelude);
        await pyodide.runPythonAsync(`
exec(ENCODER_SOURCE, encoder_module.__dict__)
sys.modules["encoder_module"] = encoder_module
`);
        pyodide.runPython(`
import json
MAX_PROGRAM_LINES = 200
MAX_DECODE_INPUT = 10**8

def _prime_list(n):
    primes = []
    p = 2
    while len(primes) < n:
        if encoder_module.is_prime(p):
            primes.append(p)
        p += 1
    return primes

def encode_instruction_line(line, show_math=False):
    a, b, c, d, val = encoder_module.encode_instruction(line)
    out = {
        "line": line.strip(),
        "a": a,
        "b": b,
        "c": c,
        "d": d,
        "exponent": val,
    }
    if show_math:
        out["math"] = [
            "Finding D: 2^B(2C + 1) - 1",
            f"D = 2^{b}(2({c}) + 1) - 1",
            f"D = {2**b} * {2*c + 1} - 1 = {d}",
            "Finding Exponent: 2^A(2D + 1) - 1",
            f"Exp = 2^{a}(2({d}) + 1) - 1",
            f"Exp = {2**a} * {2*d + 1} - 1 = {val}",
        ]
    return out

def encode_program_lines(lines, include_product=False):
    if not lines:
        raise ValueError("Program must contain at least one instruction.")
    if len(lines) > MAX_PROGRAM_LINES:
        raise ValueError(f"Program too large. Max lines: {MAX_PROGRAM_LINES}.")

    primes = _prime_list(len(lines))
    compiled = []
    factors = []
    product = 1
    for i, line in enumerate(lines):
        encoded = encode_instruction_line(line)
        p = primes[i]
        exponent = encoded["exponent"]
        encoded["prime"] = p
        compiled.append(encoded)
        factors.append(f"{p}^{exponent}")
        if include_product:
            product *= p**exponent
    out = {
        "count": len(compiled),
        "instructions": compiled,
        "factors": factors,
        "factor_expression": " * ".join(factors),
    }
    if include_product:
        out["godel_number"] = str(product)
    return out

def decode_exponent(value, show_math=False):
    n = int(value)
    if n < 0:
        raise ValueError("Exponent must be non-negative.")
    work = []
    a, d, b, c = encoder_module.calc(n, work)
    variable = encoder_module.L_var(c)
    instruction = encoder_module.L_lbl(a) + encoder_module.L_ins(b, variable)
    out = {
        "input_exponent": n,
        "a": a,
        "b": b,
        "c": c,
        "d": d,
        "variable": variable,
        "instruction": instruction,
    }
    if show_math:
        out["math"] = work
    return out

def decode_exponents(values, show_math=False):
    if not values:
        raise ValueError("Please provide at least one exponent.")
    decoded = [decode_exponent(int(v), show_math=show_math) for v in values]
    return {
        "count": len(decoded),
        "instructions": [item["instruction"] for item in decoded],
        "decoded": decoded,
    }

def decode_program_number(x, show_math=False):
    original = int(x)
    if original < 0:
        raise ValueError("x must be non-negative.")
    if original > MAX_DECODE_INPUT:
        raise ValueError(f"x is too large for browser decode. Max supported x: {MAX_DECODE_INPUT}.")

    adjusted = original + 1 if original % 2 != 0 else original
    n = adjusted
    div = 2
    counts = {}
    factor_steps = []
    math_steps = []
    while n > 1:
        if n % div == 0:
            factor_steps.append(f"{n} / {div} = {n // div}")
            n //= div
            counts[div] = counts.get(div, 0) + 1
        else:
            div += 1

    lines = []
    decoded = []
    if counts:
        max_p = max(counts.keys())
        p = 2
        while p <= max_p:
            if encoder_module.is_prime(p):
                c_val = counts.get(p, 0)
                local_work = []
                a, d, b, c = encoder_module.calc(c_val, local_work)
                variable = encoder_module.L_var(c)
                instruction = encoder_module.L_lbl(a) + encoder_module.L_ins(b, variable)
                lines.append(instruction)
                decoded.append({
                    "prime": p,
                    "count": c_val,
                    "a": a,
                    "b": b,
                    "c": c,
                    "d": d,
                    "variable": variable,
                    "instruction": instruction,
                })
                if show_math:
                    math_steps.append(f"- Math for Prime {p} -")
                    math_steps.extend(local_work)
            p += 1
    out = {
        "input_x": original,
        "adjusted_x": adjusted,
        "decoded_count": len(lines),
        "instructions": lines,
        "decoded": decoded,
    }
    if show_math:
        out["factor_steps"] = factor_steps
        out["math_steps"] = math_steps
    return out

def __call_api(name, payload_json):
    payload = json.loads(payload_json)
    fn = globals()[name]
    if isinstance(payload, dict):
        result = fn(**payload)
    elif isinstance(payload, list):
        result = fn(payload)
    else:
        result = fn(payload)
    return json.dumps(result)
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
    if (lines.length > MAX_PROGRAM_LINES) {
      setProgramOutput(`Too many lines. Max supported lines: ${MAX_PROGRAM_LINES}.`);
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
    if (x > MAX_DECODE_X) {
      setDecodeNumberOutput(`x is too large for browser decode. Maximum: ${MAX_DECODE_X}.`);
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
          <p id="runtime-status" className={`status ${statusKind}`} role="status" aria-live="polite">
            <span className="status-dot" aria-hidden="true"></span>
            <span className="status-text">{statusMessage}</span>
          </p>
        </div>
      </header>

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
                Examples: <code>Y&lt;-Y+1</code>, <code>[A] X1&lt;-X1-1</code>,{" "}
                <code>IF Z2=/=0 GOTO [B1]</code>.
              </p>

              <div className="field">
                <label htmlFor="single-line">Instruction</label>
                <input
                  id="single-line"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="[A] X1<-X1-1"
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
                  placeholder={"Y<-Y+1\n[A] X1<-X1-1"}
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
            Inspired by Dr. Ronald Fechter&apos;s classroom L language and the original{" "}
            <a
              href="https://anthonyvallejo23.github.io/L-Theoretical-Programming-Language/"
              target="_blank"
              rel="noreferrer noopener"
            >
              L interpreter
            </a>{" "}
            by Anthony Vallejo.
          </p>
          <p className="footer-line muted">Vite · TypeScript · React · Pyodide · GitHub Pages.</p>
        </div>
      </footer>
    </>
  );
}

export default App;
