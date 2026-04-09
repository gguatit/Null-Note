const token = localStorage.getItem("nullnote_token") || "";

const STORAGE_KEY = "nullnote_ui_settings";
const DEFAULT_SETTINGS = {
  autoSave: true,
  showPreview: true,
  editorFontSize: 16,
  sidebarCollapsed: false,
  settingsOpen: true,
  compactMode: false,
  splitRatio: 50,
};

const state = {
  token,
  isAuthenticated: Boolean(token),
  notes: [],
  currentNoteId: null,
  autoSaveTimer: null,
  settings: { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") },
};

const el = {
  appLayout: document.getElementById("appLayout"),
  editorContent: document.getElementById("editorContent"),
  sidebar: document.getElementById("sidebar"),
  sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
  settingsToggleBtn: document.getElementById("settingsToggleBtn"),
  settingsPanel: document.getElementById("settingsPanel"),
  logoutBtn: document.getElementById("logoutBtn"),
  loginCtaBtn: document.getElementById("loginCtaBtn"),
  guestBadge: document.getElementById("guestBadge"),
  searchInput: document.getElementById("searchInput"),
  refreshNotesBtn: document.getElementById("refreshNotesBtn"),
  noteList: document.getElementById("noteList"),
  newNoteBtn: document.getElementById("newNoteBtn"),
  titleInput: document.getElementById("titleInput"),
  contentInput: document.getElementById("contentInput"),
  preview: document.getElementById("preview"),
  isPublic: document.getElementById("isPublic"),
  saveNoteBtn: document.getElementById("saveNoteBtn"),
  deleteNoteBtn: document.getElementById("deleteNoteBtn"),
  copyPublicLinkBtn: document.getElementById("copyPublicLinkBtn"),
  wordCount: document.getElementById("wordCount"),
  readTime: document.getElementById("readTime"),
  saveState: document.getElementById("saveState"),
  autoSaveToggle: document.getElementById("autoSaveToggle"),
  previewToggle: document.getElementById("previewToggle"),
  fontSizeRange: document.getElementById("fontSizeRange"),
  compactModeToggle: document.getElementById("compactModeToggle"),
  splitRange: document.getElementById("splitRange"),
  exportMdBtn: document.getElementById("exportMdBtn"),
  importMdInput: document.getElementById("importMdInput"),
  duplicateNoteBtn: document.getElementById("duplicateNoteBtn"),
  blockButtons: Array.from(document.querySelectorAll(".chip-btn")),
  toastArea: document.getElementById("toastArea"),
};

marked.setOptions({ breaks: true, gfm: true });
mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
}

function applySettings() {
  el.autoSaveToggle.checked = state.settings.autoSave;
  el.previewToggle.checked = state.settings.showPreview;
  el.fontSizeRange.value = String(state.settings.editorFontSize);
  el.compactModeToggle.checked = state.settings.compactMode;
  el.splitRange.value = String(state.settings.splitRatio);

  el.contentInput.style.fontSize = `${state.settings.editorFontSize}px`;
  el.preview.style.display = state.settings.showPreview ? "block" : "none";
  el.editorContent.style.setProperty("--editor-split", `${state.settings.splitRatio}%`);

  el.sidebar.classList.toggle("collapsed", state.settings.sidebarCollapsed);
  el.settingsPanel.classList.toggle("closed", !state.settings.settingsOpen);
  document.body.classList.toggle("compact-mode", state.settings.compactMode);
}

function setSaveState(text) {
  el.saveState.textContent = text;
}

function toast(text, type = "info") {
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = text;
  el.toastArea.appendChild(node);
  setTimeout(() => node.classList.add("hide"), 1800);
  setTimeout(() => node.remove(), 2400);
}

function authHeaders() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

