# Deepfake Detection Service - Railway Optimized
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    gcc \
    libgl1 \
    libglib2.0-0 \
    git \
    git-lfs \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for caching)
COPY requirements.txt .

# Install PyTorch CPU-only first (smaller footprint)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install huggingface_hub for model download
RUN pip install --no-cache-dir huggingface_hub

# Download model from HuggingFace during build
RUN python -c "from huggingface_hub import snapshot_download; snapshot_download('prithivMLmods/deepfake-detector-model-v1', local_dir='models/deepfake-detector-model-v1')"

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Environment variables
ENV MODEL_PATH=/app/models/deepfake-detector-model-v1
ENV PYTHONUNBUFFERED=1
ENV LIGHTWEIGHT_MODE=false
ENV ENV=production

# Health check - extended start-period for model loading
HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Run with limited workers for memory efficiency
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
