def is_prime(n):
    if n < 2: return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0: return False
    return True

# --- Decoding Helpers ---
def L_lbl(a):
    if a == 0: return ""
    ltr = "ABCDE"[(a - 1) % 5]
    num = (a - 1) // 5
    suf = "" if num == 0 else str(num)
    return "[" + ltr + suf + "] "

def L_var(c):
    if c == 0: return "Y"
    if c % 2 != 0: 
        # Odd mapping -> X
        idx = (c + 1) // 2
        return "X" if idx == 1 else f"X{idx}"
    else:
        # Even mapping -> Z
        idx = c // 2
        return "Z" if idx == 1 else f"Z{idx}"

def L_ins(b, v):
    if b == 0: return v + " <- " + v
    if b == 1: return v + " <- " + v + " + 1"
    if b == 2: return v + " <- " + v + " - 1"
    return "IF " + v + " =/= 0 GOTO " + L_lbl(b - 2).strip()

def calc(cv, w_math):
    v = cv + 1
    w_math.append(" 2^A(2D+1) = " + str(v))
    a = 0
    while v % 2 == 0:
        a += 1
        v = v // 2
    d = (v - 1) // 2
    w_math.append(" A = " + str(a) + "  Rem = " + str(v))
    w_math.append(" 2D+1 = " + str(v) + " -> D = " + str(d))
    
    vd = d + 1
    w_math.append(" 2^B(2C+1) = " + str(vd))
    b = 0
    while vd % 2 == 0:
        b += 1
        vd = vd // 2
    c = (vd - 1) // 2
    w_math.append(" B = " + str(b) + "  Rem = " + str(vd))
    w_math.append(" 2C+1 = " + str(vd) + " -> C = " + str(c))
    
    return a, d, b, c

# --- Coding Helpers ---
def parse_label(lbl_str):
    lbl_str = lbl_str.replace("[", "").replace("]", "").strip().upper()
    if not lbl_str: return 0
    ltr = lbl_str[0]
    if ltr not in "ABCDE": return 0
    idx = "ABCDE".index(ltr)
    num_str = lbl_str[1:]
    num = int(num_str) if num_str.isdigit() else 0
    return num * 5 + idx + 1

def parse_var(v_str):
    v_str = v_str.strip().upper()
    if not v_str: return 0
    ltr = v_str[0]
    
    if ltr not in ["X", "Y", "Z"]: 
        return 0
        
    num_str = v_str[1:]
    # Default to 1 if no number is provided (e.g., 'X' -> 'X1')
    num = int(num_str) if num_str.isdigit() else 1
    
    if ltr == "Y": return 0
    if ltr == "X": return num * 2 - 1
    if ltr == "Z": return num * 2
    return 0

def encode_instruction(line):
    line = line.strip().upper()
    a = 0
    
    # 1. Parse 'a' (The Label) safely - handles [A] or A: 
    if line.startswith("["):
        parts = line.split("]", 1)
        if len(parts) == 2:
            a = parse_label(parts[0])
            line = parts[1].strip()
    elif ":" in line:
        parts = line.split(":", 1)
        lbl_cand = parts[0].strip()
        if len(lbl_cand) > 0 and lbl_cand[0] in "ABCDE":
            a = parse_label(lbl_cand)
            line = parts[1].strip()

    b = 0
    c = 0
    
    # 2. Parse 'b' and 'c'
    if "IF " in line or "GOTO " in line:
        # Strip out symbols to cleanly isolate the variable and target label
        words = line.replace("=", " ").replace("!", " ").replace("/", " ").split()
        try:
            if_idx = words.index("IF")
            v_str = words[if_idx + 1]
            c = parse_var(v_str)
        except (ValueError, IndexError):
            c = 0
            
        try:
            goto_idx = words.index("GOTO")
            target_lbl = words[goto_idx + 1]
            b = parse_label(target_lbl) + 2
        except (ValueError, IndexError):
            b = 0
            
    elif "<-" in line or "=" in line:
        # Supports both <- and = for assignment
        sep = "<-" if "<-" in line else "="
        parts = line.split(sep, 1)
        
        if len(parts) == 2:
            left, right = parts
            c = parse_var(left.strip())
            right = right.replace(" ", "")
            
            if "+1" in right:
                b = 1
            elif "-1" in right:
                b = 2
            else:
                b = 0
            
    # 3. Calculate D and the final Exponent (val)
    d = (2**b) * (2*c + 1) - 1
    val = (2**a) * (2*d + 1) - 1
    
    return a, b, c, d, val

