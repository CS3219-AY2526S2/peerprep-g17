.PHONY: start stop clean logs

start:
	docker compose up --build

scale:
	docker compose up -d --build
	
stop:
	docker compose down

clean:
	docker compose down -v

logs:
	docker compose logs -f
