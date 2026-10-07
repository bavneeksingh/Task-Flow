FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
# generate prisma client
RUN npx prisma generate

COPY . .

# We need a startup script to run migrations before starting the app
# Or we can just run it in CMD
EXPOSE 8000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
