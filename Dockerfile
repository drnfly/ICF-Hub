FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY backend /app/backend
WORKDIR /app/backend

# Install Python dependencies
RUN python -m venv .venv
RUN .venv/bin/pip install --upgrade pip
RUN .venv/bin/pip install -r requirements.txt

# Expose port
EXPOSE 8000

# Start backend
CMD [".venv/bin/uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
