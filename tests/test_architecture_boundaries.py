from pathlib import Path

RUNTIME_ROOT = Path("apps/api/alsvid")


def test_runtime_has_no_legacy_chaiben_imports() -> None:
    offenders: list[str] = []
    for path in RUNTIME_ROOT.rglob("*.py"):
        text = path.read_text(encoding="utf-8").lower()
        if "from chaiben" in text or "import chaiben" in text:
            offenders.append(str(path))
    assert offenders == []


def test_runtime_has_no_domestic_integrations() -> None:
    forbidden = ("alibaba1688", "jackyun", "吉客云", "卖咖啡的熊")
    offenders: list[str] = []
    for path in RUNTIME_ROOT.rglob("*.py"):
        text = path.read_text(encoding="utf-8").lower()
        if any(token.lower() in text for token in forbidden):
            offenders.append(str(path))
    assert offenders == []
