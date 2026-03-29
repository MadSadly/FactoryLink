# Docker Compose shortcuts (uses devops paths)
COMPOSE=docker compose --env-file devops/.env -f devops/docker-compose.yml

.PHONY: up build down logs fresh ps

up:
	$(COMPOSE) up -d

build:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

fresh:
	$(COMPOSE) down -v
	$(COMPOSE) up --build -d

ps:
	$(COMPOSE) ps
