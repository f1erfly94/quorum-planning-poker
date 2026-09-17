# Quorum — planning poker on Durable Objects

Real-time estimation for teams: everyone picks a card, nobody sees anyone else's until the host reveals. Built as a portfolio project.

**Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Cloudflare Workers · Durable Objects**

> The interesting part is not the cards, it is the synchronisation: presence, authority, hidden state and reconnection, with no library doing it for me.

## The decisions worth defending

**Hidden votes are hidden by the server.** The obvious implementation broadcasts every vote and hides them in the interface — one devtools panel and the round is over. Here the Durable Object strips the `vote` field from everyone else's participant until the reveal, so a client that peeks finds `vote: null` and nothing else. The end-to-end test asserts on the page's HTML, not on what is visible.

**Presence is derived, never maintained.** The list of people in a room comes from `ctx.getWebSockets()`, the sockets the runtime is actually holding. There is no join/leave bookkeeping to get out of step, so a closed laptop cannot leave a ghost in the room.

**Room state survives hibernation.** Per-person data rides on the socket through `serializeAttachment`, round state lives in the object's storage, and the object accepts sockets with `ctx.acceptWebSocket()` — so the runtime can evict it between messages and bring it back without dropping anyone.

**The host is whoever got there first, and the role moves.** When the host disconnects, the object hands the role to someone still in the room rather than leaving a room nobody can reveal.

**Reconnection re-joins.** The client reconnects with exponential backoff (0.5s, 1s, 2s, 4s, then every 8s) and re-sends its join, which is why a blip puts you back in the same seat instead of stranding you in a dead tab.

**Room codes you can read out on a call.** The alphabet has no vowels, so a generated code cannot accidentally spell a word, and none of the characters people confuse when dictating them: no 0/O, no 1/l/I.

## How it fits together

```
browser  ──WebSocket──►  Worker (routes /room/:id)  ──►  Durable Object (one per room)
   ▲                                                              │
   └──────────────── full room snapshot, per viewer ◄─────────────┘
```

Every change broadcasts a complete snapshot rather than a patch. For a room of a dozen people that is a few hundred bytes, and it removes a whole category of bug: the client never has to reconcile a local guess against the server's truth, because it has no local guess.

The wire protocol lives in [`protocol/`](protocol/) and is imported by both sides, so a message the server can send is a message the client is forced to handle.

## Running it

```bash
npm install
npm run worker:dev   # Durable Objects locally, no Cloudflare account needed
npm run dev          # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm test` | Vitest — the pure parts: summaries, room ids, names |
| `npm run test:e2e` | Playwright — **two browsers in one test**, which is the only honest way to test a shared room |
| `node scripts/check-sync.mjs` | Drives the protocol over two raw sockets against a running worker |
| `npm run worker:deploy` | Publishes the room worker to Cloudflare |

## Deploying

The page goes to Vercel like any Next app. The room worker goes to Cloudflare:

```bash
npx wrangler login
npm run worker:deploy
```

Then point the page at it with `NEXT_PUBLIC_WORKER_URL=wss://quorum-rooms.<your-subdomain>.workers.dev`, and set `ALLOWED_ORIGINS` on the worker to the site's origin.

Durable Objects were chosen over a managed realtime service for two reasons: free-tier services that sleep after a week of inactivity make a poor portfolio demo, and the synchronisation logic is the point of the project — handing it to a library would have removed the part worth showing.
