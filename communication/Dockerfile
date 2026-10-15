# syntax=docker/dockerfile:1

FROM golang:1.26.3-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY cmd ./cmd
COPY internal ./internal
COPY migrations ./migrations

RUN CGO_ENABLED=0 GOOS=linux go build -buildvcs=false -trimpath -ldflags="-s -w" -o /out/communication ./cmd/server \
    && CGO_ENABLED=0 GOOS=linux go build -buildvcs=false -trimpath -ldflags="-s -w" -o /out/communication-migrate ./cmd/migrate

FROM gcr.io/distroless/base-debian12:nonroot
WORKDIR /app

COPY --from=build /out/communication /app/communication
COPY --from=build /out/communication-migrate /app/communication-migrate
COPY --from=build /src/migrations /app/migrations

EXPOSE 8083
ENTRYPOINT ["/app/communication"]
