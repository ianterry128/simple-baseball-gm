import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const teamRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ 
      id: z.string(),
      name: z.string(), 
      gamesPlayed: z.number(),
      wins: z.number(),
      /**
        League: z.object({
          name: z.string(),
          myTeamId: z.string()
        }),
      */
      leagueId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const team = await ctx.db.team.create({
        data: { id: input.id, name: input.name, gamesPlayed: input.gamesPlayed, wins: input.wins, leagueId: input.leagueId },
      });
      return team;
    }),

  getTeamNameById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const teamByTeamId = await ctx.db.team.findUnique({ where: { id: input } })
    return teamByTeamId;
  }),
});
