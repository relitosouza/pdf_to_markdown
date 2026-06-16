# Stage 1: Build the React frontend
FROM node:20-slim AS frontend-builder
WORKDIR /build

# Copy frontend package file preserving directory structure for relative path resolution
COPY packages/markitdown-web/frontend/package.json ./packages/markitdown-web/frontend/
RUN npm --prefix packages/markitdown-web/frontend install

# Copy frontend source code and build it
COPY packages/markitdown-web/frontend ./packages/markitdown-web/frontend
RUN npm --prefix packages/markitdown-web/frontend run build

# Stage 2: Build the Python backend
FROM python:3.12-slim
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies (exiftool and ffmpeg are required by MarkItDown)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    exiftool \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy python packages
COPY packages/markitdown /app/packages/markitdown
COPY packages/markitdown-web /app/packages/markitdown-web

# Copy built frontend assets to the backend's static directory
COPY --from=frontend-builder /build/packages/markitdown-web/src/markitdown_web/static /app/packages/markitdown-web/src/markitdown_web/static

# Install python dependencies in editable mode (so local packages link correctly)
RUN pip install --no-cache-dir \
    -e /app/packages/markitdown[all] \
    -e /app/packages/markitdown-web

# Expose port (default 8000)
EXPOSE 8000

# Run FastAPI app using uvicorn (using shell form to expand PORT variable)
CMD ["sh", "-c", "uvicorn markitdown_web.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
