import { open } from "https://deno.land/x/open@v0.0.5/index.ts";

new Worker(new URL("../server.ts", import.meta.url).href, {
  type: "module",
  deno: {
    namespace: true,
  },
});

// Wait for server to start up.
await new Promise((res) => {
  setTimeout(res, 500);
});

new Worker(new URL("./peer.ts", import.meta.url).href, {
  type: "module",
  deno: {
    namespace: true,
  },
});

// Wait for things to sync from peer.
await new Promise((res) => {
  setTimeout(res, 1000);
});

// Open them up.
open("http://localhost:8080/fiction.txt");
open("http://localhost:8080/avatar.jpg");
open("http://localhost:8080/curving.jpg");
