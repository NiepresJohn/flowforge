FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN npm install -g pnpm@11.22.0

WORKDIR /app

# Install the whole workspace (lockfile-pinned) so every workspace:* dep
# resolves correctly, then copy the source tree.
COPY . .
RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/worker
CMD ["pnpm", "start"]
