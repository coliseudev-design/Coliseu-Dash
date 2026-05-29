# Estágio de Build (Node)
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala dependências de forma reproducível
RUN npm install --frozen-lockfile || npm install

# Copia o código-fonte inteiro
COPY . .

# Verifica tipos TypeScript antes do build (erros aparecem nos logs)
RUN npx tsc --noEmit 2>&1 || echo "[WARN] TypeScript errors found above - build may fail"

# Faz o build de produção (Vite criará a pasta /app/dist)
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build


# Estágio de Serviço (Nginx)
FROM nginx:alpine

# Remove o default config
RUN rm /etc/nginx/conf.d/default.conf

# Copia o config customizado para SPA
COPY nginx.conf /etc/nginx/conf.d/

# Copia os arquivos estáticos do builder passado
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
