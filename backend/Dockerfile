# Multi-stage or optimized single-stage build for Django + Ultralytics (YOLO) + PostgreSQL
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
# - gcc, libpq-dev: needed for compiling Python packages and PostgreSQL interface
# - libgl1, libglib2.0-0, libgomp1: required by OpenCV and Ultralytics (YOLO)
# - netcat-openbsd, curl: required for entrypoint healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    netcat-openbsd \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# IMPORTANT: Install CPU-only PyTorch first. The default PyTorch wheel includes ~3.5GB of CUDA
# GPU runtime libraries which exhausts disk space on AWS EC2 (Errno 28: No space left on device).
# The CPU wheel is only ~180MB.
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app/

# Ensure necessary directories exist
RUN mkdir -p /app/staticfiles /app/media /app/ai_models

# Make entrypoint script executable
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
