# frontend/Dockerfile
# ------------------------------------------------------------
# Etapa 1: build da SPA com Vite
# ------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Em produção o Nginx serve o front e o backend na mesma origem
# (mesmo domínio/porta), então a API fica em caminho relativo:
# "" + "/api/..." = "/api/..." — sem precisar apontar pra um host fixo.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ------------------------------------------------------------
# Etapa 2: servir os arquivos estáticos com Nginx
# ------------------------------------------------------------
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
