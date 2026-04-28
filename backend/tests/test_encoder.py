from pathlib import Path


def load_encoder_namespace() -> dict:
    source_path = Path(__file__).resolve().parents[1] / "encoder.py"
    source = source_path.read_text(encoding="utf-8")
    marker = "# --- Main Infinite Loop ---"
    assert marker in source, "Expected CLI marker not found in backend/encoder.py"
    prelude = source.split(marker, 1)[0]
    namespace: dict = {}
    exec(prelude, namespace)
    return namespace


def test_is_prime_handles_small_and_composite_values():
    ns = load_encoder_namespace()
    assert ns["is_prime"](-1) is False
    assert ns["is_prime"](0) is False
    assert ns["is_prime"](1) is False
    assert ns["is_prime"](2) is True
    assert ns["is_prime"](3) is True
    assert ns["is_prime"](4) is False
    assert ns["is_prime"](29) is True


def test_label_and_variable_helpers_roundtrip_expected_forms():
    ns = load_encoder_namespace()
    parse_label = ns["parse_label"]
    l_lbl = ns["L_lbl"]
    parse_var = ns["parse_var"]
    l_var = ns["L_var"]

    assert parse_label("[A]") == 1
    assert parse_label("[B1]") == 7
    assert l_lbl(0) == ""
    assert l_lbl(1) == "[A] "
    assert l_lbl(7) == "[B1] "

    assert parse_var("Y") == 0
    assert parse_var("X1") == 1
    assert parse_var("Z2") == 4
    assert parse_var("X") == 1
    assert l_var(0) == "Y"
    assert l_var(1) == "X"
    assert l_var(2) == "Z"
    assert l_var(3) == "X2"
    assert l_var(4) == "Z2"


def test_encode_instruction_for_assignment_line():
    ns = load_encoder_namespace()
    a, b, c, d, val = ns["encode_instruction"]("Y<-Y+1")
    assert (a, b, c, d, val) == (0, 1, 0, 1, 2)


def test_encode_instruction_for_labeled_decrement_line():
    ns = load_encoder_namespace()
    a, b, c, d, val = ns["encode_instruction"]("[A] X1<-X1-1")
    assert (a, b, c, d, val) == (1, 2, 1, 11, 45)


def test_encode_instruction_for_goto_line():
    ns = load_encoder_namespace()
    a, b, c, d, val = ns["encode_instruction"]("IF Z2=/=0 GOTO [B1]")
    assert a == 0
    assert b == 9
    assert c == 4
    assert d == (2**9) * (2 * 4 + 1) - 1
    assert val == (2**0) * (2 * d + 1) - 1


def test_calc_decodes_back_to_instruction_components():
    ns = load_encoder_namespace()
    work = []
    a, d, b, c = ns["calc"](45, work)
    assert (a, d, b, c) == (1, 11, 2, 1)
    instruction = ns["L_lbl"](a) + ns["L_ins"](b, ns["L_var"](c))
    assert instruction == "[A] X <- X - 1"
    assert any("2^A(2D+1)" in line for line in work)


def test_parser_accepts_both_compact_and_spaced_instruction_styles():
    ns = load_encoder_namespace()
    encode = ns["encode_instruction"]
    assert encode("Y<-Y+1") == encode("y <- y + 1")
    assert encode("[A] X1<-X1-1") == encode("[a] x <- x - 1")
    assert encode("IF Z2=/=0 GOTO [B1]") == encode("if z2 =/= 0 goto [b1]")
