FROM denoland/deno:1.19.0

EXPOSE 8080
EXPOSE 443

WORKDIR /app

RUN mkdir /app/data/ \
		&& chown deno:deno /app/data/

VOLUME [ "/app/data" ]

COPY server.ts ./server.ts

USER deno

RUN deno cache --no-check server.ts
CMD ["run", "--unstable", "--allow-all", "--no-check", "server.ts"]