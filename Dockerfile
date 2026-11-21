# Use lightweight Python 3.11
FROM python:3.11-slim

# Install OpenMP runtime required by XGBoost on Linux
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files, models, and static assets
COPY main.py .
COPY credit_risk_model.pkl .
COPY best_threshold.pkl .
COPY static/ ./static/

# Expose default application port
EXPOSE 8000

# Run FastAPI with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
