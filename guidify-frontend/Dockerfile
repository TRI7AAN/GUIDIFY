# Build stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG SUPABASE_PUBLIC_KEY

COPY . .
# Supabase publishable keys are intentionally embedded in browser bundles and
# protected by RLS; the service-role key is never accepted by this build.
RUN VITE_API_URL=${VITE_API_URL} \
    VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_PUBLISHABLE_KEY=${SUPABASE_PUBLIC_KEY} \
    npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
