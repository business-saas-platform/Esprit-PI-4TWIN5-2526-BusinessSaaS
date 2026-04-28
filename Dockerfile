########################
# Build Front-End (React)
########################
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY Front-End/package*.json ./
RUN npm ci

COPY Front-End/ ./
RUN npm run build

########################
# Build Back-End (Node)
########################
FROM node:20-alpine AS backend-build
WORKDIR /app/backend

COPY Back-End/package*.json ./
RUN npm ci

COPY Back-End/ ./
RUN npm run build

########################
# Production image
########################
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Multitenancy environment variables
ENV TENANT_ID="" \
	TENANT_REGION="" \
	TENANT_TIER=""

# This containerized setup fulfills the portability requirement for Tunisian Data Sovereignty compliance.

COPY Back-End/package*.json ./
RUN npm ci --omit=dev

COPY --from=backend-build /app/backend/dist ./dist
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 3000
CMD ["node", "dist/main.js"]
