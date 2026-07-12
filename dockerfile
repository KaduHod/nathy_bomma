FROM node:20-alpine

WORKDIR /app

# copia só os manifests primeiro pra aproveitar cache de layer
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# copia o resto do projeto
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "index.js"]