# --- Main Infinite Loop ---
while True:
    print("\n=== Main Menu ===")
    print("1: Decode Full Program")
    print("2: Decode Exponent(s) (A,B,C,D)")
    print("3: Code Single Instruction")
    print("4: Code Full Program")
    print("5: Exit Program")
    
    choice = input("Select (1-5): ")
    
    if choice == "5":
        print("Goodbye!")
        break  
        
    elif choice == "4":
        print("\n--- Full Program Coder ---")
        print("Enter your L-code instructions line by line.")
        print("Format examples: y = y+1, A: x<-x-1, if z != 0 goto b1")
        print("Press Enter on a blank line to finish and compile.\n")
        
        program_lines = []
        while True:
            line = input(f"Line {len(program_lines)+1}: ").strip()
            if not line:
                break
            program_lines.append(line)
            
        if not program_lines:
            print("No instructions entered.")
            continue
            
        primes = []
        p = 2
        while len(primes) < len(program_lines):
            if is_prime(p): primes.append(p)
            p += 1
            
        final_factors = []
        print("\n--- Instruction Breakdown ---")
        for i, line in enumerate(program_lines):
            try:
                a, b, c, d, val = encode_instruction(line)
                prime = primes[i]
                final_factors.append(f"{prime}^{val}")
                print(f"Line {i+1} ({line}):")
                print(f"  A={a}, B={b}, C={c}, D={d}  ->  Exponent = {val}")
            except Exception as e:
                print(f"Error parsing Line {i+1} '{line}'. Please check formatting.")
                final_factors.append(f"{primes[i]}^[ERROR]")
                
        print("\n--- Final Compiled Gödel Number ---")
        print(" * ".join(final_factors))

    elif choice == "3":
        print("\n--- Single Instruction Coder ---")
        print("Format examples: y = y+1, A: x<-x-1, if z != 0 goto b1")
        code_in = input("Enter L-code instruction: ")
        
        try:
            a, b, c, d, val = encode_instruction(code_in)
            print(f"\n--- Results for: {code_in} ---")
            print(f"A = {a}   D = {d}")
            print(f"B = {b}   C = {c}")
            print(f"\nExponent: {val}")
            
            ans = input("\nShow math work? (y/n): ")
            if ans.lower() == "y":
                print("\n- Math -")
                print(f"Finding D: 2^B(2C + 1) - 1")
                print(f"D = 2^{b}(2({c}) + 1) - 1")
                print(f"D = {2**b} * {2*c + 1} - 1 = {d}")
                print(f"\nFinding Exponent: 2^A(2D + 1) - 1")
                print(f"Exp = 2^{a}(2({d}) + 1) - 1")
                print(f"Exp = {2**a} * {2*d + 1} - 1 = {val}")
                
        except Exception as e:
            print("\nError parsing instruction. Please ensure formatting matches the examples.")
            
    elif choice == "2":
        print("\n--- Single/Multiple Exponent Decoder ---")
        user_input = input("Enter exponent(s) separated by spaces (e.g., 21 46): ")
        
        try:
            cleaned_input = user_input.replace(",", " ")
            exponents = [int(x) for x in cleaned_input.split()]
        except ValueError:
            print("Invalid input. Please enter numbers only.")
            continue
            
        if not exponents:
            print("No numbers entered.")
            continue

        lines = [] 
        all_math_work = [] 

        for val in exponents:
            w_math = [] 
            a, d, b, c = calc(val, w_math)
            v = L_var(c) 
            
            instruction = L_lbl(a) + L_ins(b, v)
            lines.append(instruction) 
            
            all_math_work.append(f"\n--- Math & Variables for Exponent: {val} ---")
            all_math_work.append(f"A= {a}  D= {d}")
            all_math_work.append(f"B= {b}  C= {c}")
            all_math_work.append(f"Var: {v}")
            all_math_work.extend(w_math)
            all_math_work.append("-" * 45) 
        
        print("\n--- Combined Code ---")
        for line in lines:
            print(line)
            
        ans = input("\nShow math work and variables? (y/n): ")
        if ans.lower() == "y":
            for line in all_math_work:
                print(line)
                
    elif choice == "1":
        print("\n--- Full Program Decoder ---")
        x = int(input("Enter x: "))

        if x % 2 != 0:
            x += 1

        print("Start x:", x)

        div = 2
        counts = {} 
        w_fact = [] 
        w_math = [] 

        while x > 1:
            if x % div == 0:
                w_fact.append("  " + str(x) + " / " + str(div) + " = " + str(x // div))
                x = x // div
                
                if div not in counts:
                    counts[div] = 0
                counts[div] += 1
            else:
                div += 1

        lines = [] 

        if counts:
            max_p = max(counts.keys())
            p = 2
            
            while p <= max_p:
                if is_prime(p):
                    c_val = counts.get(p, 0)
                    
                    print("\n- Prime", p, "(count:", c_val, ") -")
                    w_math.append("\n- Math for Prime " + str(p) + " -")
                    
                    a, d, b, c = calc(c_val, w_math)
                    v = L_var(c) 
                    
                    print("A=", a, "D=", d)
                    print("B=", b, "C=", c)
                    print("Var: ", v)
                    
                    lines.append(L_lbl(a) + L_ins(b, v))
                p += 1

        print("\nCode:")
        for line in lines:
            print(line)

        ans = input("\nShow math work? (y/n): ")
        if ans.lower() == "y":
            print("\n- Factoring -")
            for line in w_fact:
                print(line)
                
            for line in w_math:
                print(line)
                
    else:
        print("Invalid choice. Try again.")