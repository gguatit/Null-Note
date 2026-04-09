if (localStorage.getItem("nullnote_token")) {
  location.replace("/dashboard.html");
}

const form = document.getElementById("loginForm");
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
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || "로그인에 실패했습니다.");
    }

    localStorage.setItem("nullnote_token", data.access_token);
    location.replace("/dashboard.html");
  } catch (err) {
    setMessage(err.message, true);
  }
});
