FROM python:3.12-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./

# Install deps — swap opencv for headless (manylinux wheels bundle all libs, no apt-get needed)
RUN uv sync --frozen --no-dev && \
    uv pip uninstall opencv-python 2>/dev/null || true && \
    uv pip install opencv-python-headless

COPY . .

ENV FASTEMBED_CACHE_PATH=/app/.fastembed_cache

EXPOSE 8765

CMD ["uv", "run", "python", "main.py", "serve", "--host", "0.0.0.0", "--port", "8765"]
