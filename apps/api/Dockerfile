FROM golang:1.25-alpine AS builder

WORKDIR /app

ENV CGO_ENABLED=0

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o /out/growlab-api ./apps/api/cmd/api

FROM alpine:3.22

WORKDIR /app

COPY --from=builder /out/growlab-api /usr/local/bin/growlab-api

EXPOSE 8080

ENTRYPOINT ["growlab-api"]
