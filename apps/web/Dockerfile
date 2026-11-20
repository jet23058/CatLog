# Build context 是 repo 根目錄（npm workspaces 需要根目錄的 package.json 與 lockfile）。
FROM node:22-alpine

WORKDIR /repo

# Skip husky git-hook install inside the container (no git here).
ENV HUSKY=0

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
RUN npm ci

COPY . .

EXPOSE 3002

CMD ["npm", "run", "dev", "-w", "@catlog/web", "--", "--host", "0.0.0.0"]
