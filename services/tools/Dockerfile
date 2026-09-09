FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-venv ca-certificates && python3 -m venv /opt/yt-dlp && /opt/yt-dlp/bin/pip install --no-cache-dir yt-dlp && rm -rf /var/lib/apt/lists/*
ENV PATH="/opt/yt-dlp/bin:${PATH}" NODE_ENV=production PORT=8787
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --ignore-scripts --no-audit --no-fund
COPY services/tools ./services/tools
RUN npm run build:api
USER node
EXPOSE 8787
CMD ["node", "services/tools/server.mjs"]
