const token = localStorage.getItem("nullnote_token") || "";

const STORAGE_KEY = "nullnote_ui_settings";
const DEFAULT_SETTINGS = {
  autoSave: true,
  showPreview: false,
  editorFontSize: 16,
  fontSizeUnit: "px",
  lineHeight: 1.6,
  darkMode: false,
  autoSaveDelay: 1200,
  editorWidth: "full",
  toastDuration: 2400,
  reduceMotion: false,
  sidebarCollapsed: true,
  settingsOpen: false,
  compactMode: false,
  splitRatio: 58,
};

const state = {
  token,
  isAuthenticated: false,
  notes: [],
  currentNoteId: null,
  isDirty: false,
  isSaving: false,
  autoSaveTimer: null,
  settings: { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") },
  folders: [],
  tags: [],
  activeFolderId: null,
  activeTagId: null,
  sidebarContextFolderId: null,
  sidebarContextFolderPath: null,
  notePagination: { total: 0, limit: 50, offset: 0 },
};

function escapeHtml(text) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(text));
  return d.innerHTML;
}

const el = {
  appLayout: document.getElementById("appLayout"),
  editorContent: document.getElementById("editorContent"),
  editorPane: document.getElementById("editorPane"),
  editorSplitter: document.getElementById("editorSplitter"),
  sidebar: document.getElementById("sidebar"),
  sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
  settingsToggleBtn: document.getElementById("settingsToggleBtn"),
  settingsPanel: document.getElementById("settingsPanel"),
  logoutBtn: document.getElementById("logoutBtn"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  guestBadge: document.getElementById("guestBadge"),
  searchInput: document.getElementById("searchInput"),
  refreshNotesBtn: document.getElementById("refreshNotesBtn"),
  noteList: document.getElementById("noteList"),
  newNoteBtn: document.getElementById("newNoteBtn"),
  titleInput: document.getElementById("titleInput"),
  contentInput: document.getElementById("contentInput"),
  preview: document.getElementById("preview"),
  previewQuickToggleBtn: document.getElementById("previewQuickToggleBtn"),
  isPublic: document.getElementById("isPublic"),
  pinNoteBtn: document.getElementById("pinNoteBtn"),
  saveNoteBtn: document.getElementById("saveNoteBtn"),
  deleteNoteBtn: document.getElementById("deleteNoteBtn"),
  copyPublicLinkBtn: document.getElementById("copyPublicLinkBtn"),
  wordCount: document.getElementById("wordCount"),
  readTime: document.getElementById("readTime"),
  saveState: document.getElementById("saveState"),
  autoSaveToggle: document.getElementById("autoSaveToggle"),
  previewToggle: document.getElementById("previewToggle"),
  fontSizeUnitSelect: document.getElementById("fontSizeUnitSelect"),
  fontSizeNumber: document.getElementById("fontSizeNumber"),
  lineHeightNumber: document.getElementById("lineHeightNumber"),
  autoSaveDelaySelect: document.getElementById("autoSaveDelaySelect"),
  editorWidthSelect: document.getElementById("editorWidthSelect"),
  toastDurationSelect: document.getElementById("toastDurationSelect"),
  compactModeToggle: document.getElementById("compactModeToggle"),
  reduceMotionToggle: document.getElementById("reduceMotionToggle"),
  exportMdBtn: document.getElementById("exportMdBtn"),
  importMdInput: document.getElementById("importMdInput"),
  duplicateNoteBtn: document.getElementById("duplicateNoteBtn"),
  resetSettingsBtn: document.getElementById("resetSettingsBtn"),
  contextMenu: document.getElementById("editorContextMenu"),
  contextRecentTitle: document.getElementById("contextRecentTitle"),
  contextRecent: document.getElementById("contextRecent"),
  contextMenuSearch: document.getElementById("contextMenuSearch"),
  contextButtons: Array.from(document.querySelectorAll("#editorContextMenu button[data-action]")),
  toastArea: document.getElementById("toastArea"),
  sidebarWorkspace: document.getElementById("sidebarWorkspace"),
  folderTree: document.getElementById("folderTree"),
  sidebarContextMenu: document.getElementById("sidebarContextMenu"),
  sidebarMenuCreateFolder: document.getElementById("sidebarMenuCreateFolder"),
  sidebarMenuCreateFile: document.getElementById("sidebarMenuCreateFile"),
  sidebarMenuCreateSubfolder: document.getElementById("sidebarMenuCreateSubfolder"),
  sidebarMenuCreateFileInFolder: document.getElementById("sidebarMenuCreateFileInFolder"),
  tagList: document.getElementById("tagList"),
  filterAllBtn: document.getElementById("filterAllBtn"),
  filterFolderBtn: document.getElementById("filterFolderBtn"),
  filterTagBtn: document.getElementById("filterTagBtn"),
  noteMeta: document.getElementById("noteMeta"),
  noteFolderChips: document.getElementById("noteFolderChips"),
  noteTagChips: document.getElementById("noteTagChips"),
};

let dragState = null;
let contextMenuApi = null;

marked.setOptions({ breaks: true, gfm: true });
mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
}

