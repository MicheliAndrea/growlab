FROM golang:1.25-alpine AS builder

WORKDIR /app

ENV CGO_ENABLED=0

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -o /out/growlab-worker ./workers/growlab-worker/cmd/worker

FROM alpine:3.22

WORKDIR /app

COPY --from=builder /out/growlab-worker /usr/local/bin/growlab-worker

EXPOSE 9091

ENTRYPOINT ["growlab-worker"]
