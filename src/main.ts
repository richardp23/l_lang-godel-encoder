import "./style.css";
import encoderSource from "../backend/encoder.py?raw";

type Dict = Record<string, unknown>;
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
const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root node.");
}

app.innerHTML = `
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="#top" aria-label="L Gödel encoder, home">
        <span class="brand-mark" aria-hidden="true">ℒ</span>
        <span class="brand-text">
          <span class="brand-title">L · Gödel</span>
          <span class="brand-sub">Encoder &amp; Decoder</span>
        </span>
      </a>
      <p id="runtime-status" class="status loading" role="status" aria-live="polite">
        <span class="status-dot" aria-hidden="true"></span>
        <span class="status-text">Loading Pyodide runtime…</span>
      </p>
    </div>
  </header>

  <section class="hero" id="top" aria-labelledby="hero-heading">
    <div class="hero-inner">
      <span class="eyebrow eyebrow-on-dark">Theoretical programming · Browser tooling</span>
      <h1 id="hero-heading" class="hero-title">
        L ↔ Gödel.<br />
        <span class="hero-accent">Encode and decode in the browser.</span>
      </h1>
      <p class="hero-sub">
        Translate L-language instructions into Gödel-encoded exponents — and reverse the process —
        directly in the browser. The original Python logic runs unmodified inside Pyodide.
      </p>
      <ul class="hero-meta" aria-label="Project highlights">
        <li>Vite + TypeScript</li>
        <li>Pyodide runtime</li>
        <li>Static · GitHub Pages</li>
      </ul>
    </div>
  </section>

  <main class="content" id="main">
    <section class="section" aria-labelledby="encode-heading">
      <header class="section-head">
        <span class="eyebrow">Encode</span>
        <h2 id="encode-heading" class="section-title">L instructions to Gödel exponents.</h2>
        <p class="section-lede">
          Compile L-code into per-line exponents and the prime-power factor expression that represents
          the program.
        </p>
      </header>

      <div class="grid">
        <article class="card" aria-labelledby="card-single">
          <span class="card-eyebrow">Single instruction</span>
          <h3 id="card-single" class="card-title">Encode one line.</h3>
          <p class="card-lede">
            Examples: <code>Y&lt;-Y+1</code>, <code>[A] X1&lt;-X1-1</code>,
            <code>IF Z2=/=0 GOTO [B1]</code>.
          </p>

          <div class="field">
            <label for="single-line">Instruction</label>
            <input
              id="single-line"
              type="text"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              placeholder="[A] X1<-X1-1"
            />
          </div>

          <label class="checkbox">
            <input id="single-show-math" type="checkbox" />
            <span>Include math work</span>
          </label>

          <div class="actions">
            <button id="encode-single-btn" class="btn btn-primary" type="button">
              Encode line
            </button>
          </div>

          <pre id="encode-single-output" class="output" aria-live="polite"></pre>
        </article>

        <article class="card" aria-labelledby="card-program">
          <span class="card-eyebrow">Whole program</span>
          <h3 id="card-program" class="card-title">Encode multiple lines.</h3>
          <p class="card-lede">
            Each line is paired with the next prime as base; the result is the factor expression
            <code>p₁^e₁ * p₂^e₂ …</code>.
          </p>

          <div class="field">
            <label for="program-lines">Program lines</label>
            <textarea
              id="program-lines"
              rows="7"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              placeholder="Y<-Y+1&#10;[A] X1<-X1-1"
            ></textarea>
          </div>

          <label class="checkbox">
            <input id="program-include-product" type="checkbox" />
            <span>Include full Gödel number</span>
          </label>

          <div class="actions">
            <button id="encode-program-btn" class="btn btn-primary" type="button">
              Encode program
            </button>
          </div>

          <pre id="encode-program-output" class="output" aria-live="polite"></pre>
        </article>
      </div>
    </section>

    <section class="section" aria-labelledby="decode-heading">
      <header class="section-head">
        <span class="eyebrow">Decode</span>
        <h2 id="decode-heading" class="section-title">Gödel data back to L instructions.</h2>
        <p class="section-lede">
          Reverse-engineer exponents or a full Gödel number into the L instructions they encode.
        </p>
      </header>

      <div class="grid">
        <article class="card" aria-labelledby="card-exp">
          <span class="card-eyebrow">Exponents</span>
          <h3 id="card-exp" class="card-title">Decode exponent values.</h3>
          <p class="card-lede">
            Provide one or more exponents (space- or comma-separated) and get the matching L
            instructions in order.
          </p>

          <div class="field">
            <label for="decode-exponents">Exponents</label>
            <input
              id="decode-exponents"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="21 46"
            />
          </div>

          <label class="checkbox">
            <input id="decode-exponents-show-math" type="checkbox" />
            <span>Include math work</span>
          </label>

          <div class="actions">
            <button id="decode-exponents-btn" class="btn btn-primary" type="button">
              Decode exponents
            </button>
          </div>

          <pre id="decode-exponents-output" class="output" aria-live="polite"></pre>
        </article>

        <article class="card" aria-labelledby="card-x">
          <span class="card-eyebrow">Full Gödel number</span>
          <h3 id="card-x" class="card-title">Decode an integer x.</h3>
          <p class="card-lede">
            Factor <code>x</code> into prime powers and reconstruct each instruction.
          </p>

          <div class="field">
            <label for="decode-number">Gödel number x</label>
            <input id="decode-number" type="number" min="0" step="1" placeholder="Enter x" />
          </div>

          <label class="checkbox">
            <input id="decode-number-show-math" type="checkbox" />
            <span>Include factoring &amp; math work</span>
          </label>

          <div class="actions">
            <button id="decode-number-btn" class="btn btn-primary" type="button">
              Decode x
            </button>
          </div>

          <pre id="decode-number-output" class="output" aria-live="polite"></pre>
        </article>
      </div>
    </section>
  </main>

  <footer class="footer" aria-label="About this project">
    <div class="footer-inner">
      <p class="footer-line">
        Inspired by Dr. Ronald Fechter's classroom L language and the original
        <a
          href="https://anthonyvallejo23.github.io/L-Theoretical-Programming-Language/"
          target="_blank"
          rel="noreferrer noopener"
        >L interpreter</a>
        by Anthony Vallejo.
      </p>
      <p class="footer-line muted">Vite · TypeScript · Pyodide · GitHub Pages.</p>
    </div>
  </footer>
`;

