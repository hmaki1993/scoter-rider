import sys

def check_brackets(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    brackets = {'(': ')', '{': '}', '[': ']'}
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char in brackets.keys():
                stack.append((char, i + 1, j + 1))
            elif char in brackets.values():
                if not stack:
                    print(f"Extra closing bracket '{char}' at line {i+1}, col {j+1}")
                    return False
                opening, line_no, col_no = stack.pop()
                if brackets[opening] != char:
                    print(f"Mismatched bracket '{char}' at line {i+1}, col {j+1}. Expected '{brackets[opening]}' to close '{opening}' from line {line_no}")
                    return False
    
    if stack:
        for char, line_no, col_no in stack:
            print(f"Unclosed bracket '{char}' at line {line_no}, col {col_no}")
        return False
    
    print("All brackets are balanced!")
    return True

if __name__ == "__main__":
    if len(sys.argv) > 1:
        check_brackets(sys.argv[1])
    else:
        print("Usage: python check_brackets.py <filename>")