function syncFontSizeConstraints() {
  if (state.settings.fontSizeUnit === "%") {
    el.fontSizeNumber.min = "70";
    el.fontSizeNumber.max = "180";
  } else {
    el.fontSizeNumber.min = "12";
    el.fontSizeNumber.max = "36";
  }
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function normalizeSettingsNumbers() {
  if (state.settings.fontSizeUnit === "%") {
    state.settings.editorFontSize = clampNumber(state.settings.editorFontSize, 70, 180, 100);
  } else {
    state.settings.editorFontSize = clampNumber(state.settings.editorFontSize, 12, 36, 16);
  }
  state.settings.lineHeight = clampNumber(state.settings.lineHeight, 1.2, 2.2, 1.6);
}

function applySettings() {
  normalizeSettingsNumbers();
  syncFontSizeConstraints();
  el.autoSaveToggle.checked = state.settings.autoSave;
  el.previewToggle.checked = state.settings.showPreview;
  el.fontSizeUnitSelect.value = state.settings.fontSizeUnit;
  el.fontSizeNumber.value = String(state.settings.editorFontSize);
  el.lineHeightNumber.value = String(state.settings.lineHeight);
  el.autoSaveDelaySelect.value = String(state.settings.autoSaveDelay);
  el.editorWidthSelect.value = state.settings.editorWidth;
  el.toastDurationSelect.value = String(state.settings.toastDuration);
  el.compactModeToggle.checked = state.settings.compactMode;
  el.reduceMotionToggle.checked = state.settings.reduceMotion;

  el.contentInput.style.fontSize = `${state.settings.editorFontSize}${state.settings.fontSizeUnit}`;
  el.contentInput.style.lineHeight = String(state.settings.lineHeight);
  el.editorContent.style.setProperty("--editor-split", `${state.settings.splitRatio}%`);
  el.editorContent.classList.toggle("preview-hidden", !state.settings.showPreview);
  el.preview.style.display = state.settings.showPreview ? "block" : "none";
  el.editorSplitter.style.display = state.settings.showPreview ? "block" : "none";

  if (el.previewQuickToggleBtn) {
    el.previewQuickToggleBtn.textContent = state.settings.showPreview ? "미리보기 숨기기" : "미리보기 열기";
  }

  el.editorPane.classList.toggle("narrow", state.settings.editorWidth === "narrow");
  el.editorPane.classList.toggle("wide", state.settings.editorWidth === "wide");

  el.sidebar.classList.toggle("collapsed", state.settings.sidebarCollapsed);
  el.appLayout.classList.toggle("sidebar-collapsed", state.settings.sidebarCollapsed);
  el.appLayout.classList.toggle("settings-collapsed", !state.settings.settingsOpen);
  el.settingsPanel.classList.toggle("closed", !state.settings.settingsOpen);
  document.body.classList.toggle("compact-mode", state.settings.compactMode);
  document.body.classList.toggle("dark-mode", state.settings.darkMode);

  if (el.themeToggleBtn) {
    el.themeToggleBtn.title = state.settings.darkMode ? "라이트 모드 전환" : "다크 모드 전환";
    const moonIcon = el.themeToggleBtn.querySelector(".icon-moon");
    const sunIcon = el.themeToggleBtn.querySelector(".icon-sun");
    if (moonIcon && sunIcon) {
      moonIcon.style.display = state.settings.darkMode ? "none" : "";
      sunIcon.style.display = state.settings.darkMode ? "" : "none";
    }
  }
}

function setSaveState(text) {
  el.saveState.textContent = text;
}

function setDirty(dirty) {
  state.isDirty = dirty;
  if (!dirty) {
    return;
  }
  if (el.saveState.textContent !== "저장 중...") {
    setSaveState("수정됨");
  }
}

function updateProtectedControls() {
  const protectedControls = [
    el.newNoteBtn,
    el.saveNoteBtn,
    el.deleteNoteBtn,
    el.copyPublicLinkBtn,
    el.exportMdBtn,
    el.importMdInput,
    el.duplicateNoteBtn,
    el.isPublic,
    el.pinNoteBtn,
  ];

  for (const node of protectedControls) {
    if (!node) {
      continue;
    }
    node.disabled = !state.isAuthenticated;
  }
}

function resetSettingsToDefault() {
  state.settings = { ...DEFAULT_SETTINGS };
  applySettings();
  saveSettings();
  toast("설정을 기본값으로 초기화했습니다.", "success");
}

function toast(text, type = "info") {
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = text;
  el.toastArea.appendChild(node);
  const hideAt = Math.max(800, Number(state.settings.toastDuration || 2400) - 500);
  const removeAt = Math.max(1200, Number(state.settings.toastDuration || 2400));
  setTimeout(() => node.classList.add("hide"), hideAt);
  setTimeout(() => node.remove(), removeAt);
}

function closeContextMenu() {
  contextMenuApi?.close();
}

function setSplitRatio(rawRatio) {
  const ratio = Math.max(20, Math.min(80, rawRatio));
  state.settings.splitRatio = ratio;
  el.editorContent.style.setProperty("--editor-split", `${ratio}%`);
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
  return _apiFetch(path, options);
}

async function _apiFetch(path, options = {}) {
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

async function uploadImageFile(file) {
  if (!requireAuth("이미지 업로드")) return;

  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    toast("지원하지 않는 이미지 형식입니다.", "warn");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast("이미지 크기는 10MB 이하여야 합니다.", "warn");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    setSaveState("이미지 업로드 중...");
    const res = await fetch("/images", {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "업로드 실패" }));
      throw new Error(err.detail || "업로드 실패");
    }

    const data = await res.json();
    const markdown = `![${file.name}](${data.url})`;
    insertAtCursor(markdown);
    toast("이미지를 업로드했습니다.", "success");
  } catch (err) {
    toast(err.message || "이미지 업로드에 실패했습니다.", "warn");
  }
}

