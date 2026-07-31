# backend/Dockerfile
FROM node:20-alpine

# Por padrão, containers rodam em UTC — sem isso, o backend calcula
# "horário atual" errado (ex: acha que são 23h quando em Brasília são 20h),
# o que quebra as checagens de horário de atendimento/retirada de senhas.
RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo

WORKDIR /app

# Copia só os manifestos primeiro pra aproveitar o cache de camadas do Docker:
# o `npm ci` só roda de novo se package*.json mudar, não a cada alteração de código.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
