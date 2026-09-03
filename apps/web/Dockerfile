FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN npm install -g pnpm@11.22.0

# --- build stage ---
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

# Pass API key at build time (optional)
ARG VITE_API_KEY=
ENV VITE_API_KEY=$VITE_API_KEY

WORKDIR /app/apps/web
RUN pnpm build

# --- runtime stage ---
FROM nginx:alpine AS runtime
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
