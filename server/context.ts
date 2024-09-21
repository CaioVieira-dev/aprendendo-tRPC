import { inferAsyncReturnType } from "@trpc/server";
import { CreateNextContextOptions } from "@trpc/server/adapters/next";

const authState = new Map<string, boolean>();

export async function createContext({ req }: CreateNextContextOptions) {
  console.log(req.headers);
  const auth = req.headers.authorization === "ABC";
  const id = req.headers["sec-websocket-id"];

  authState.set(id, auth);

  return {
    auth: () => authState.get(id) ?? false,
    id,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
