"""Shared query helpers for repositories."""


def escape_like(term: str) -> str:
    """Escape LIKE wildcards in user-provided search terms."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def contains(term: str) -> str:
    """Build an escaped, case-insensitive LIKE pattern."""
    return f"%{escape_like(term)}%"
