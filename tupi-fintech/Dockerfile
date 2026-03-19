FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . ./
RUN --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 go build -o /out/app ./cmd/api

FROM alpine:3.19
RUN adduser -D app && apk add --no-cache ca-certificates
USER app
WORKDIR /home/app
COPY --from=build /out/app ./app
ENV PORT=8080
EXPOSE 8080
CMD ["./app"]