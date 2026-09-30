# 🧮 Rainbow Calc

A fully functional, colorful calculator web app built with plain HTML, CSS and JavaScript. No build step, no dependencies.

## Features

- Addition, subtraction, multiplication, division with correct operator precedence (`2 + 3 × 4 = 14`)
- Percent, sign toggle (±), decimal input, backspace and all-clear
- Live expression preview and animated result display
- Calculation history (click any entry to reuse its result)
- Full keyboard support: digits, `+ - * /`, `Enter`, `Backspace`, `Esc`, `%`
- Five color themes (Sunset, Ocean, Candy, Forest, Galaxy) with animated gradient background, remembered across visits
- Responsive glassmorphism UI that works on phones and desktops
- Safe evaluation: no `eval`, floating point noise cleaned up (`0.1 + 0.2 = 0.3`), division by zero shows `Error`

## Run it

Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup for the calculator, history panel and theme picker |
| `style.css` | Themes, gradients, animations and responsive layout |
| `script.js` | Calculator logic, history, keyboard handling and theme persistence |
