FROM node:22-alpine AS base

WORKDIR /usr/src/app

# Install Playwright dependencies and browsers
RUN npx --yes playwright install --with-deps chromium

COPY package*.json ./

RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY public ./public
COPY sitelist.txt ./sitelist.txt

RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

# Default command just starts the web server; other entrypoints can override
CMD ["npm", "start"]
