FROM node:18-alpine

RUN mkdir -p /usr/app
WORKDIR /usr/app

COPY package.json tsconfig.json ./
RUN npm install && npm cache clean --force

COPY src ./src
COPY .env ./

EXPOSE 4000
CMD npm run build-ts && npm start