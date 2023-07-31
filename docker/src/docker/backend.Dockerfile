FROM eclipse-temurin:20.0.2_9-jre-alpine

WORKDIR /app
COPY backend.jar .

ENTRYPOINT java -jar backend.jar