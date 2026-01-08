FROM node:18-alpine AS build

WORKDIR /app

ARG VITE_API_BASE
ARG VITE_SOCKET_URL
ENV VITE_API_BASE=${VITE_API_BASE}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}

COPY package.json package-lock.json* ./
RUN npm install

COPY . ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
