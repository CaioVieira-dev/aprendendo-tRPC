import { initTRPC, TRPCError } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { z } from "zod";
import { createContext, type Context } from "./context";
import { observable } from "@trpc/server/observable";
import ws from "ws";
import { applyWSSHandler } from "@trpc/server/adapters/ws";

export type AppRouter = typeof appRouter;

export const t = initTRPC.context<Context>().create();

const publicProcedure = t.procedure;
const router = t.router;
const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.auth()) {
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
  time: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .subscription(({ ctx, input }) => {
      return observable<{ date: Date; ctx_auth: boolean; input_auth: boolean }>(
        (emit) => {
          // logic that will execute on subscription start
          const interval = setInterval(
            () =>
              emit.next({
                date: new Date(),
                ctx_auth: ctx.auth(),
                input_auth: input.token === "ABC",
              }),
            1000
          );
          // function to clean up and close interval after end of connection
          return () => {
            clearInterval(interval);
          };
        }
      );
    }),
});

createHTTPServer({
  router: appRouter,
  createContext,
}).listen(2022);

const wss = new ws.Server({
  port: 3001,
});
const handler = applyWSSHandler({ wss, router: appRouter, createContext });
wss.on("connection", (ws) => {
  console.log(`➕➕ Connection (${wss.clients.size})`);
  ws.once("close", () => {
    console.log(`➖➖ Connection (${wss.clients.size})`);
  });
});
console.log("✅ WebSocket Server listening on ws://localhost:3001");
process.on("SIGTERM", () => {
  console.log("SIGTERM");
  handler.broadcastReconnectNotification();
  wss.close();
});
