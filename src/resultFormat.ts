export type Dict = Record<string, unknown>;

export function formatResult(fnName: string, result: Dict): string {
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