function requireAuth(actionText = "이 기능") {
  if (state.isAuthenticated) {
    return true;
  }
  toast(`${actionText}은 로그인 후 사용할 수 있습니다.`, "warn");
  return false;
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
    if (res.status === 401) {
      state.token = "";
      state.isAuthenticated = false;
      localStorage.removeItem("nullnote_token");
      updateAuthButton();
      throw new Error("로그인이 필요합니다.");
    }
    throw new Error(data.detail || "요청 실패");
  }
  return data;
}

function updateAuthButton() {
  el.logoutBtn.textContent = state.isAuthenticated ? "로그아웃" : "로그인";
  el.loginCtaBtn.hidden = state.isAuthenticated;
  el.guestBadge.hidden = state.isAuthenticated;
}

function normalizeMermaidMarkdown(text) {
  const source = text || "";
  if (source.includes("```")) {
    return source;
  }

  const firstNonEmpty = source.split(/\r?\n/).find((line) => line.trim().length > 0);
  if (!firstNonEmpty) {
    return source;
  }

  const start = firstNonEmpty.trim();
  const mermaidStarts = [
    "sequenceDiagram",
    "flowchart",
    "graph",
    "classDiagram",
    "stateDiagram",
    "erDiagram",
    "journey",
    "gantt",
    "pie",
    "mindmap",
    "timeline",
  ];

  if (mermaidStarts.some((prefix) => start.startsWith(prefix))) {
    return `\`\`\`mermaid\n${source.trim()}\n\`\`\``;
  }
  return source;
}

function enhanceMermaid(root) {
  const codeNodes = root.querySelectorAll("pre > code");
  for (const code of codeNodes) {
    const cls = code.className || "";
    if (!/(^|\s)(language-mermaid|lang-mermaid|mermaid)(\s|$)/.test(cls)) {
      continue;
    }

    const pre = code.parentElement;
    const block = document.createElement("div");
    block.className = "mermaid";
    block.textContent = code.textContent || "";
    pre.replaceWith(block);
  }
}

function updateTextStats() {
  const content = el.contentInput.value || "";
  const count = content.length;
  const readMinutes = Math.max(1, Math.ceil(count / 500));
  el.wordCount.textContent = `${count}자`;
  el.readTime.textContent = `예상 읽기 ${readMinutes}분`;
}

function insertAtCursor(snippet) {
  const { selectionStart, selectionEnd, value } = el.contentInput;
  const nextValue = value.slice(0, selectionStart) + snippet + value.slice(selectionEnd);
  el.contentInput.value = nextValue;
  const pos = selectionStart + snippet.length;
  el.contentInput.focus();
  el.contentInput.setSelectionRange(pos, pos);
  updateTextStats();
  renderPreview().catch(() => {});
  scheduleAutoSave();
}

async function renderPreview() {
  const html = marked.parse(normalizeMermaidMarkdown(el.contentInput.value || ""));
  el.preview.innerHTML = html;
  enhanceMermaid(el.preview);
  Prism.highlightAllUnder(el.preview);
  await mermaid.run({ nodes: el.preview.querySelectorAll(".mermaid") });
}

function clearEditor() {
  state.currentNoteId = null;
  el.titleInput.value = "";
  el.contentInput.value = "";
  el.isPublic.checked = false;
  setSaveState("새 노트");
  updateTextStats();
  renderPreview().catch(() => {});
}

function fillEditor(note) {
  state.currentNoteId = note.id;
  el.titleInput.value = note.title;
  el.contentInput.value = note.content;
  el.isPublic.checked = note.is_public;
  setSaveState("불러옴");
  updateTextStats();
  renderPreview().catch(() => {});
}

