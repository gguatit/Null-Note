if (localStorage.getItem("nullnote_token")) {
  location.replace("/dashboard");
}

const form = document.getElementById("registerForm");
const message = document.getElementById("authMessage");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const passwordInput = document.getElementById("password");
const passwordConfirmInput = document.getElementById("passwordConfirm");
const passwordRuleSummary = document.getElementById("passwordRuleSummary");

const ruleEls = {
  length: document.getElementById("ruleLength"),
  upper: document.getElementById("ruleUpper"),
  lower: document.getElementById("ruleLower"),
  number: document.getElementById("ruleNumber"),
  match: document.getElementById("ruleMatch"),
};

if (themeToggleBtn && window.NullNoteTheme?.getTheme) {
  const syncThemeButton = () => {
    const dark = window.NullNoteTheme.getTheme() === "dark";
    themeToggleBtn.textContent = dark ? "☀" : "◐";
    themeToggleBtn.title = dark ? "라이트 모드 전환" : "다크 모드 전환";
  };

  syncThemeButton();
  themeToggleBtn.addEventListener("click", () => {
    window.NullNoteTheme.toggleTheme();
    syncThemeButton();
  });
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.dataset.error = isError ? "1" : "0";
}

function passwordChecks(password, confirmPassword) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    match: password.length > 0 && password === confirmPassword,
  };
}

function updateRuleState() {
  const password = passwordInput.value;
  const confirmPassword = passwordConfirmInput.value;
  const checks = passwordChecks(password, confirmPassword);

  for (const [key, el] of Object.entries(ruleEls)) {
    if (!el) {
      continue;
    }
    const ok = Boolean(checks[key]);
    el.classList.toggle("ok", ok);
    el.classList.toggle("bad", !ok);
  }

  const score = [checks.length, checks.upper, checks.lower, checks.number].filter(Boolean).length;
  passwordRuleSummary.textContent = `요구사항 충족: ${score}/4`;

  return checks;
}

function normalizeErrorMessage(data, fallback) {
  const detail = data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const lines = detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object") {
          const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : "입력값";
          const msg = item.msg || "유효하지 않습니다.";
          return `${field}: ${msg}`;
        }
        return "";
      })
      .filter(Boolean);

    if (lines.length > 0) {
      return lines.join("\n");
    }
  }

  return fallback;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = passwordInput.value;
  const passwordConfirm = passwordConfirmInput.value;
  const checks = updateRuleState();

  if (!checks.match) {
    setMessage("비밀번호와 비밀번호 재확인이 일치하지 않습니다.", true);
    return;
  }

  if (!checks.length || !checks.upper || !checks.lower || !checks.number) {
    setMessage("비밀번호 요구사항을 모두 충족해주세요.", true);
    return;
  }

  try {
    const registerRes = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const registerData = await registerRes.json().catch(() => ({}));
    if (!registerRes.ok) {
      throw new Error(normalizeErrorMessage(registerData, "회원가입에 실패했습니다."));
    }
    const next = `/login?registered=1&username=${encodeURIComponent(username)}`;
    location.replace(next);
  } catch (err) {
    setMessage(err.message, true);
  }
});

passwordInput.addEventListener("input", updateRuleState);
passwordConfirmInput.addEventListener("input", updateRuleState);
updateRuleState();