function updateAuthButton() {
  el.logoutBtn.textContent = state.isAuthenticated ? "로그아웃" : "로그인";
  el.guestBadge.hidden = state.isAuthenticated;
  updateProtectedControls();
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

function addCopyButtons(root) {
  const pres = root.querySelectorAll("pre");
  for (const pre of pres) {
    if (pre.querySelector(".copy-code-btn")) {
      continue;
    }
    const btn = document.createElement("button");
    btn.className = "copy-code-btn";
    btn.textContent = "복사";
    btn.addEventListener("click", () => {
      const code = pre.querySelector("code");
      navigator.clipboard.writeText(code?.textContent || pre.textContent || "").then(() => {
        btn.textContent = "복사됨";
        setTimeout(() => { btn.textContent = "복사"; }, 1500);
      });
    });
    pre.style.position = "relative";
    pre.appendChild(btn);
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
  el.preview.innerHTML = DOMPurify.sanitize(html);
  enhanceMermaid(el.preview);
  addCopyButtons(el.preview);
  Prism.highlightAllUnder(el.preview);
  await mermaid.run({ nodes: el.preview.querySelectorAll(".mermaid") });
}

function clearEditor() {
  state.currentNoteId = null;
  el.titleInput.value = "";
  el.contentInput.value = "";
  el.isPublic.checked = false;
  el.pinNoteBtn.classList.remove("pinned");
  el.noteMeta.hidden = true;
  state.isDirty = false;
  setSaveState("새 노트");
  updateTextStats();
  renderPreview().catch(() => {});
  closeContextMenu();
}

function fillEditor(note) {
  state.currentNoteId = note.id;
  el.titleInput.value = note.title;
  el.contentInput.value = note.content;
  el.isPublic.checked = note.is_public;
  el.pinNoteBtn.classList.toggle("pinned", note.is_pinned);
  el.noteMeta.hidden = !state.isAuthenticated;
  populateMetaChips(note);
  state.isDirty = false;
  setSaveState("불러옴");
  updateTextStats();
  renderPreview().catch(() => {});
}

function populateMetaChips(note) {
  const noteFolders = note.folders || [];
  const noteTags = note.tags || [];

  el.noteFolderChips.innerHTML = "";
  for (const f of state.folders) {
    const isActive = noteFolders.some((nf) => nf.id === f.id);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "meta-chip" + (isActive ? " active" : "");
    chip.textContent = f.name;
    chip.dataset.id = f.id;
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      setDirty(true);
      scheduleAutoSave();
    });
    el.noteFolderChips.appendChild(chip);
  }

  el.noteTagChips.innerHTML = "";
  for (const t of state.tags) {
    const isActive = noteTags.some((nt) => nt.id === t.id);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "meta-chip" + (isActive ? " active" : "");
    chip.textContent = t.name;
    chip.dataset.id = t.id;
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      setDirty(true);
      scheduleAutoSave();
    });
    el.noteTagChips.appendChild(chip);
  }
}

