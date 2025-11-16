# Stage 1: Build React app
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ .

# Build React app
RUN npm run build

# Stage 2: Python Flask runtime
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Flask application
COPY app.py .
COPY utils/ ./utils/

# Copy React build from frontend stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create cache directory
RUN mkdir -p cache

# Expose port
EXPOSE 5001

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Run Flask app
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=5001"]

