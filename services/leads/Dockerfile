FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src
COPY db ./db
RUN npm run build
EXPOSE 3020
CMD ["node","dist/index.js"]
