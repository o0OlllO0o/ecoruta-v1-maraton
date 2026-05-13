FROM node:18-slim
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 19000 19001 19002
CMD ["npx", "expo", "start", "--web"]
