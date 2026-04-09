(function () {
  const RECENT_KEY = "nullnote_context_recent";
  const MAX_RECENT = 6;
  const MAX_EXAMPLE_LENGTH = 220;

  const SNIPPETS = {
    h1: "# ",
    h2: "## ",
    h3: "### ",
    quote: "> 인용문\n",
    divider: "\n---\n",
    todo: "- [ ] 할 일\n",
    ul: "- 항목\n- 항목\n",
    ol: "1. 항목\n2. 항목\n",
    table: "| 제목 | 값 |\n| --- | --- |\n| A | B |\n",
    code: "```\n\n```",
    inlineCode: "`code`",
    link: "[링크 텍스트](https://)",
    image: "![이미지 설명](https://)",
    callout: "> [!NOTE]\n> 내용\n",
    warning: "> [!WARNING]\n> 주의사항\n",
    success: "> [!TIP]\n> 완료/팁\n",
    toggle: "<details>\n<summary>토글 제목</summary>\n\n내용\n\n</details>\n",
    mermaid: "```mermaid\nsequenceDiagram\n\n```",
    math: "$$\n\\frac{a}{b}\n$$",
    json: "```json\n{\n  \"key\": \"value\"\n}\n```",
    yaml: "```yaml\nname: sample\nenabled: true\n```",
    bash: "```bash\n# command\n```",
    python: "```python\ndef main():\n    pass\n```",
    ts: "```ts\nconst value: string = \"\";\n```",
    sql: "```sql\nSELECT * FROM table_name;\n```",
    api: "### API Request\n\n- Method: GET\n- URL: /api/example\n- Auth: Bearer <token>\n",
    meeting: "## 회의록\n\n- 일시:\n- 참석자:\n- 안건:\n\n### 결정사항\n- ",
    kanban: "## Kanban\n\n### Todo\n- [ ]\n\n### Doing\n- [ ]\n\n### Done\n- [x]\n",
    bug: "## 버그 리포트\n\n- 증상:\n- 재현 단계:\n- 기대 결과:\n- 실제 결과:\n",
    decision: "## ADR\n\n- 배경:\n- 결정:\n- 대안:\n- 영향:\n",
    timeline: "## 타임라인\n\n- 09:00 - \n- 10:00 - \n- 11:00 - \n",
    footnote: "문장[^1]\n\n[^1]: 각주 내용",
    copyDate: () => new Date().toISOString().slice(0, 10),
  };

  const EXAMPLES = {
    h1: "# 프로젝트 개요",
    h2: "## 오늘 할 일",
    h3: "### 체크 포인트",
    quote: "> 핵심 문장을 인용합니다.",
    divider: "---",
    todo: "- [ ] 디자인 QA",
    ul: "- 항목 A\n- 항목 B",
    ol: "1. 첫 번째\n2. 두 번째",
    table: "| 항목 | 값 |\n| --- | --- |\n| 상태 | 진행중 |",
    code: "```\nconsole.log('hello')\n```",
    inlineCode: "`npm run dev`",
    link: "[문서](https://example.com)",
    image: "![설명](https://example.com/image.png)",
    callout: "> [!NOTE]\n> 참고 사항",
    warning: "> [!WARNING]\n> 운영 반영 전 점검",
    success: "> [!TIP]\n> 완료 후 공유",
    toggle: "<details>\n<summary>자세히 보기</summary>\n\n내용\n\n</details>",
    mermaid: "```mermaid\nflowchart TD\nA-->B\n```",
    math: "$$\nE = mc^2\n$$",
    json: "```json\n{\n  \"status\": \"ok\"\n}\n```",
    yaml: "```yaml\nenv: prod\ndebug: false\n```",
    bash: "```bash\ncurl -I https://example.com\n```",
    python: "```python\nprint('hello')\n```",
    ts: "```ts\nconst id: number = 1;\n```",
    sql: "```sql\nSELECT id, name FROM users;\n```",
    api: "- Method: POST\n- URL: /api/tasks",
    meeting: "- 일시: 2026-04-09 14:00",
    kanban: "### Todo\n- [ ] 로그인 UX 개선",
    bug: "- 증상: 저장 버튼 클릭 시 500",
    decision: "- 결정: 컨텍스트 메뉴 모듈 분리",
    timeline: "- 10:00 - 배포\n- 11:00 - 모니터링",
    footnote: "문장[^1]\n\n[^1]: 참고 링크",
    copyDate: "2026-04-09",
  };

  function loadRecent() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((key) => typeof key === "string" && SNIPPETS[key]).slice(0, MAX_RECENT);
    } catch {
      return [];
    }
  }

  function saveRecent(items) {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  }

  function resolveSnippet(action) {
    const source = SNIPPETS[action];
    if (!source) {
      return "";
    }
    return typeof source === "function" ? source() : source;
  }

  function resolveExample(action) {
    const manual = EXAMPLES[action];
    if (manual) {
      return manual;
    }
    const fallback = resolveSnippet(action) || "예시가 준비되지 않았습니다.";
    const normalized = fallback.replace(/\n{3,}/g, "\n\n").trim();
    if (normalized.length <= MAX_EXAMPLE_LENGTH) {
      return normalized;
    }
    return `${normalized.slice(0, MAX_EXAMPLE_LENGTH)}...`;
  }

  function initContextMenu(config) {
    const {
      textarea,
      menu,
      searchInput,
      buttons,
      recentContainer,
      recentTitle,
      onInsert,
      onToast,
    } = config;

    let recent = loadRecent();
    let visibleButtons = buttons.slice();
    let activeIndex = -1;

    const helpTooltip = document.createElement("div");
    helpTooltip.className = "context-example-tooltip";
    helpTooltip.hidden = true;
    document.body.appendChild(helpTooltip);

    function getLabelByAction(action) {
      const node = buttons.find((btn) => btn.dataset.action === action);
      return (node?.textContent || "블록").trim();
    }

    function hideHelpTooltip() {
      helpTooltip.hidden = true;
      helpTooltip.textContent = "";
    }

    function showHelpTooltip(target, action) {
      if (!action) {
        return;
      }
      const label = getLabelByAction(action);
      const example = resolveExample(action);
      helpTooltip.textContent = `${label} 예시\n${example}`;
      helpTooltip.hidden = false;

      const targetRect = target.getBoundingClientRect();
      const tooltipRect = helpTooltip.getBoundingClientRect();
      const rightSpace = window.innerWidth - targetRect.right;
      const prefersLeft = rightSpace < tooltipRect.width + 16;
      const left = prefersLeft
        ? Math.max(8, targetRect.left - tooltipRect.width - 10)
        : Math.min(window.innerWidth - tooltipRect.width - 8, targetRect.right + 10);
      const top = Math.max(8, Math.min(targetRect.top, window.innerHeight - tooltipRect.height - 8));

      helpTooltip.style.left = `${left}px`;
      helpTooltip.style.top = `${top}px`;
    }

    function attachHelpBehavior(button, action) {
      if (!button || !action) {
        return;
      }
      const existingBadge = button.querySelector(".context-help-badge");
      if (!existingBadge) {
        const badge = document.createElement("span");
        badge.className = "context-help-badge";
        badge.textContent = "?";
        badge.setAttribute("aria-hidden", "true");
        button.appendChild(badge);
      }

      button.addEventListener("mouseenter", () => showHelpTooltip(button, action));
      button.addEventListener("focus", () => showHelpTooltip(button, action));
      button.addEventListener("mouseleave", hideHelpTooltip);
      button.addEventListener("blur", hideHelpTooltip);
    }

    function updateRecent(action) {
      recent = [action, ...recent.filter((item) => item !== action)].slice(0, MAX_RECENT);
      saveRecent(recent);
      renderRecent();
    }

    function insertByAction(action) {
      const snippet = resolveSnippet(action);
      if (!snippet) {
        return;
      }
      onInsert(snippet);
      updateRecent(action);
      onToast(`${getLabelByAction(action)} 블록이 삽입되었습니다.`);
    }

    function renderRecent() {
      if (!recentContainer) {
        return;
      }
      recentContainer.innerHTML = "";
      if (recent.length === 0) {
        recentContainer.hidden = true;
        if (recentTitle) {
          recentTitle.hidden = true;
        }
        return;
      }

      recentContainer.hidden = false;
      if (recentTitle) {
        recentTitle.hidden = false;
      }
      for (const action of recent) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "context-recent-btn";
        button.textContent = getLabelByAction(action);
        button.dataset.action = action;
        button.addEventListener("click", () => {
          insertByAction(action);
          close();
        });
        attachHelpBehavior(button, action);
        recentContainer.appendChild(button);
      }
    }

    function clearActive() {
      for (const btn of visibleButtons) {
        btn.classList.remove("active");
      }
      activeIndex = -1;
    }

    function refreshVisibleButtons() {
      visibleButtons = buttons.filter((btn) => !btn.hidden);
      if (activeIndex >= visibleButtons.length) {
        clearActive();
      }
    }

    function setActive(index) {
      if (visibleButtons.length === 0) {
        clearActive();
        return;
      }

      clearActive();
      const nextIndex = (index + visibleButtons.length) % visibleButtons.length;
      const target = visibleButtons[nextIndex];
      target.classList.add("active");
      target.focus();
      target.scrollIntoView({ block: "nearest" });
      activeIndex = nextIndex;
    }

    function filter(query) {
      const keyword = (query || "").trim().toLowerCase();
      for (const button of buttons) {
        const label = (button.textContent || "").toLowerCase();
        const extra = (button.dataset.keywords || "").toLowerCase();
        const matched = keyword.length === 0 || label.includes(keyword) || extra.includes(keyword);
        button.hidden = !matched;
      }
      refreshVisibleButtons();
    }

    function open(x, y) {
      menu.hidden = false;
      filter("");

      const rect = menu.getBoundingClientRect();
      const menuWidth = rect.width || 260;
      const menuHeight = rect.height || 460;
      const maxX = Math.max(8, window.innerWidth - menuWidth - 8);
      const maxY = Math.max(8, window.innerHeight - menuHeight - 8);

      menu.style.left = `${Math.min(x, maxX)}px`;
      menu.style.top = `${Math.min(y, maxY)}px`;
      searchInput.value = "";
      searchInput.focus();
      clearActive();
      hideHelpTooltip();
      renderRecent();
    }

    function close() {
      menu.hidden = true;
      searchInput.value = "";
      filter("");
      clearActive();
      hideHelpTooltip();
    }

    for (const button of buttons) {
      const action = button.dataset.action;
      if (action) {
        attachHelpBehavior(button, action);
      }

      button.addEventListener("click", () => {
        const selectedAction = button.dataset.action;
        if (selectedAction) {
          insertByAction(selectedAction);
          close();
        }
      });
    }

    searchInput.addEventListener("input", () => {
      filter(searchInput.value);
      if (visibleButtons.length > 0) {
        setActive(0);
      }
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive(activeIndex < 0 ? 0 : activeIndex + 1);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive(activeIndex < 0 ? visibleButtons.length - 1 : activeIndex - 1);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (activeIndex >= 0 && visibleButtons[activeIndex]) {
          visibleButtons[activeIndex].click();
          return;
        }
        if (visibleButtons[0]) {
          visibleButtons[0].click();
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    });

    textarea.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      open(event.clientX, event.clientY);
    });

    document.addEventListener("click", (event) => {
      if (!menu.contains(event.target)) {
        close();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        close();
      }
    });

    renderRecent();

    return {
      open,
      close,
      filter,
      isOpen: () => !menu.hidden,
    };
  }

  window.NullNoteContextMenu = {
    initContextMenu,
  };
})();
