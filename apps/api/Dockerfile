FROM golang:1.25-alpine AS builder
RUN apk add --no-cache git
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /atlas ./cmd/atlas

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
COPY --from=builder /atlas /usr/local/bin/atlas
EXPOSE 4000
CMD ["atlas"]
