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


def render_markdown(content: str) -> str:
    html = markdown.markdown(
        content,
        extensions=["fenced_code", "tables", "sane_lists", "nl2br", "toc", "codehilite"],
        output_format="html5",
    )
    return bleach.clean(html, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True)
