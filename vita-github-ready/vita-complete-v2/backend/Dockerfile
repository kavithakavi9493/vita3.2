FROM python:3.11-slim

# System deps
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Create non-root user for security
RUN adduser --disabled-password --gecos "" viapp && chown -R viapp /app
USER viapp

EXPOSE 8080

# Production: gunicorn with uvicorn workers
# Dev: docker-compose overrides this with --reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
