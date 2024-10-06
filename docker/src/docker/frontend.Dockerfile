FROM node:20.5.0

WORKDIR /app

COPY frontend.zip .
RUN unzip frontend.zip
RUN rm frontend.zip

RUN npm install
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