function renderNoteList() {
  el.noteList.innerHTML = "";

  const query = el.searchInput.value.trim().toLowerCase();
  let filtered = state.notes;

  if (state.activeFolderId) {
    filtered = filtered.filter((n) => (n.folders || []).some((f) => f.id === state.activeFolderId));
  }
  if (state.activeTagId) {
    filtered = filtered.filter((n) => (n.tags || []).some((t) => t.id === state.activeTagId));
  }

  if (query) {
    filtered = filtered.filter((note) => {
      return (
        (note.title || "").toLowerCase().includes(query) ||
        (note.content || "").toLowerCase().includes(query)
      );
    });
  }

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "note-item empty";
    empty.innerHTML = "<strong>노트가 없습니다</strong><span>새 노트를 만들어 시작하세요.</span>";
    el.noteList.appendChild(empty);
    return;
  }

  for (const note of filtered) {
    const noteFolders = note.folders || [];
    const primaryFolder = noteFolders
      .slice()
      .sort((a, b) => (b.name?.split("/").length || 0) - (a.name?.split("/").length || 0))[0];
    const depth = primaryFolder ? Math.max(0, primaryFolder.name.split("/").length - 1) : 0;

    const li = document.createElement("li");
    li.className = "note-item file-entry";
    li.style.setProperty("--file-depth", String(depth));
    if (state.currentNoteId === note.id) {
      li.classList.add("active");
    }
    if (note.is_pinned) {
      li.classList.add("pinned");
    }

    const folderText = primaryFolder ? primaryFolder.name : "루트";
    const visibility = note.is_public ? "공개" : "비공개";
    const dateText = new Date(note.updated_at || note.created_at).toLocaleDateString();
    li.innerHTML = `
      <strong class="file-title">📄 ${escapeHtml(note.title || "Untitled")}</strong>
      <span class="file-meta">${escapeHtml(folderText)} · ${visibility} · ${dateText}</span>
    `;
    li.addEventListener("click", () => {
      fillEditor(note);
      renderNoteList();
    });
    el.noteList.appendChild(li);
  }
}

function closeSidebarContextMenu() {
  if (!el.sidebarContextMenu) {
    return;
  }
  el.sidebarContextMenu.hidden = true;
  el.sidebarContextMenu.style.display = "";
  state.sidebarContextFolderId = null;
  state.sidebarContextFolderPath = null;
}

function openSidebarContextMenu(clientX, clientY, { folderId = null, folderPath = null } = {}) {
  if (!el.sidebarContextMenu) {
    return;
  }
  state.sidebarContextFolderId = folderId;
  state.sidebarContextFolderPath = folderPath;
  el.sidebarMenuCreateSubfolder.hidden = !folderId;
  el.sidebarMenuCreateFileInFolder.hidden = !folderId;
  el.sidebarMenuCreateFolder.hidden = Boolean(folderId);
  el.sidebarMenuCreateFile.hidden = Boolean(folderId);

  el.sidebarContextMenu.hidden = false;
  el.sidebarContextMenu.style.display = "";
  const menuWidth = 220;
  const menuHeight = 180;
  const left = Math.min(clientX, window.innerWidth - menuWidth - 8);
  const top = Math.min(clientY, window.innerHeight - menuHeight - 8);
  el.sidebarContextMenu.style.left = `${Math.max(8, left)}px`;
  el.sidebarContextMenu.style.top = `${Math.max(8, top)}px`;
}

async function createFolderFromContext(parentFolderId = null, parentFolderPath = null) {
  if (!requireAuth("폴더 생성")) {
    return;
  }
  const input = prompt(parentFolderId ? "하위 폴더 이름" : "폴더 이름");
  const name = (input || "").trim();
  if (!name) {
    return;
  }

  let finalName = name;
  if (parentFolderId || parentFolderPath) {
    const parentName = parentFolderPath || state.folders.find((f) => f.id === parentFolderId)?.name;
    if (!parentName) {
      toast("부모 폴더를 찾을 수 없습니다.", "warn");
      return;
    }
    // Backend is currently flat; use path notation to represent nested folders.
    finalName = `${parentName}/${name}`;
  }

  try {
    await api("/folders", { method: "POST", body: JSON.stringify({ name: finalName }) });
    await loadFolders();
    toast(parentFolderId ? "하위 폴더를 만들었습니다." : "폴더를 만들었습니다.", "success");
  } catch (err) {
    toast(err.message || "폴더 생성에 실패했습니다.", "warn");
  }
}

async function ensureFolderIdByPath(folderPath) {
  if (!folderPath) {
    return null;
  }
  let folder = state.folders.find((f) => f.name === folderPath);
  if (folder) {
    return folder.id;
  }
  await api("/folders", { method: "POST", body: JSON.stringify({ name: folderPath }) });
  await loadFolders();
  folder = state.folders.find((f) => f.name === folderPath);
  return folder ? folder.id : null;
}

