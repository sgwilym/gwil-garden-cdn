import { ensureDir } from "https://deno.land/std@0.131.0/fs/mod.ts";
import * as Earthstar from "https://deno.land/x/earthstar@8.2.4/mod.ts";
import * as Rpc from "https://deno.land/x/earthstar_streaming_rpc@v4.0.1/mod.ts";
import { decode } from "https://deno.land/std@0.126.0/encoding/base64.ts";
import { serve } from "https://deno.land/std@0.126.0/http/server.ts";

const GARDEN_SHARE = Deno.env.get("GARDEN_SHARE") || "+none.a123";

await ensureDir("data");

const driver = new Earthstar.ReplicaDriverSqlite({
  filename: `./data/${GARDEN_SHARE}.sql`,
  mode: "create-or-open",
  share: GARDEN_SHARE,
});

const replica = new Earthstar.Replica(
  GARDEN_SHARE,
  Earthstar.FormatValidatorEs4,
  driver,
);

const peer = new Earthstar.Peer();

peer.addReplica(replica);

const serverSyncer = new Earthstar.Syncer(
  peer,
  (methods) =>
    new Rpc.TransportWebsocketServer({
      deviceId: peer.peerId,
      methods,
      url: "/earthstar-api/v2",
    }),
);

async function handler(req: Request): Promise<Response> {
  console.group(`${req.method}: ${req.url}`);

  const url = new URL(req.url);

  if (url.pathname.startsWith("/earthstar-api/v2")) {
    console.log("Began syncing...");
    console.groupEnd();
    return serverSyncer.transport.reqHandler(req);
  }

  console.log(`Attempting to serve ${url.pathname}...`);
  const res = await replica.getLatestDocAtPath(url.pathname);

  if (!res) {
    console.log("... not found!");
    console.groupEnd();
    return new Response("Not found", {
      headers: {
        status: "404",
      },
    });
  }

  // Determine what to do with extension

  console.log("... done.");
  console.groupEnd();

  return new Response(contentToUInt8Array(res.path, res.content), {
    headers: {
      status: "200",
      "content-type": getContentType(res.path),
      "access-control-allow-origin": "https://gwil.garden, localhost",
    },
  });
}

const textEncoder = new TextEncoder();

const base64Extensions = ["jpg", "jpeg", "png", "gif", "svg"];

function contentToUInt8Array(path: string, content: string) {
  const extension = path.split(".").pop();

  if (extension && base64Extensions.includes(extension)) {
    return decode(content);
  }

  return textEncoder.encode(content);
}

function getContentType(path: string): string {
  const extension = path.split(".").pop();

  switch (extension) {
    case "js":
      return "application/javascript; charset=UTF-8";
    case "json":
      return "application/json; charset=UTF-8";
    case "html":
      return "text/html; charset=UTF-8";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "txt":
      return "text/plain; charset=UTF-8";
    case "svg":
      return "image/svg+xml";

    default:
      return "text/html; charset=utf-8";
  }
}

const FLY_APP_NAME = Deno.env.get("FLY_APP_NAME");

export async function getInstanceURLs(): Promise<Set<string>> {
  if (!FLY_APP_NAME) {
    // This is being run locally, not on Fly. Abort here.
    return new Set();
  }

  const nets = Deno.networkInterfaces();

  const internalIpv6s = nets.filter((netInterface) => {
    return netInterface.family === "IPv6";
  }).map((netInterface) => {
    return netInterface.address;
  });

  try {
    const ipv6s = await Deno.resolveDns(`${FLY_APP_NAME}.internal`, "AAAA");

    const transformed = ipv6s
      .filter((ip) => !internalIpv6s.includes(ip))
      .map((ip) => `http://[${ip}]:8080/earthstar-api/v2`);

    return new Set(transformed);
  } catch {
    return new Set();
  }
}

const otherInstanceURLs = await getInstanceURLs();

if (otherInstanceURLs.size > 0) {
  const syncer = new Earthstar.Syncer(peer, (methods) => {
    return new Rpc.TransportHttpClient({
      deviceId: `instance-${Deno.env.get("FLY_ALLOC_ID")}`,
      methods,
    });
  });

  otherInstanceURLs.forEach((url) => {
    console.log(`Started syncing with another instance: ${url}`);

    syncer.transport.addConnection(url);
  });
}

serve(handler, {
  port: 8080,
});
console.log("Serving on port 8080");
