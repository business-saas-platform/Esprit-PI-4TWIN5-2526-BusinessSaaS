# ===== BUILD STAGE =====
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build


# ===== PRODUCTION STAGE =====
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# uniquement dépendances prod
RUN npm install --omit=dev

# copier build
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]