async function createFileFromContext(folderId = null, folderPath = null) {
  if (!requireAuth("노트 생성")) {
    return;
  }
  const input = prompt("파일(노트) 제목", "Untitled");
  const title = (input || "").trim() || "Untitled";

  const payload = {
    title,
    content: "",
    is_public: false,
    is_pinned: false,
  };
  try {
    let targetFolderId = folderId;
    if (!targetFolderId && folderPath) {
      targetFolderId = await ensureFolderIdByPath(folderPath);
    }
    if (targetFolderId) {
      payload.folder_ids = [targetFolderId];
    }

    let created = await api("/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Defensive fallback: if backend response misses folder mapping, patch it once.
    if (targetFolderId && !(created.folders || []).some((f) => f.id === targetFolderId)) {
      created = await api(`/notes/${created.id}`, {
        method: "PUT",
        body: JSON.stringify({ folder_ids: [targetFolderId] }),
      });
    }

    if (targetFolderId) {
      state.activeFolderId = targetFolderId;
      state.activeTagId = null;
      el.filterFolderBtn.hidden = false;
      el.filterTagBtn.hidden = true;
    }

    state.notes.unshift(created);
    fillEditor(created);
    await loadMyNotes();
    updateFilterButtons();
    renderNoteList();
    toast(targetFolderId ? "폴더에 파일을 만들었습니다." : "파일을 만들었습니다.", "success");
  } catch (err) {
    toast(err.message || "파일 생성에 실패했습니다.", "warn");
  }
}

function renderFolders() {
  if (!el.folderTree) {
    return;
  }
  el.folderTree.innerHTML = "";

  const folders = [...state.folders].sort((a, b) => a.name.localeCompare(b.name, "ko"));

  for (const f of folders) {
    const parts = (f.name || "").split("/");
    const depth = Math.max(0, parts.length - 1);
    const displayName = parts[parts.length - 1] || f.name;

    const li = document.createElement("li");
    li.className = "folder-node";
    li.style.setProperty("--folder-depth", String(depth));
    if (state.activeFolderId === f.id) {
      li.classList.add("active");
    }

    li.innerHTML = `<button class="folder-row" type="button" data-folder-id="${f.id}" data-folder-path="${escapeHtml(
      f.name
    )}">
      <span class="folder-label">📁 ${escapeHtml(displayName)}</span>
    </button>`;

    li.querySelector(".folder-row").addEventListener("click", () => {
      if (state.activeFolderId === f.id) {
        state.activeFolderId = null;
        el.filterFolderBtn.hidden = true;
      } else {
        state.activeFolderId = f.id;
        state.activeTagId = null;
        el.filterFolderBtn.hidden = false;
        el.filterTagBtn.hidden = true;
      }
      updateFilterButtons();
      renderNoteList();
    });

    li.querySelector(".folder-row").addEventListener("contextmenu", (e) => {
      e.stopPropagation();
      e.preventDefault();
      openSidebarContextMenu(e.clientX, e.clientY, { folderId: f.id, folderPath: f.name });
    });

    el.folderTree.appendChild(li);
  }
}

function renderTags() {
  if (!el.tagList) {
    return;
  }
  el.tagList.innerHTML = "";
  for (const t of state.tags) {
    const span = document.createElement("span");
    span.className = "sidebar-tag";
    if (state.activeTagId === t.id) {
      span.classList.add("active");
    }
    span.innerHTML = `${escapeHtml(t.name)}<button class="icon-btn icon-btn-xs tag-delete-btn" data-id="${t.id}" title="삭제">✕</button>`;
    span.addEventListener("click", (e) => {
      if (e.target.closest(".tag-delete-btn")) return;
      if (state.activeTagId === t.id) {
        state.activeTagId = null;
        el.filterTagBtn.hidden = true;
      } else {
        state.activeTagId = t.id;
        state.activeFolderId = null;
        el.filterTagBtn.hidden = false;
        el.filterFolderBtn.hidden = true;
      }
      updateFilterButtons();
      renderNoteList();
    });
    span.querySelector(".tag-delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await api(`/tags/${t.id}`, { method: "DELETE" });
      await loadTags();
      toast("태그를 삭제했습니다.", "success");
    });
    el.tagList.appendChild(span);
  }
}

function updateFilterButtons() {
  el.filterAllBtn.classList.toggle("active", !state.activeFolderId && !state.activeTagId);
  el.filterFolderBtn.classList.toggle("active", Boolean(state.activeFolderId));
  el.filterTagBtn.classList.toggle("active", Boolean(state.activeTagId));
  const folderName = state.activeFolderId
    ? (state.folders.find((f) => f.id === state.activeFolderId)?.name || "")
    : "";
  const tagName = state.activeTagId
    ? (state.tags.find((t) => t.id === state.activeTagId)?.name || "")
    : "";
  el.filterFolderBtn.textContent = folderName ? folderName : "";
  el.filterTagBtn.textContent = tagName ? tagName : "";
  if (state.activeFolderId) {
    el.filterFolderBtn.hidden = false;
  }
  if (state.activeTagId) {
    el.filterTagBtn.hidden = false;
  }
}

