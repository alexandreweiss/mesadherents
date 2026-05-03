FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 cron && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /data

COPY crontab /etc/cron.d/mesadherents
COPY backup.sh entrypoint.sh ./
RUN chmod +x backup.sh entrypoint.sh

ENV DATABASE=/data/members.db

EXPOSE 5000

CMD ["./entrypoint.sh"]
