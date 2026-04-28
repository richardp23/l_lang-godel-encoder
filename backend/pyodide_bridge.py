import json
import time
import encoder_module

def _parse_non_negative_int(value, field_name):
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be a non-negative integer.")

    if isinstance(value, int):
        parsed = value
    elif isinstance(value, str):
        text = value.strip()
        if not text:
            raise ValueError(f"{field_name} must be a non-negative integer.")
        if not text.isdigit():
            raise ValueError(f"{field_name} must be a non-negative integer.")
        parsed = int(text)
    else:
        raise ValueError(f"{field_name} must be a non-negative integer.")

    if parsed < 0:
        raise ValueError(f"{field_name} must be a non-negative integer.")
    return parsed


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


def decode_program_number(x, show_math=False, max_seconds=None):
    original = _parse_non_negative_int(x, "x")
    if max_seconds is not None:
        max_seconds = float(max_seconds)
        if max_seconds <= 0:
            raise ValueError("max_seconds must be greater than zero.")
    deadline = time.monotonic() + max_seconds if max_seconds is not None else None

    def check_timeout():
        if deadline is not None and time.monotonic() > deadline:
            raise TimeoutError(f"Decode exceeded time limit ({max_seconds:g}s).")

    adjusted = original + 1 if original % 2 != 0 else original
    n = adjusted
    div = 2
    counts = {}
    factor_steps = []
    math_steps = []
    while n > 1:
        check_timeout()
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
            check_timeout()
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
        "input_x": str(original),
        "adjusted_x": str(adjusted),
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
