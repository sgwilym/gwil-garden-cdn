import * as Earthstar from "https://deno.land/x/earthstar@8.2.4/mod.ts";
import { encode } from "https://deno.land/std@0.126.0/encoding/base64.ts";

const keypair = await Earthstar.Crypto.generateAuthorKeypair(
  "xmpl",
) as Earthstar.AuthorKeypair;

const GARDEN_SHARE = Deno.env.get("GARDEN_SHARE") || "+none.a123";

const driver = new Earthstar.ReplicaDriverMemory(GARDEN_SHARE);

const replica = new Earthstar.Replica(
  GARDEN_SHARE,
  Earthstar.FormatValidatorEs4,
  driver,
);

const peer = new Earthstar.Peer();

peer.addReplica(replica);

for await (const entry of Deno.readDir("./example/data")) {
  if (!entry.isFile) continue;

  if (entry.name.endsWith(".txt")) {
    const content = await Deno.readTextFile(`./example/data/${entry.name}`);

    await replica.set(keypair, {
      content,
      path: `/${entry.name}`,
      format: "es.4",
    });

    console.log(`Set ${entry.name}`);

    continue;
  }

  const contents = await Deno.readFile(`./example/data/${entry.name}`);

  const b64contents = encode(contents);

  await replica.set(keypair, {
    content: b64contents,
    path: `/${entry.name}`,
    format: "es.4",
  });

  console.log(`Set ${entry.name}`);
}

peer.sync("ws://localhost:8080/earthstar-api/v2");

console.log("Started syncing from example peer...");
