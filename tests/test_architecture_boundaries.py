from pathlib import Path

RUNTIME_ROOT = Path("apps/api/alsvid")


def _runtime_sources() -> list[tuple[Path, str]]:
    return [
        (path, path.read_text(encoding="utf-8").lower())
        for path in RUNTIME_ROOT.rglob("*.py")
    ]


def test_runtime_has_no_legacy_chaiben_imports() -> None:
    offenders = [
        str(path)
        for path, text in _runtime_sources()
        if "from chaiben" in text or "import chaiben" in text
    ]
    assert offenders == []


def test_runtime_has_no_domestic_integrations() -> None:
    forbidden = ("alibaba1688", "jackyun", "吉客云", "卖咖啡的熊")
    offenders = [
        str(path)
        for path, text in _runtime_sources()
        if any(token.lower() in text for token in forbidden)
    ]
    assert offenders == []


def test_runtime_has_no_legacy_workspace_identity_contract() -> None:
    forbidden = ("current_workspace_id", "x-chaiben-")
    offenders = [
        str(path)
        for path, text in _runtime_sources()
        if any(token in text for token in forbidden)
    ]
    assert offenders == []
