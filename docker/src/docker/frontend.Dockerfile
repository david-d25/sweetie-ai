FROM node:20.5.0 AS build

WORKDIR /app

ARG API_URL
ARG VK_APP_ID
ARG FRONTEND_BASE_PATH

COPY frontend.zip .
RUN unzip frontend.zip
RUN rm frontend.zip

ENV API_URL=$API_URL
ENV VK_APP_ID=$VK_APP_ID
ENV FRONTEND_BASE_PATH=$FRONTEND_BASE_PATH

RUN npm install
RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
