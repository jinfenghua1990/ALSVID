FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

WORKDIR /app

COPY pyproject.toml README.md ./
COPY apps ./apps
COPY migrations ./migrations
COPY alembic.ini ./

RUN python -m pip install --upgrade pip \
    && python -m pip install .

EXPOSE 8080

CMD ["sh", "-c", "uvicorn alsvid.main:app --app-dir apps/api --host 0.0.0.0 --port ${PORT:-8080}"]
