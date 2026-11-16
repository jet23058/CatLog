FROM node:22-alpine

WORKDIR /app

# Skip husky git-hook install inside the container (no git here).
ENV HUSKY=0

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3002

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
