FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

RUN npm prune --omit=dev

EXPOSE 3050

CMD ["npm", "start"]
