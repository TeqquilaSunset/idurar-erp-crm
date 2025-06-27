FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN wget -O /wait-for https://github.com/eficode/wait-for/releases/download/v2.2.3/wait-for && \
    chmod +x /wait-for

RUN npm install -g nodemon

EXPOSE 10000

CMD ["sh", "-c", "/wait-for mongodb:27017 -- npm run setup && npm run dev"]