BINARY   = bin/server
MODULE   = healthcareworkspace/lims
MAIN     = ./cmd/server

.PHONY: build run test cover lint tidy migrate-up migrate-down clean

build:
	go build -o $(BINARY) $(MAIN)

run:
	go run $(MAIN)/...

test:
	go test -race ./...

cover:
	go test -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

lint:
	golangci-lint run ./...

tidy:
	go mod tidy
	go mod verify

migrate-up:
	goose -dir ./migrations postgres "$(DATABASE_URL)" up

migrate-down:
	goose -dir ./migrations postgres "$(DATABASE_URL)" down 1

clean:
	rm -rf bin/ coverage.out coverage.html
