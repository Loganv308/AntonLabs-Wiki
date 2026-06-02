# =========================
# 1. Build frontend
# =========================
FROM node:20-alpine AS frontend-build

WORKDIR /frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend ./
RUN npm run build


# =========================
# 2. Build backend runtime
# =========================
FROM node:20-alpine

WORKDIR /app

# install backend deps
COPY backend/package.json ./backend/
RUN cd backend && npm install --production

# copy backend source
COPY backend ./backend

# copy built frontend into backend
COPY --from=frontend-build /frontend/dist ./backend/public

# uploads directory
RUN mkdir -p /uploads

EXPOSE 3001

WORKDIR /app/backend

CMD ["node", "src/index.js"]