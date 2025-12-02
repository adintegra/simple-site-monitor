FROM node:22-slim AS base

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

# Install Playwright dependencies and browsers
# Using --with-deps installs system dependencies needed for Chromium
RUN npx --yes playwright install --with-deps chromium

COPY tsconfig.json ./
COPY src ./src
COPY public ./public
COPY sitelist.txt ./sitelist.txt

RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

# Default command just starts the web server; other entrypoints can override
CMD ["npm", "start"]
