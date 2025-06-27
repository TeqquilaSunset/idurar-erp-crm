FROM node:20.9.0-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY vite.config.js ./

RUN npm ci

COPY . .

RUN npm install

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]