import re
with open("UI.jsx", encoding="utf-8") as f:
    text = f.read()

# The error was caused by doing things like: '{t("good_morning", lang)}' inside a string or inside JSX curly brackets with quotes.
# This results in:
# "{t("good_morning", lang)}"
# '{t("good_morning", lang)}'
# Let's clean up quotes surrounding curly brace t calls:

# pattern: "{t(...)}"
text = re.sub(r'"\{t\((.*?)\)\}"', r't(\1)', text)
# pattern: '{t(...)}'
text = re.sub(r"'\{t\((.*?)\)\}'", r"t(\1)", text)

with open("UI.jsx", "w", encoding="utf-8") as f:
    f.write(text)
    
print("Fixed curly braces wrapped in quotes")
