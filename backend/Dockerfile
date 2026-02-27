# Optionnel : déploiement backend en conteneur (Render Docker, Railway, etc.)
# Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build

# Run
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
# Migrations à lancer manuellement ou via script avant start (ex: prisma migrate deploy)
CMD ["node", "dist/src/main.js"]
