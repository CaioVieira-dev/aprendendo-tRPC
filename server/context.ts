import { inferAsyncReturnType } from "@trpc/server";
import { CreateNextContextOptions } from "@trpc/server/adapters/next";

export async function createContext({ req }: CreateNextContextOptions) {
  return {
    auth: req.headers.authorization === "ABC",
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