function renderNoteList() {
  el.noteList.innerHTML = "";

  const query = el.searchInput.value.trim().toLowerCase();
  const filtered = !query
    ? state.notes
    : state.notes.filter((note) => {
        return (
          (note.title || "").toLowerCase().includes(query) ||
          (note.content || "").toLowerCase().includes(query)
        );
      });

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "note-item empty";
    empty.innerHTML = "<strong>노트가 없습니다</strong><span>새 노트를 만들어 시작하세요.</span>";
    el.noteList.appendChild(empty);
    return;
  }

  for (const note of filtered) {
    const li = document.createElement("li");
    li.className = "note-item";
    if (state.currentNoteId === note.id) {
      li.classList.add("active");
    }

    li.innerHTML = `
      <strong>${note.title || "Untitled"}</strong>
      <span>${note.is_public ? "공개" : "비공개"} · ${new Date(note.updated_at).toLocaleDateString()}</span>
    `;
    li.addEventListener("click", () => {
      fillEditor(note);
      renderNoteList();
    });
    el.noteList.appendChild(li);
  }
}

async function loadMyNotes() {
  try {
    state.notes = state.isAuthenticated ? await api("/notes/user") : await api("/notes/public");
  } catch (error) {
    if (state.isAuthenticated) {
      state.notes = await api("/notes/public");
      toast("인증 상태를 확인할 수 없어 공개 노트를 표시합니다.", "warn");
    } else {
      throw error;
    }
  }

  if (state.currentNoteId) {
    const current = state.notes.find((n) => n.id === state.currentNoteId);
    if (!current) {
      state.currentNoteId = null;
    }
  }

  renderNoteList();
}

async function saveCurrentNote({ silent = false } = {}) {
  if (!requireAuth("저장")) {
    return;
  }

  const payload = {
    title: el.titleInput.value.trim() || "Untitled",
    content: el.contentInput.value,
    is_public: el.isPublic.checked,
  };

  setSaveState("저장 중...");

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
  setSaveState(silent ? "자동 저장 완료" : "저장 완료");
  if (!silent) {
    toast("저장 완료", "success");
  }
}

async function deleteCurrentNote() {
  if (!requireAuth("삭제")) {
    return;
  }

  if (!state.currentNoteId) {
    toast("삭제할 노트를 선택하세요.", "warn");
    return;
  }
  if (!confirm("정말 삭제할까요?")) {
    return;
  }

  await api(`/notes/${state.currentNoteId}`, { method: "DELETE" });
  state.notes = state.notes.filter((n) => n.id !== state.currentNoteId);
  clearEditor();
  renderNoteList();
  toast("노트를 삭제했습니다.", "success");
}

async function copyPublicLink() {
  if (!state.currentNoteId) {
    toast("노트를 먼저 선택하세요.", "warn");
    return;
  }
  const current = state.notes.find((n) => n.id === state.currentNoteId);
  if (!current || !current.is_public) {
    toast("공개 노트만 링크를 복사할 수 있습니다.", "warn");
    return;
  }

  const url = `${location.origin}/public?id=${state.currentNoteId}`;
  await navigator.clipboard.writeText(url);
  setSaveState("공개 링크 복사됨");
  toast("공개 링크를 복사했습니다.", "success");
}

function scheduleAutoSave() {
  if (!state.settings.autoSave || !state.isAuthenticated) {
    return;
  }

  if (state.autoSaveTimer) {
    clearTimeout(state.autoSaveTimer);
  }

  state.autoSaveTimer = setTimeout(() => {
    saveCurrentNote({ silent: true }).catch((err) => setSaveState(err.message));
  }, 1200);
}

function exportMarkdown() {
  const title = (el.titleInput.value || "untitled").replace(/\s+/g, "-").toLowerCase();
  const blob = new Blob([el.contentInput.value || ""], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title || "note"}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function importMarkdownFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");
    const firstHeading = text.match(/^#\s+(.+)$/m);
    if (firstHeading && !el.titleInput.value.trim()) {
      el.titleInput.value = firstHeading[1].trim();
    }
    el.contentInput.value = text;
    updateTextStats();
    renderPreview().catch(() => {});
    scheduleAutoSave();
  };
  reader.readAsText(file);
}

