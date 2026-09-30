(function () {
  "use strict";

  /* ---------- DOM ---------- */
  const expressionEl = document.getElementById("expression");
  const resultEl = document.getElementById("result");
  const historyList = document.getElementById("history-list");
  const historyClearBtn = document.getElementById("history-clear");
  const keys = document.querySelectorAll(".key");
  const themeDots = document.querySelectorAll(".theme-dot");

  /* ---------- State ---------- */
  const state = {
    tokens: [],          // committed tokens: numbers (as strings) and operators (+ - * /)
    current: "0",        // number currently being typed
    justEvaluated: false,
    error: false,
  };

  const MAX_DIGITS = 16;
  const OPERATORS = ["+", "-", "*", "/"];
  const OP_SYMBOL = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  /* ---------- Helpers ---------- */
  function formatNumber(value) {
    if (!isFinite(value)) return "Error";
    // Round away floating point noise (0.1 + 0.2 -> 0.3)
    let n = parseFloat(value.toPrecision(12));
    if (Object.is(n, -0)) n = 0;
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) {
      return n.toExponential(6).replace(/\.?0+e/, "e");
    }
    const [intPart, decPart] = String(n).split(".");
    const withCommas = Number(intPart).toLocaleString("en-US", { maximumFractionDigits: 0 });
    return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
  }

  function formatTyped(str) {
    // Format a number that is being typed, keeping trailing "." or zeros intact
    if (str === "" || str === "-") return str || "0";
    const negative = str.startsWith("-");
    const body = negative ? str.slice(1) : str;
    const [intPart, decPart] = body.split(".");
    const intFormatted = intPart === "" ? "0" : Number(intPart).toLocaleString("en-US", { maximumFractionDigits: 0 });
    let out = intFormatted;
    if (body.includes(".")) out += "." + (decPart ?? "");
    return (negative ? "-" : "") + out;
  }

  function tokensToDisplay(tokens) {
    return tokens
      .map((t) => (OPERATORS.includes(t) ? ` ${OP_SYMBOL[t]} ` : formatTyped(t)))
      .join("");
  }

  /* ---------- Evaluation (with operator precedence, no eval) ---------- */
  function evaluate(tokens) {
    // tokens: alternating number-string, operator, number-string ...
    if (tokens.length === 0) return 0;
    const nums = [];
    const ops = [];

    const apply = () => {
      const op = ops.pop();
      const b = nums.pop();
      const a = nums.pop();
      switch (op) {
        case "+": nums.push(a + b); break;
        case "-": nums.push(a - b); break;
        case "*": nums.push(a * b); break;
        case "/":
          if (b === 0) throw new Error("Division by zero");
          nums.push(a / b);
          break;
      }
    };

    const precedence = { "+": 1, "-": 1, "*": 2, "/": 2 };

    for (const t of tokens) {
      if (OPERATORS.includes(t)) {
        while (ops.length && precedence[ops[ops.length - 1]] >= precedence[t]) apply();
        ops.push(t);
      } else {
        nums.push(parseFloat(t));
      }
    }
    while (ops.length) apply();
    const out = nums[0];
    if (!isFinite(out)) throw new Error("Overflow");
    return out;
  }

  /* ---------- Rendering ---------- */
  function render(options = {}) {
    const exprText = tokensToDisplay(state.tokens);
    expressionEl.innerHTML = exprText.trim() === "" ? "&nbsp;" : exprText;

    const text = state.error ? "Error" : formatTyped(state.current);
    resultEl.textContent = text;
    resultEl.classList.toggle("error", state.error);
    resultEl.classList.toggle("small", text.length > 11 && text.length <= 16);
    resultEl.classList.toggle("tiny", text.length > 16);

    // Highlight the pending operator
    const last = state.tokens[state.tokens.length - 1];
    document.querySelectorAll(".key-op").forEach((k) => {
      k.classList.toggle("active-op", state.current === "" && k.dataset.value === last);
    });

    if (options.pop) {
      resultEl.classList.remove("pop");
      void resultEl.offsetWidth; // restart animation
      resultEl.classList.add("pop");
    }
  }

  /* ---------- Actions ---------- */
  function resetIfError() {
    if (state.error) {
      state.error = false;
      state.tokens = [];
      state.current = "0";
    }
  }

  function inputDigit(d) {
    resetIfError();
    if (state.justEvaluated) {
      state.tokens = [];
      state.current = "0";
      state.justEvaluated = false;
    }
    const digitsOnly = state.current.replace(/[^0-9]/g, "");
    if (digitsOnly.length >= MAX_DIGITS) return;
    if (state.current === "0") state.current = d;
    else if (state.current === "-0") state.current = "-" + d;
    else state.current += d;
    render();
  }

  function inputDecimal() {
    resetIfError();
    if (state.justEvaluated) {
      state.tokens = [];
      state.current = "0";
      state.justEvaluated = false;
    }
    if (state.current === "") state.current = "0";
    if (state.current === "-") state.current = "-0";
    if (!state.current.includes(".")) state.current += ".";
    render();
  }

  function inputOperator(op) {
    resetIfError();
    state.justEvaluated = false;

    if (state.current === "" || state.current === "-") {
      // Replace the previous operator instead of stacking two
      if (state.tokens.length && OPERATORS.includes(state.tokens[state.tokens.length - 1])) {
        state.tokens[state.tokens.length - 1] = op;
      }
      state.current = "";
      render();
      return;
    }

    state.tokens.push(normalizeNumber(state.current), op);
    state.current = "";
    render();
  }

  function normalizeNumber(str) {
    // "5." -> "5", "-0" -> "0", ".5" stays parseable
    let s = str;
    if (s.endsWith(".")) s = s.slice(0, -1);
    if (s === "-0" || s === "-") s = "0";
    if (s === "") s = "0";
    return s;
  }

  function equals() {
    if (state.error) return;
    if (state.tokens.length === 0 && !state.justEvaluated) {
      render({ pop: true });
      return;
    }

    const tokens = [...state.tokens];
    if (state.current === "" || state.current === "-") {
      // Trailing operator: drop it
      if (tokens.length && OPERATORS.includes(tokens[tokens.length - 1])) tokens.pop();
    } else {
      tokens.push(normalizeNumber(state.current));
    }
    if (tokens.length === 0) return;

    try {
      const value = evaluate(tokens);
      const exprText = tokensToDisplay(tokens);
      const resultText = formatNumber(value);
      state.current = String(parseFloat(value.toPrecision(12)));
      state.tokens = [];
      state.justEvaluated = true;
      addHistory(exprText, resultText, state.current);
      render({ pop: true });
      expressionEl.textContent = exprText + " =";
    } catch (err) {
      state.error = true;
      state.tokens = [];
      state.current = "0";
      render({ pop: true });
    }
  }

  function clearAll() {
    state.tokens = [];
    state.current = "0";
    state.justEvaluated = false;
    state.error = false;
    render();
  }

  function backspace() {
    if (state.error) { clearAll(); return; }
    if (state.justEvaluated) { clearAll(); return; }

    if (state.current !== "") {
      state.current = state.current.slice(0, -1);
      if (state.current === "" || state.current === "-") state.current = state.current === "-" ? "" : "0";
      if (state.current === "" && state.tokens.length === 0) state.current = "0";
    } else if (state.tokens.length) {
      // Remove trailing operator and restore the previous number for editing
      state.tokens.pop();
      state.current = state.tokens.pop() ?? "0";
    }
    render();
  }

  function negate() {
    resetIfError();
    if (state.current === "" || state.current === "0") {
      state.current = state.current === "0" ? "-0" : "-";
    } else if (state.current === "-0") {
      state.current = "0";
    } else if (state.current.startsWith("-")) {
      state.current = state.current.slice(1);
    } else {
      state.current = "-" + state.current;
    }
    state.justEvaluated = false;
    render();
  }

  function percent() {
    resetIfError();
    if (state.current === "" || state.current === "-") return;
    const value = parseFloat(normalizeNumber(state.current)) / 100;
    state.current = String(parseFloat(value.toPrecision(12)));
    state.justEvaluated = false;
    render({ pop: true });
  }

  /* ---------- History ---------- */
  const history = [];
  const HISTORY_LIMIT = 20;

  function addHistory(expr, resultText, rawValue) {
    history.unshift({ expr, resultText, rawValue });
    if (history.length > HISTORY_LIMIT) history.pop();
    renderHistory();
  }

  function renderHistory() {
    historyList.innerHTML = "";
    if (history.length === 0) {
      const li = document.createElement("li");
      li.className = "history-empty";
      li.textContent = "No calculations yet ✨";
      historyList.appendChild(li);
      return;
    }
    history.forEach((item) => {
      const li = document.createElement("li");
      li.className = "history-item";
      li.title = "Click to reuse this result";
      const expr = document.createElement("span");
      expr.className = "history-expr";
      expr.textContent = item.expr + " =";
      const res = document.createElement("span");
      res.className = "history-res";
      res.textContent = item.resultText;
      li.append(expr, res);
      li.addEventListener("click", () => {
        state.error = false;
        state.tokens = [];
        state.current = item.rawValue;
        state.justEvaluated = true;
        render({ pop: true });
      });
      historyList.appendChild(li);
    });
  }

  historyClearBtn.addEventListener("click", () => {
    history.length = 0;
    renderHistory();
  });

  /* ---------- Dispatch ---------- */
  function handleAction(action, value) {
    switch (action) {
      case "digit": inputDigit(value); break;
      case "decimal": inputDecimal(); break;
      case "operator": inputOperator(value); break;
      case "equals": equals(); break;
      case "clear": clearAll(); break;
      case "backspace": backspace(); break;
      case "negate": negate(); break;
      case "percent": percent(); break;
    }
  }

  keys.forEach((key) => {
    key.addEventListener("click", () => {
      handleAction(key.dataset.action, key.dataset.value);
    });
  });

  /* ---------- Keyboard support ---------- */
  function flashKey(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add("pressed");
    setTimeout(() => el.classList.remove("pressed"), 120);
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;

    if (/^[0-9]$/.test(k)) {
      inputDigit(k);
      flashKey(`.key[data-action="digit"][data-value="${k}"]`);
    } else if (k === "." || k === ",") {
      inputDecimal();
      flashKey('.key[data-action="decimal"]');
    } else if (OPERATORS.includes(k)) {
      inputOperator(k);
      flashKey(`.key[data-action="operator"][data-value="${k}"]`);
    } else if (k === "Enter" || k === "=") {
      e.preventDefault();
      equals();
      flashKey('.key[data-action="equals"]');
    } else if (k === "Backspace") {
      e.preventDefault();
      backspace();
      flashKey('.key[data-action="backspace"]');
    } else if (k === "Escape" || k === "Delete" || k.toLowerCase() === "c") {
      clearAll();
      flashKey('.key[data-action="clear"]');
    } else if (k === "%") {
      percent();
      flashKey('.key[data-action="percent"]');
    } else {
      return;
    }
  });

  /* ---------- Themes ---------- */
  function applyTheme(name) {
    if (name === "sunset") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", name);
    themeDots.forEach((d) => d.classList.toggle("active", d.dataset.theme === name));
    try { localStorage.setItem("calc-theme", name); } catch (_) { /* ignore */ }
  }

  themeDots.forEach((dot) => {
    dot.addEventListener("click", () => applyTheme(dot.dataset.theme));
  });

  let savedTheme = null;
  try { savedTheme = localStorage.getItem("calc-theme"); } catch (_) { /* ignore */ }
  if (savedTheme && [...themeDots].some((d) => d.dataset.theme === savedTheme)) applyTheme(savedTheme);

  /* ---------- Init ---------- */
  render();
})();
