# gwil-garden-cdn

A replica server which can also serve documents over HTTP. This one also knows
how to find other instances on Fly.io and synchronise with them to create a kind
of p2p CDN.

To try it out (requires Deno 1.20+), run:

```
deno task example
```

This will create a local peer which sets documents using some files in the
`example` dir, sync with an instance of the server, and then open URLs for those
docs in your browser.
