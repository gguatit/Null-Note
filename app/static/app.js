const state = {
  token: localStorage.getItem("nullnote_token") || "",
  notes: [],
  currentNoteId: null,
};

const el = {
  username: document.getElementById("username"),
  password: document.getElementById("password"),
  registerBtn: document.getElementById("registerBtn"),
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  refreshNotesBtn: document.getElementById("refreshNotesBtn"),
  searchInput: document.getElementById("searchInput"),
  noteList: document.getElementById("noteList"),
  titleInput: document.getElementById("titleInput"),
  contentInput: document.getElementById("contentInput"),
  isPublic: document.getElementById("isPublic"),
  newNoteBtn: document.getElementById("newNoteBtn"),
  saveNoteBtn: document.getElementById("saveNoteBtn"),
  deleteNoteBtn: document.getElementById("deleteNoteBtn"),
  preview: document.getElementById("preview"),
  copyPublicLinkBtn: document.getElementById("copyPublicLinkBtn"),
};

marked.setOptions({
  breaks: true,
  gfm: true,
});

function authHeaders() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

function renderPreview() {
  const html = marked.parse(el.contentInput.value || "");
  el.preview.innerHTML = html;
  Prism.highlightAllUnder(el.preview);
}

function clearEditor() {
  state.currentNoteId = null;
  el.titleInput.value = "";
  el.contentInput.value = "";
  el.isPublic.checked = false;
  renderPreview();
}

function fillEditor(note) {
  state.currentNoteId = note.id;
  el.titleInput.value = note.title;
  el.contentInput.value = note.content;
  el.isPublic.checked = note.is_public;
  renderPreview();
}

function renderNoteList() {
  el.noteList.innerHTML = "";
  for (const note of state.notes) {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${note.title || "Untitled"}</strong>
      <div class="meta">${note.is_public ? "공개" : "비공개"} · ID ${note.id}</div>
    `;
    li.addEventListener("click", () => fillEditor(note));
    el.noteList.appendChild(li);
  }
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (res.status === 204) {
    return null;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Request failed");
  }

  return data;
}

async function register() {
  const username = el.username.value.trim();
  const password = el.password.value;
  if (!username || !password) {
    alert("아이디와 비밀번호를 입력해주세요.");
    return;
  }

  await api("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  alert("회원가입 성공. 로그인해주세요.");
}

async function login() {
  const username = el.username.value.trim();
  const password = el.password.value;
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  state.token = data.access_token;
  localStorage.setItem("nullnote_token", state.token);
  await loadMyNotes();
  alert("로그인 성공");
}

function logout() {
  state.token = "";
  localStorage.removeItem("nullnote_token");
  state.notes = [];
  renderNoteList();
  clearEditor();
}

async function loadMyNotes() {
  if (!state.token) {
    state.notes = [];
    renderNoteList();
    return;
  }

  const q = el.searchInput.value.trim();
  const path = q ? `/notes/user?q=${encodeURIComponent(q)}` : "/notes/user";
  state.notes = await api(path);
  renderNoteList();
}

async function saveCurrentNote() {
  if (!state.token) {
    alert("로그인이 필요합니다.");
    return;
  }

  const payload = {
    title: el.titleInput.value.trim() || "Untitled",
    content: el.contentInput.value,
    is_public: el.isPublic.checked,
  };

  if (state.currentNoteId) {
    const updated = await api(`/notes/${state.currentNoteId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    const idx = state.notes.findIndex((n) => n.id === updated.id);
    if (idx >= 0) {
      state.notes[idx] = updated;
    }
    fillEditor(updated);
  } else {
    const created = await api("/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    state.notes.unshift(created);
    fillEditor(created);
  }

  renderNoteList();
}

async function deleteCurrentNote() {
  if (!state.currentNoteId) {
    alert("삭제할 노트를 먼저 선택하세요.");
    return;
  }

  await api(`/notes/${state.currentNoteId}`, { method: "DELETE" });
  state.notes = state.notes.filter((n) => n.id !== state.currentNoteId);
  renderNoteList();
  clearEditor();
}

async function copyPublicLink() {
  if (!state.currentNoteId) {
    alert("노트를 선택하세요.");
    return;
  }

  const current = state.notes.find((n) => n.id === state.currentNoteId);
  if (!current || !current.is_public) {
    alert("공개 노트만 링크를 복사할 수 있습니다.");
    return;
  }

  const url = `${location.origin}/public.html?id=${state.currentNoteId}`;
  await navigator.clipboard.writeText(url);
  alert("공개 링크가 복사되었습니다.");
}

el.contentInput.addEventListener("input", renderPreview);
el.registerBtn.addEventListener("click", () => register().catch((e) => alert(e.message)));
el.loginBtn.addEventListener("click", () => login().catch((e) => alert(e.message)));
el.logoutBtn.addEventListener("click", logout);
el.refreshNotesBtn.addEventListener("click", () => loadMyNotes().catch((e) => alert(e.message)));
el.searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    loadMyNotes().catch((err) => alert(err.message));
  }
});
el.newNoteBtn.addEventListener("click", clearEditor);
el.saveNoteBtn.addEventListener("click", () => saveCurrentNote().catch((e) => alert(e.message)));
el.deleteNoteBtn.addEventListener("click", () => deleteCurrentNote().catch((e) => alert(e.message)));
el.copyPublicLinkBtn.addEventListener("click", () => copyPublicLink().catch((e) => alert(e.message)));

renderPreview();
if (state.token) {
  loadMyNotes().catch(() => {
    state.token = "";
    localStorage.removeItem("nullnote_token");
  });
}
