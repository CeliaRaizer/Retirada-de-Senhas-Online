# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copia só os manifestos primeiro pra aproveitar o cache de camadas do Docker:
# o `npm ci` só roda de novo se package*.json mudar, não a cada alteração de código.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
