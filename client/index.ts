import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../server";

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:2022",
    }),
  ],
});

async function main() {
  const result = await client.greet.query("tRPC");

  // Type safe
  console.log(result.greeting.toUpperCase());

  const unauthorizedError = await client.secret.query();
  console.log(unauthorizedError);
  const unauthorizedErrorMutation = await client.secretMutation.mutate();
  console.log(unauthorizedErrorMutation);
}

void main();