async function loadMyNotes() {
  if (!state.isAuthenticated) {
    state.notes = [];
    state.currentNoteId = null;
    renderNoteList();
    return;
  }

  try {
    const data = await api("/notes/user");
    state.notes = data.items;
    state.notePagination = { total: data.total, limit: data.limit, offset: data.offset };
  } catch {
    state.notes = [];
  }

  if (state.currentNoteId) {
    const current = state.notes.find((n) => n.id === state.currentNoteId);
    if (!current) {
      state.currentNoteId = null;
    }
  }

  renderNoteList();
}

async function loadFolders() {
  if (!state.isAuthenticated) {
    state.folders = [];
    renderFolders();
    return;
  }
  try {
    state.folders = await api("/folders");
  } catch {
    state.folders = [];
  }
  renderFolders();
}

async function loadTags() {
  if (!state.isAuthenticated) {
    state.tags = [];
    renderTags();
    return;
  }
  try {
    state.tags = await api("/tags");
  } catch {
    state.tags = [];
  }
  renderTags();
}

async function saveCurrentNote({ silent = false } = {}) {
  if (!requireAuth("저장")) {
    return;
  }

  if (state.isSaving) {
    return;
  }

  const payload = {
    title: el.titleInput.value.trim() || "Untitled",
    content: el.contentInput.value,
    is_public: el.isPublic.checked,
    is_pinned: state.currentNoteId
      ? state.notes.find((n) => n.id === state.currentNoteId)?.is_pinned || false
      : false,
    is_autosave: silent,
  };

  if (state.currentNoteId) {
    payload.folder_ids = Array.from(el.noteFolderChips.querySelectorAll(".meta-chip.active")).map((c) => Number(c.dataset.id));
    payload.tag_ids = Array.from(el.noteTagChips.querySelectorAll(".meta-chip.active")).map((c) => Number(c.dataset.id));
  }

  state.isSaving = true;
  el.saveNoteBtn.disabled = true;
  setSaveState("저장 중...");
  try {
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
    state.isDirty = false;
    setSaveState(silent ? "자동 저장 완료" : "저장 완료");
    if (!silent) {
      toast("저장 완료", "success");
    }
  } finally {
    state.isSaving = false;
    el.saveNoteBtn.disabled = !state.isAuthenticated;
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
  if (!requireAuth("공유 링크")) return;

  try {
    const links = await api(`/notes/${state.currentNoteId}/share`);
    const activeLink = (links || []).find((l) => l.is_active);
    if (activeLink) {
      const url = `${location.origin}/s/${activeLink.token}`;
      await navigator.clipboard.writeText(url);
      setSaveState("공유 링크 복사됨");
      toast("공유 링크를 복사했습니다.", "success");
      return;
    }

    const created = await api(`/notes/${state.currentNoteId}/share`, { method: "POST", body: JSON.stringify({}) });
    const url = `${location.origin}/s/${created.token}`;
    await navigator.clipboard.writeText(url);
    setSaveState("공유 링크 복사됨");
    toast("공유 링크를 생성하고 복사했습니다.", "success");
  } catch (err) {
    toast(err.message || "공유 링크 생성에 실패했습니다.", "warn");
  }
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
  }, Number(state.settings.autoSaveDelay || 1200));
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
    setDirty(true);
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
  setDirty(true);
  setSaveState("복제본으로 전환됨. 저장하면 새 노트로 생성됩니다.");
  renderNoteList();
  toast("복제본으로 전환되었습니다.");
}

function logout() {
  if (state.isAuthenticated) {
    api("/auth/logout", { method: "POST" }).catch(() => {});
  }
  localStorage.removeItem("nullnote_token");
  location.href = "/login";
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

el.themeToggleBtn?.addEventListener("click", () => {
  state.settings.darkMode = !state.settings.darkMode;
  if (window.NullNoteTheme?.setTheme) {
    window.NullNoteTheme.setTheme(state.settings.darkMode ? "dark" : "light");
  }
  applySettings();
  saveSettings();
});

el.logoutBtn.addEventListener("click", logout);
el.newNoteBtn.addEventListener("click", clearEditor);
el.refreshNotesBtn.addEventListener("click", () => loadMyNotes().catch((e) => toast(e.message, "warn")));
el.saveNoteBtn.addEventListener("click", () => saveCurrentNote().catch((e) => toast(e.message, "warn")));
el.deleteNoteBtn.addEventListener("click", () => deleteCurrentNote().catch((e) => toast(e.message, "warn")));
el.copyPublicLinkBtn.addEventListener("click", () => copyPublicLink().catch((e) => toast(e.message, "warn")));

const imageUploadBtn = document.getElementById("imageUploadBtn");
if (imageUploadBtn) {
  imageUploadBtn.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImageFile(file);
    }
    event.target.value = "";
  });
}
el.exportMdBtn.addEventListener("click", exportMarkdown);
el.duplicateNoteBtn.addEventListener("click", duplicateCurrentNote);
el.resetSettingsBtn.addEventListener("click", resetSettingsToDefault);

