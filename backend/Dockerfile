FROM python:3.11-slim

WORKDIR /app

# System deps: curl for healthcheck, lxml for BeautifulSoup speed
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl libxml2-dev libxslt-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Production: no --reload, workers=1 keeps Redis pubsub tasks stable
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