const runtimeStatus = byId<HTMLParagraphElement>("runtime-status");
const singleLine = byId<HTMLInputElement>("single-line");
const singleShowMath = byId<HTMLInputElement>("single-show-math");
const singleOut = byId<HTMLPreElement>("encode-single-output");
const programLines = byId<HTMLTextAreaElement>("program-lines");
const programIncludeProduct = byId<HTMLInputElement>("program-include-product");
const programOut = byId<HTMLPreElement>("encode-program-output");
const exponentsInput = byId<HTMLInputElement>("decode-exponents");
const exponentsShowMath = byId<HTMLInputElement>("decode-exponents-show-math");
const exponentsOut = byId<HTMLPreElement>("decode-exponents-output");
const decodeNumberInput = byId<HTMLInputElement>("decode-number");
const decodeNumberShowMath = byId<HTMLInputElement>("decode-number-show-math");
const decodeNumberOut = byId<HTMLPreElement>("decode-number-output");
const encodeSingleBtn = byId<HTMLButtonElement>("encode-single-btn");
const encodeProgramBtn = byId<HTMLButtonElement>("encode-program-btn");
const decodeExponentsBtn = byId<HTMLButtonElement>("decode-exponents-btn");
const decodeNumberBtn = byId<HTMLButtonElement>("decode-number-btn");

let callApi: ((name: string, payloadJson: string) => string) | null = null;

