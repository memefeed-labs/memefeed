FROM node:18-alpine

# TODO: remove git; write a new typescript client for celestia
RUN apk add --no-cache git

RUN mkdir -p /usr/app
WORKDIR /usr/app

COPY package.json tsconfig.json ./
RUN npm install && npm cache clean --force

COPY src ./src
COPY .env ./

EXPOSE 4000
CMD npm run build-ts && npm start