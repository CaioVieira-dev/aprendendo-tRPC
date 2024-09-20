import { initTRPC, TRPCError } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { z } from "zod";
import { createContext, type Context } from "./context";

export type AppRouter = typeof appRouter;

export const t = initTRPC.context<Context>().create();

const publicProcedure = t.procedure;
const router = t.router;
const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      auth: ctx.auth,
    },
  });
});
const protectedProcedure = t.procedure.use(isAuthed);

const appRouter = router({
  greet: publicProcedure
    .input(z.string())
    .query(({ input }) => ({ greeting: `hello, ${input}!` })),
  secret: protectedProcedure.query(({ ctx }) => {
    return {
      secret: "sauce",
    };
  }),
  secretMutation: protectedProcedure.mutation(() => "access granted"),
});

createHTTPServer({
  router: appRouter,
  createContext,
}).listen(2022);
