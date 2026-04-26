import json
import encoder_module

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
