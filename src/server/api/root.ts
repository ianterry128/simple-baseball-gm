import { postRouter } from "~/server/api/routers/post";
import { createTRPCRouter } from "~/server/api/trpc";
import { leagueRouter } from "./routers/league";
import { teamRouter } from "./routers/team";
import { playerRouter } from "./routers/player";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  league: leagueRouter,
  team: teamRouter,
  player: playerRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
