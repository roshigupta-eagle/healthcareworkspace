BINARY   = bin/server
MODULE   = healthcareworkspace/fhir
MAIN     = ./cmd/server

.PHONY: build run test cover lint tidy migrate-up migrate-down clean

## build: compile the binary to bin/server
build:
	go build -o $(BINARY) $(MAIN)

## run: run the server (loads .env automatically via godotenv)
run:
	go run $(MAIN)/...

## test: run all tests with race detector
test:
	go test -race ./...

## cover: run tests with coverage report
cover:
	go test -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

## lint: run golangci-lint (must be installed separately)
lint:
	golangci-lint run ./...

## tidy: tidy and verify go modules
tidy:
	go mod tidy
	go mod verify

## migrate-up: apply all pending migrations (requires goose)
migrate-up:
	goose -dir ./migrations postgres "$(DATABASE_URL)" up

## migrate-down: roll back the last migration
migrate-down:
	goose -dir ./migrations postgres "$(DATABASE_URL)" down 1

## clean: remove build artifacts
clean:
	rm -rf bin/ coverage.out coverage.html
