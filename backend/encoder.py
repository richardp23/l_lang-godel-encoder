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
    i = c + 1
    if i == 1: return "Y"
    if i % 2 == 0: return "X" + str(i // 2)
    return "Z" + str((i - 1) // 2)

def L_ins(b, v):
    if b == 0: return v + "<-" + v
    if b == 1: return v + "<-" + v + "+1"
    if b == 2: return v + "<-" + v + "-1"
    return "IF " + v + "=/=0 GOTO " + L_lbl(b - 2).strip()

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
    lbl_str = lbl_str.replace("[", "").replace("]", "").strip()
    if not lbl_str: return 0
    ltr = lbl_str[0]
    idx = "ABCDE".index(ltr)
    num_str = lbl_str[1:]
    num = int(num_str) if num_str else 0
    return num * 5 + idx + 1

def parse_var(v_str):
    v_str = v_str.strip()
    if v_str == "Y": return 0
    if v_str.startswith("X"):
        i = int(v_str[1:]) * 2
        return i - 1
    if v_str.startswith("Z"):
        i = int(v_str[1:]) * 2 + 1
        return i - 1
    return 0

def encode_instruction(line):
    line = line.strip()
    a = 0
    
    # 1. Parse 'a' (The Label)
    if line.startswith("["):
        parts = line.split("]", 1)
        a = parse_label(parts[0] + "]")
        line = parts[1].strip() 
        
    b = 0
    c = 0
    
    # 2. Parse 'b' and 'c'
    if "IF" in line and "GOTO" in line:
        v_str = line.split("IF")[1].split("=/=")[0].strip()
        c = parse_var(v_str)
        target_lbl = line.split("GOTO")[1].strip()
        b = parse_label(target_lbl) + 2
    elif "<-" in line:
        left, right = line.split("<-")
        c = parse_var(left.strip())
        right = right.replace(" ", "")
        if "+1" in right:
            b = 1
        elif "-1" in right:
            b = 2
        else:
            b = 0
            
    # 3. Calculate D and the final Exponent (x)
    d = (2**b) * (2*c + 1) - 1
    val = (2**a) * (2*d + 1) - 1
    
    return a, b, c, d, val

# --- Main Infinite Loop ---
def main():
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
            print("Format examples: Y<-Y+1, [A] X1<-X1-1, IF Z2=/=0 GOTO [B1]")
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
                
            # Generate the prime numbers we need
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
            print("Format examples: Y<-Y+1, [A] X1<-X1-1, IF Z2=/=0 GOTO [B1]")
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

            # Process everything silently
            for val in exponents:
                w_math = [] 
                a, d, b, c = calc(val, w_math)
                v = L_var(c) 
                
                instruction = L_lbl(a) + L_ins(b, v)
                lines.append(instruction) 
                
                # Store the math and variable breakdown for this specific exponent
                all_math_work.append(f"\n--- Math & Variables for Exponent: {val} ---")
                all_math_work.append(f"A= {a}  D= {d}")
                all_math_work.append(f"B= {b}  C= {c}")
                all_math_work.append(f"Var: {v}")
                all_math_work.extend(w_math)
                all_math_work.append("-" * 45) 
            
            # 1. Print the combined code FIRST
            print("\n--- Combined Code ---")
            for line in lines:
                print(line)
                
            # 2. Ask ONCE if the user wants to see the math
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

            # Find factors silently and save the work
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

            # Calculate and print the clean A,B,C,D output
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

            # Print the compiled program
            print("\nCode:")
            for line in lines:
                print(line)

            # Prompt the user for the math work
            ans = input("\nShow math work? (y/n): ")
            if ans.lower() == "y":
                print("\n- Factoring -")
                for line in w_fact:
                    print(line)
                    
                for line in w_math:
                    print(line)
                    
        else:
            print("Invalid choice. Try again.")

if __name__ == "__main__":
    main()