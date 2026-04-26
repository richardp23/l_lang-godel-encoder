import { describe, expect, it } from "vitest";

import { formatResult } from "./resultFormat";

describe("formatResult", () => {
  it("formats single-instruction encode output with math", () => {
    const text = formatResult("encode_instruction_line", {
      exponent: 21,
      a: 1,
      b: 2,
      c: 3,
      d: 27,
      math: ["step 1", "step 2"],
    });

    expect(text).toContain("Exponent: 21");
    expect(text).toContain("A=1, B=2, C=3, D=27");
    expect(text).toContain("step 1");
    expect(text).toContain("step 2");
  });

  it("formats program encoding with optional godel number", () => {
    const text = formatResult("encode_program_lines", {
      count: 2,
      factor_expression: "2^3 * 3^5",
      godel_number: "1944",
      instructions: [
        { prime: 2, exponent: 3, a: 0, b: 1, c: 0, d: 1 },
        { prime: 3, exponent: 5, a: 1, b: 0, c: 2, d: 4 },
      ],
    });

    expect(text).toContain("Count: 2");
    expect(text).toContain("Factors: 2^3 * 3^5");
    expect(text).toContain("Gödel number: 1944");
    expect(text).toContain("Line 1: p=2, exp=3, A=0, B=1, C=0, D=1");
  });

  it("formats exponent decode output including math sections", () => {
    const text = formatResult("decode_exponents", {
      instructions: ["Y<-Y+1", "[A] X1<-X1-1"],
      decoded: [
        { input_exponent: 21, math: ["m1", "m2"] },
        { input_exponent: 46, math: [] },
      ],
    });

    expect(text).toContain("Combined code:");
    expect(text).toContain("Y<-Y+1");
    expect(text).toContain("Exp 21:");
    expect(text).toContain("m2");
    expect(text).not.toContain("Exp 46:");
  });

  it("formats full-program decode output and fallback unknown actions", () => {
    const decodedText = formatResult("decode_program_number", {
      input_x: 16,
      adjusted_x: 16,
      instructions: [],
      factor_steps: ["16 / 2 = 8"],
      math_steps: ["- Math for Prime 2 -"],
    });
    expect(decodedText).toContain("Input x: 16");
    expect(decodedText).toContain("(no instructions)");
    expect(decodedText).toContain("Factoring:");
    expect(decodedText).toContain("Math work:");

    const fallback = formatResult("unknown_action", { ok: true });
    expect(fallback).toBe('{\n  "ok": true\n}');
  });
});
