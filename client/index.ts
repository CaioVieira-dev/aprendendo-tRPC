const WebSocket = require("ws");
import {
  createTRPCProxyClient,
  createWSClient,
  httpBatchLink,
  splitLink,
  wsLink,
} from "@trpc/client";
import type { AppRouter } from "../server";

const headers: Map<string, string> = new Map<string, string>();
headers.set("Authorization", "ABC");

const WebSocketProxy = new Proxy(WebSocket, {
  construct(target, args) {
    return new target(args[0], undefined, {
      headers: Object.fromEntries(headers),
    });
  },
});

// const wsClient = createWSClient({
//   url: `ws://localhost:3001`,
//   WebSocket: WebSocket,
// });
const wsClient = createWSClient({
  url: `ws://localhost:3001`,
  WebSocket: WebSocketProxy,
});

const client = createTRPCProxyClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => op.type === "subscription",
      true: wsLink({
        client: wsClient,
      }),
      false: httpBatchLink({
        url: "http://localhost:2022",
        headers: () => Object.fromEntries(headers),
      }),
    }),
  ],
});

async function main() {
  client.time.subscribe(undefined, {
    onData: (time) => {
      console.log(time);
    },
  });
  const result = await client.greet.query("tRPC");

  // Type safe
  console.log(result.greeting.toUpperCase());

  // const unauthorizedError = await client.secret.query();
  // console.log(unauthorizedError);
  // const unauthorizedErrorMutation = await client.secretMutation.mutate();
  // console.log(unauthorizedErrorMutation);

  const authorized = await client.secret.query();
  console.log(authorized);
  const authorizedMutation = await client.secretMutation.mutate();
  console.log(authorizedMutation);

  client.time.subscribe(undefined, {
    onData: ({ auth, date }) => {
      console.log(`I am ${auth ? "auth" : "not auth"} at ${date}`);
    },
  });
}

void main();
