const WebSocket = require("ws");
import {
  createTRPCProxyClient,
  createWSClient,
  httpBatchLink,
  splitLink,
  wsLink,
} from "@trpc/client";
import type { AppRouter } from "../server";
import crypto from "crypto";
const id = crypto.randomBytes(16).toString("hex");

const headers: Map<string, string> = new Map<string, string>();
headers.set("sec-websocket-id", id);

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
  // client.time.subscribe(undefined, {
  //   onData: (time) => {
  //     console.log(time);
  //   },
  // });
  const result = await client.greet.query("tRPC");

  // Type safe
  console.log(result.greeting.toUpperCase());

  // const unauthorizedError = await client.secret.query();
  // console.log(unauthorizedError);
  // const unauthorizedErrorMutation = await client.secretMutation.mutate();
  // console.log(unauthorizedErrorMutation);

  // const authorized = await client.secret.query();
  // console.log(authorized);
  // const authorizedMutation = await client.secretMutation.mutate();
  // console.log(authorizedMutation);

  setTimeout(async () => {
    headers.set("Authorization", "ABC");

    const secret = await client.secretMutation.mutate();
    console.log(secret);
  }, 2000);

  // client.time.subscribe(undefined, {
  //   onData: ({ auth, date }) => {
  //     console.log(`I am ${auth ? "auth" : "not auth"} at ${date}`);
  //   },
  // });
  client.time.subscribe(
    { token: "ABC" },
    {
      onData: (ctx) => {
        console.log(
          `I am ${ctx.input_auth ? "auth" : "not auth"} at ${ctx.date}`
        );
      },
    }
  );
}

void main();
