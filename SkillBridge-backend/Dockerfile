FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -ntp dependency:go-offline
COPY src src
RUN mvn -B -ntp package
FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S skillbridge && adduser -S app -G skillbridge
WORKDIR /app
COPY --from=build /app/target/skillbridge-api-1.0.0.jar app.jar
USER app
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=10 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/api/health || exit 1
ENTRYPOINT ["java","-jar","app.jar"]
