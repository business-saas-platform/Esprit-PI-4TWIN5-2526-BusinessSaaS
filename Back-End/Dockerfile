# ===== BUILD STAGE =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build


# ===== PRODUCTION STAGE =====
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# uniquement dépendances prod
# RUN npm install --omit=dev
RUN npm ci --only=production
# copier build
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]