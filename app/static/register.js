if (localStorage.getItem("nullnote_token")) {
  location.replace("/dashboard.html");
}

const form = document.getElementById("registerForm");
const message = document.getElementById("authMessage");

function setMessage(text, isError = false) {
  message.textContent = text;
  message.dataset.error = isError ? "1" : "0";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    const registerRes = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const registerData = await registerRes.json().catch(() => ({}));
    if (!registerRes.ok) {
      throw new Error(registerData.detail || "회원가입에 실패했습니다.");
    }

    const loginRes = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const loginData = await loginRes.json().catch(() => ({}));
    if (!loginRes.ok) {
      throw new Error(loginData.detail || "로그인에 실패했습니다.");
    }

    localStorage.setItem("nullnote_token", loginData.access_token);
    location.replace("/dashboard.html");
  } catch (err) {
    setMessage(err.message, true);
  }
});
