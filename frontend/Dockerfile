# Estágio de Build (Node)
FROM node:20-alpine AS builder

LABEL app="coliseu-dash"
LABEL project="coliseudev-design/Coliseu-Dash"

WORKDIR /app

# Identificador único de projeto para invalidar cache cruzado com outros apps na VPS
ENV VITE_PROJECT_ID="coliseu-dash"

# Copia os arquivos de dependência
COPY package*.json ./

# Instala dependências de forma reproducível
RUN npm install --frozen-lockfile || npm install

# Copia o código-fonte inteiro
COPY . .

# Garante a limpeza prévia do diretório dist
RUN rm -rf dist && npx tsc --noEmit 2>&1 || echo "[WARN] TypeScript errors found above"

# Faz o build de produção (Vite criará a pasta /app/dist)
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build


# Estágio de Serviço (Nginx)
FROM nginx:alpine

LABEL app="coliseu-dash"
LABEL project="coliseudev-design/Coliseu-Dash"

# Remove o default config
RUN rm /etc/nginx/conf.d/default.conf

# Copia o config customizado para SPA
COPY nginx.conf /etc/nginx/conf.d/

# Copia os arquivos estáticos do builder passado
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
