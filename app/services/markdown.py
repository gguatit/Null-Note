import bleach
import markdown

ALLOWED_TAGS = list(bleach.sanitizer.ALLOWED_TAGS) + [
    "p",
    "pre",
    "code",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "img",
    "input",
    "hr",
    "br",
]

ALLOWED_ATTRIBUTES = {
    "*": ["class"],
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "title"],
    "input": ["type", "checked", "disabled"],
}


def _normalize_mermaid_markdown(content: str) -> str:
    if "```" in content:
        return content

    lines = content.splitlines()
    first_non_empty = next((line.strip() for line in lines if line.strip()), "")
    mermaid_starts = (
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
    )

    if any(first_non_empty.startswith(prefix) for prefix in mermaid_starts):
        return f"```mermaid\n{content.strip()}\n```"

    return content


def render_markdown(content: str) -> str:
    normalized = _normalize_mermaid_markdown(content)
    html = markdown.markdown(
        normalized,
        extensions=["fenced_code", "tables", "sane_lists", "nl2br", "toc", "codehilite"],
        output_format="html",
    )
    return bleach.clean(html, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True)
