FROM node:lts

COPY . /app

WORKDIR /app

RUN npm install

CMD ["npm", "start"]