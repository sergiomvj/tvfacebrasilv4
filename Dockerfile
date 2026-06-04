FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV HEYGEN_MOCK=true
CMD ["node", "src/index.js", "--daily"]