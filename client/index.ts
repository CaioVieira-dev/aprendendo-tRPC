import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../server";

const headers: Map<string, string> = new Map<string, string>();

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:2022",
      headers: () => Object.fromEntries(headers),
    }),
  ],
});

async function main() {
  const result = await client.greet.query("tRPC");

  // Type safe
  console.log(result.greeting.toUpperCase());

  // const unauthorizedError = await client.secret.query();
  // console.log(unauthorizedError);
  // const unauthorizedErrorMutation = await client.secretMutation.mutate();
  // console.log(unauthorizedErrorMutation);

  headers.set("Authorization", "ABC");
  const authorized = await client.secret.query();
  console.log(authorized);
  const authorizedMutation = await client.secretMutation.mutate();
  console.log(authorizedMutation);
}

void main();
