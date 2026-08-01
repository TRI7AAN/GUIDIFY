# GUIDIFY Backend — Root Dockerfile for Render (Docker runtime)
# Builds the FastAPI backend from the guidify-backend/ monorepo subdirectory.
# Listens on $PORT (Render injects it) so health checks and routing work.

FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install dependencies
COPY guidify-backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY guidify-backend/ .

# Create temp directory for file uploads
RUN mkdir -p ./temp

# Expose port
EXPOSE 8000

# Run the application on Render's injected $PORT (defaults to 8000 locally)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