void initRuntime();

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing node: ${id}`);
  }
  return node as T;
}

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

    callApi = pyodide.globals.get("__call_api") as (name: string, payloadJson: string) => string;
    setStatus("Pyodide ready.", "ready");
    bindEvents();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Runtime failed to initialize.";
    setStatus(`Runtime error: ${message}`, "error");
  }
}

function setStatus(message: string, kind: "loading" | "ready" | "error"): void {
  runtimeStatus.classList.remove("loading", "ready", "error");
  runtimeStatus.classList.add(kind);
  const textNode = runtimeStatus.querySelector<HTMLSpanElement>(".status-text");
  if (textNode) {
    textNode.textContent = message;
  } else {
    runtimeStatus.textContent = message;
  }
}

function bindEvents(): void {
  encodeSingleBtn.addEventListener("click", async () => {
    const line = singleLine.value.trim();
    if (!line) {
      singleOut.textContent = "Enter an instruction first.";
      return;
    }
    await runAction(singleOut, "encode_instruction_line", {
      line,
      show_math: singleShowMath.checked,
    });
  });

  encodeProgramBtn.addEventListener("click", async () => {
    const lines = programLines.value
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      programOut.textContent = "Enter at least one program line.";
      return;
    }
    if (lines.length > MAX_PROGRAM_LINES) {
      programOut.textContent = `Too many lines. Max supported lines: ${MAX_PROGRAM_LINES}.`;
      return;
    }
    await runAction(programOut, "encode_program_lines", {
      lines,
      include_product: programIncludeProduct.checked,
    });
  });

  decodeExponentsBtn.addEventListener("click", async () => {
    const raw = exponentsInput.value.trim();
    if (!raw) {
      exponentsOut.textContent = "Enter one or more exponents.";
      return;
    }
    const tokens = raw.replace(/,/g, " ").split(/\s+/).filter(Boolean);
    const values = tokens.map((token) => Number.parseInt(token, 10));
    if (values.some((v) => Number.isNaN(v) || v < 0)) {
      exponentsOut.textContent = "Exponents must be non-negative integers.";
      return;
    }
    await runAction(exponentsOut, "decode_exponents", {
      values,
      show_math: exponentsShowMath.checked,
    });
  });

  decodeNumberBtn.addEventListener("click", async () => {
    const raw = decodeNumberInput.value.trim();
    if (!raw) {
      decodeNumberOut.textContent = "Enter x to decode.";
      return;
    }
    const x = Number.parseInt(raw, 10);
    if (Number.isNaN(x) || x < 0) {
      decodeNumberOut.textContent = "x must be a non-negative integer.";
      return;
    }
    if (x > MAX_DECODE_X) {
      decodeNumberOut.textContent = `x is too large for browser decode. Maximum: ${MAX_DECODE_X}.`;
      return;
    }
    await runAction(decodeNumberOut, "decode_program_number", {
      x,
      show_math: decodeNumberShowMath.checked,
    });
  });
}

async function runAction(target: HTMLPreElement, fnName: string, payload: Dict): Promise<void> {
  if (!callApi) {
    target.textContent = "Runtime is still loading.";
    return;
  }
  target.textContent = "Working...";
  try {
    const responseJson = callApi(fnName, JSON.stringify(payload));
    const result = JSON.parse(responseJson) as Dict;
    target.textContent = formatResult(fnName, result);
  } catch (error) {
    showError(target, error, "Python call failed.");
  }
}

function formatResult(fnName: string, result: Dict): string {
  if (fnName === "encode_instruction_line") {
    return [
      `Exponent: ${result.exponent as number}`,
      `A=${result.a as number}, B=${result.b as number}, C=${result.c as number}, D=${result.d as number}`,
      "",
      ...(Array.isArray(result.math) ? (result.math as string[]) : []),
    ]
      .join("\n")
      .trim();
  }

  if (fnName === "encode_program_lines") {
    const instructions = (result.instructions as Dict[]) ?? [];
    const lines = instructions.map(
      (item, index) =>
        `Line ${index + 1}: p=${item.prime as number}, exp=${item.exponent as number}, A=${item.a as number}, B=${item.b as number}, C=${item.c as number}, D=${item.d as number}`
    );
    return [
      `Count: ${result.count as number}`,
      `Factors: ${result.factor_expression as string}`,
      ...(result.godel_number ? [`Gödel number: ${result.godel_number as string}`] : []),
      "",
      ...lines,
    ]
      .join("\n")
      .trim();
  }

  if (fnName === "decode_exponents") {
    const instructions = (result.instructions as string[]) ?? [];
    const decoded = (result.decoded as Dict[]) ?? [];
    const mathDump = decoded.flatMap((item) => {
      const math = (item.math as string[]) ?? [];
      if (math.length === 0) {
        return [];
      }
      return [``, `Exp ${item.input_exponent as number}:`, ...math];
    });
    return [
      "Combined code:",
      ...instructions,
      ...(mathDump.length > 0 ? mathDump : []),
    ]
      .join("\n")
      .trim();
  }

  if (fnName === "decode_program_number") {
    const instructions = (result.instructions as string[]) ?? [];
    const factorSteps = (result.factor_steps as string[]) ?? [];
    const mathSteps = (result.math_steps as string[]) ?? [];
    return [
      `Input x: ${result.input_x as number}`,
      `Adjusted x: ${result.adjusted_x as number}`,
      "",
      "Decoded program:",
      ...(instructions.length ? instructions : ["(no instructions)"]),
      ...(factorSteps.length ? ["", "Factoring:", ...factorSteps] : []),
      ...(mathSteps.length ? ["", "Math work:", ...mathSteps] : []),
    ]
      .join("\n")
      .trim();
  }

  return JSON.stringify(result, null, 2);
}

function showError(target: HTMLElement, error: unknown, fallback: string): void {
  const message = error instanceof Error ? error.message : fallback;
  target.textContent = `Error: ${message}`;
}