el.pinNoteBtn?.addEventListener("click", () => {
  if (!requireAuth("고정")) return;
  const current = state.notes.find((n) => n.id === state.currentNoteId);
  if (!current) {
    toast("노트를 먼저 선택하세요.", "warn");
    return;
  }
  current.is_pinned = !current.is_pinned;
  el.pinNoteBtn.classList.toggle("pinned", current.is_pinned);
  setDirty(true);
  renderNoteList();
});

el.sidebarWorkspace?.addEventListener("contextmenu", (e) => {
  if (e.target.closest(".folder-row")) {
    return;
  }
  e.preventDefault();
  openSidebarContextMenu(e.clientX, e.clientY);
});

el.sidebarMenuCreateFolder?.addEventListener("click", async () => {
  closeSidebarContextMenu();
  await createFolderFromContext(null);
});

el.sidebarMenuCreateFile?.addEventListener("click", async () => {
  closeSidebarContextMenu();
  await createFileFromContext(null);
});


el.sidebarMenuCreateSubfolder?.addEventListener("click", async () => {
  const folderId = state.sidebarContextFolderId;
  const folderPath = state.sidebarContextFolderPath;
  closeSidebarContextMenu();
  if (!folderId && !folderPath) {
    return;
  }
  await createFolderFromContext(folderId, folderPath);
});

el.sidebarMenuCreateFileInFolder?.addEventListener("click", async () => {
  const folderId = state.sidebarContextFolderId;
  const folderPath = state.sidebarContextFolderPath;
  closeSidebarContextMenu();
  if (!folderId && !folderPath) {
    return;
  }
  await createFileFromContext(folderId, folderPath);
});

// 폴더 삭제
el.sidebarMenuDeleteFolder?.addEventListener("click", async () => {
  const folderId = state.sidebarContextFolderId;
  closeSidebarContextMenu();
  if (!folderId) {
    toast("삭제할 폴더를 찾을 수 없습니다.", "warn");
    return;
  }
  if (!confirm("정말 이 폴더를 삭제할까요? 폴더 내 파일은 삭제되지 않으며, 폴더 연결만 해제됩니다.")) {
    return;
  }
  try {
    await api(`/folders/${folderId}`, { method: "DELETE" });
    await loadFolders();
    toast("폴더를 삭제했습니다.", "success");
    // 폴더 삭제 시 해당 폴더가 활성화되어 있으면 해제
    if (state.activeFolderId === folderId) {
      state.activeFolderId = null;
      updateFilterButtons();
      renderNoteList();
    }
  } catch (err) {
    toast(err.message || "폴더 삭제에 실패했습니다.", "warn");
  }
});

// 파일(노트) 삭제
el.sidebarMenuDeleteFile?.addEventListener("click", async () => {
  // context menu에서 파일 id를 추적해야 함
  // 현재는 noteList에서 클릭된 파일이 state.currentNoteId로만 추적됨
  // 개선: context menu 열 때 파일 id도 state에 저장하도록 확장 필요
  // 임시로 현재 에디터에 열려있는 노트만 삭제 지원
  closeSidebarContextMenu();
  const noteId = state.currentNoteId;
  if (!noteId) {
    toast("삭제할 파일(노트)을 선택하세요.", "warn");
    return;
  }
  if (!confirm("정말 이 파일(노트)을 삭제할까요?")) {
    return;
  }
  try {
    await api(`/notes/${noteId}`, { method: "DELETE" });
    state.notes = state.notes.filter((n) => n.id !== noteId);
    clearEditor();
    renderNoteList();
    toast("파일(노트)를 삭제했습니다.", "success");
  } catch (err) {
    toast(err.message || "파일 삭제에 실패했습니다.", "warn");
  }
});

el.filterAllBtn.addEventListener("click", () => {
  state.activeFolderId = null;
  state.activeTagId = null;
  el.filterFolderBtn.hidden = true;
  el.filterTagBtn.hidden = true;
  updateFilterButtons();
  renderNoteList();
});

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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeContextMenu();
    closeSidebarContextMenu();
  }
});

document.addEventListener("click", (event) => {
  if (!el.sidebarContextMenu || el.sidebarContextMenu.hidden) {
    return;
  }
  if (el.sidebarContextMenu.contains(event.target)) {
    return;
  }
  closeSidebarContextMenu();
});

el.editorSplitter.addEventListener("mousedown", (event) => {
  if (!state.settings.showPreview) {
    return;
  }
  dragState = {
    startX: event.clientX,
    startRatio: state.settings.splitRatio,
  };
  document.body.classList.add("dragging-splitter");
});

