# ===========================
# Frontend Dockerfile (Dev)
# ===========================
FROM node:20-alpine

WORKDIR /app

# Копируем package-файлы
COPY package.json package-lock.json* ./

# Устанавливаем зависимости
RUN npm install

# Оставляем код на volume (монтируется из ./frontend)
# COPY . .  — не нужно для dev

# Открываем порт для Vite Dev Server
EXPOSE 5174

# Запускаем сервер разработки с hot reload
CMD ["npm", "run", "dev", "--", "--port", "5174", "--host"]
