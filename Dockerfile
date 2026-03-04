FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json .
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY vitest.config.ts .

RUN npm run build

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node dist/src/server.js"]