window.addEventListener("mousemove", (event) => {
  if (!dragState) {
    return;
  }
  const width = el.editorContent.clientWidth || 1;
  const delta = ((event.clientX - dragState.startX) / width) * 100;
  setSplitRatio(dragState.startRatio + delta);
});

window.addEventListener("mouseup", () => {
  if (!dragState) {
    return;
  }
  dragState = null;
  document.body.classList.remove("dragging-splitter");
  saveSettings();
});

el.contentInput.addEventListener("input", () => {
  updateTextStats();
  renderPreview().catch(() => {});
  setDirty(true);
  scheduleAutoSave();
});

el.contentInput.addEventListener("paste", (event) => {
  const items = event.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      event.preventDefault();
      const file = item.getAsFile();
      if (file) uploadImageFile(file);
      return;
    }
  }
});

el.contentInput.addEventListener("drop", (event) => {
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  for (const file of files) {
    if (file.type.startsWith("image/")) {
      event.preventDefault();
      uploadImageFile(file);
      return;
    }
  }
});

el.titleInput.addEventListener("input", () => {
  setDirty(true);
  scheduleAutoSave();
});

el.isPublic.addEventListener("change", () => {
  setDirty(true);
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

el.previewQuickToggleBtn?.addEventListener("click", () => {
  state.settings.showPreview = !state.settings.showPreview;
  applySettings();
  saveSettings();
});

el.fontSizeNumber.addEventListener("input", () => {
  const [min, max, fallback] = state.settings.fontSizeUnit === "%" ? [70, 180, 100] : [12, 36, 16];
  state.settings.editorFontSize = clampNumber(el.fontSizeNumber.value, min, max, fallback);
  applySettings();
  saveSettings();
});

el.fontSizeUnitSelect.addEventListener("change", () => {
  state.settings.fontSizeUnit = el.fontSizeUnitSelect.value;
  if (state.settings.fontSizeUnit === "%") {
    state.settings.editorFontSize = clampNumber(state.settings.editorFontSize, 70, 180, 100);
  } else {
    state.settings.editorFontSize = clampNumber(state.settings.editorFontSize, 12, 36, 16);
  }
  el.fontSizeNumber.value = String(state.settings.editorFontSize);
  applySettings();
  saveSettings();
});

el.lineHeightNumber.addEventListener("input", () => {
  state.settings.lineHeight = clampNumber(el.lineHeightNumber.value, 1.2, 2.2, 1.6);
  applySettings();
  saveSettings();
});

el.autoSaveDelaySelect.addEventListener("change", () => {
  state.settings.autoSaveDelay = Number(el.autoSaveDelaySelect.value);
  saveSettings();
});

el.editorWidthSelect.addEventListener("change", () => {
  state.settings.editorWidth = el.editorWidthSelect.value;
  applySettings();
  saveSettings();
});

el.toastDurationSelect.addEventListener("change", () => {
  state.settings.toastDuration = Number(el.toastDurationSelect.value);
  saveSettings();
});

el.compactModeToggle.addEventListener("change", () => {
  state.settings.compactMode = el.compactModeToggle.checked;
  applySettings();
  saveSettings();
});

el.reduceMotionToggle.addEventListener("change", () => {
  state.settings.reduceMotion = el.reduceMotionToggle.checked;
  applySettings();
  saveSettings();
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveCurrentNote().catch((e) => toast(e.message, "warn"));
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!state.isDirty || !state.isAuthenticated) {
    return;
  }
  event.preventDefault();
  event.returnValue = "";
});

(async function init() {
  closeSidebarContextMenu();

  if (window.NullNoteTheme?.getTheme) {
    state.settings.darkMode = window.NullNoteTheme.getTheme() === "dark";
  }

  if (token) {
    try {
      await api("/auth/me");
      state.isAuthenticated = true;
    } catch {
      state.token = "";
      state.isAuthenticated = false;
      localStorage.removeItem("nullnote_token");
    }
  }

  updateAuthButton();
  applySettings();

  if (window.NullNoteContextMenu?.initContextMenu) {
    contextMenuApi = window.NullNoteContextMenu.initContextMenu({
      textarea: el.contentInput,
      menu: el.contextMenu,
      searchInput: el.contextMenuSearch,
      buttons: el.contextButtons,
      recentContainer: el.contextRecent,
      recentTitle: el.contextRecentTitle,
      onInsert: (snippet) => {
        insertAtCursor(snippet);
        setDirty(true);
      },
      onToast: (text) => toast(text),
    });
  }

  clearEditor();
  try {
    await Promise.all([loadMyNotes(), loadFolders(), loadTags()]);
  } catch (error) {
    toast(error.message || "초기 로딩에 실패했습니다.", "warn");
    state.notes = [];
    renderNoteList();
  }
})();