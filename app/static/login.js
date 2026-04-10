if (localStorage.getItem("nullnote_token")) {
  location.replace("/dashboard");
}

const form = document.getElementById("loginForm");
const message = document.getElementById("authMessage");
const usernameInput = document.getElementById("username");

function setMessage(text, isError = false) {
  message.textContent = text;
  message.dataset.error = isError ? "1" : "0";
}

function applyPostRegisterHint() {
  const params = new URLSearchParams(location.search);
  if (params.get("registered") !== "1") {
    return;
  }

  const username = params.get("username") || "";
  if (username) {
    usernameInput.value = username;
  }
  setMessage("회원가입이 완료되었습니다. 로그인해주세요.");

  const cleanUrl = new URL(location.href);
  cleanUrl.searchParams.delete("registered");
  cleanUrl.searchParams.delete("username");
  history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}`);
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
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(normalizeErrorMessage(data, "로그인에 실패했습니다."));
    }

    localStorage.setItem("nullnote_token", data.access_token);
    location.replace("/dashboard");
  } catch (err) {
    setMessage(err.message, true);
  }
});

applyPostRegisterHint();