function duplicateCurrentNote() {
  if (!el.titleInput.value.trim() && !el.contentInput.value.trim()) {
    toast("복제할 내용이 없습니다.", "warn");
    return;
  }
  state.currentNoteId = null;
  el.titleInput.value = `${el.titleInput.value || "Untitled"} (복사본)`;
  setSaveState("복제본으로 전환됨. 저장하면 새 노트로 생성됩니다.");
  renderNoteList();
  toast("복제본으로 전환되었습니다.");
}

function logout() {
  if (!state.isAuthenticated) {
    location.href = "/login";
    return;
  }

  state.token = "";
  state.isAuthenticated = false;
  localStorage.removeItem("nullnote_token");
  state.currentNoteId = null;
  updateAuthButton();
  loadMyNotes().catch((e) => toast(e.message, "warn"));
  clearEditor();
  toast("로그아웃되었습니다.");
}

el.sidebarToggleBtn.addEventListener("click", () => {
  state.settings.sidebarCollapsed = !state.settings.sidebarCollapsed;
  applySettings();
  saveSettings();
});

el.settingsToggleBtn.addEventListener("click", () => {
  state.settings.settingsOpen = !state.settings.settingsOpen;
  applySettings();
  saveSettings();
});

el.logoutBtn.addEventListener("click", logout);
el.loginCtaBtn.addEventListener("click", () => {
  location.href = "/login";
});
el.newNoteBtn.addEventListener("click", clearEditor);
el.refreshNotesBtn.addEventListener("click", () => loadMyNotes().catch((e) => toast(e.message, "warn")));
el.saveNoteBtn.addEventListener("click", () => saveCurrentNote().catch((e) => toast(e.message, "warn")));
el.deleteNoteBtn.addEventListener("click", () => deleteCurrentNote().catch((e) => toast(e.message, "warn")));
el.copyPublicLinkBtn.addEventListener("click", () => copyPublicLink().catch((e) => toast(e.message, "warn")));
el.exportMdBtn.addEventListener("click", exportMarkdown);
el.duplicateNoteBtn.addEventListener("click", duplicateCurrentNote);

el.searchInput.addEventListener("input", () => {
  renderNoteList();
});

el.importMdInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) {
    importMarkdownFile(file);
    toast("Markdown 파일을 불러왔습니다.", "success");
  }
  event.target.value = "";
});

el.blockButtons.forEach((button) => {
  button.addEventListener("click", () => {
    insertAtCursor(button.dataset.snippet || "");
    toast("블록이 삽입되었습니다.");
  });
});

el.contentInput.addEventListener("input", () => {
  updateTextStats();
  renderPreview().catch(() => {});
  setSaveState("수정됨");
  scheduleAutoSave();
});

el.titleInput.addEventListener("input", () => {
  setSaveState("수정됨");
  scheduleAutoSave();
});

el.isPublic.addEventListener("change", () => {
  setSaveState("수정됨");
  scheduleAutoSave();
});

el.autoSaveToggle.addEventListener("change", () => {
  state.settings.autoSave = el.autoSaveToggle.checked;
  saveSettings();
});

el.previewToggle.addEventListener("change", () => {
  state.settings.showPreview = el.previewToggle.checked;
  applySettings();
  saveSettings();
});

el.fontSizeRange.addEventListener("input", () => {
  state.settings.editorFontSize = Number(el.fontSizeRange.value);
  applySettings();
  saveSettings();
});

el.compactModeToggle.addEventListener("change", () => {
  state.settings.compactMode = el.compactModeToggle.checked;
  applySettings();
  saveSettings();
});

el.splitRange.addEventListener("input", () => {
  state.settings.splitRatio = Number(el.splitRange.value);
  applySettings();
  saveSettings();
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveCurrentNote().catch((e) => toast(e.message, "warn"));
  }
});

(async function init() {
  updateAuthButton();
  applySettings();
  clearEditor();
  try {
    await loadMyNotes();
  } catch (error) {
    toast(error.message || "초기 로딩에 실패했습니다.", "warn");
    state.notes = [];
    renderNoteList();
  }
})();
