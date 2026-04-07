FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY app.js utils.js ./
COPY api/ ./api/
COPY handlers/ ./handlers/

EXPOSE 3000

CMD ["node", "app.js"]
