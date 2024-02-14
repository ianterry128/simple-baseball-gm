import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const leagueRouter = createTRPCRouter({
  create: protectedProcedure // write League to database
    .input(z.object({ 
      id: z.string(),
      name: z.string(), 
      /**
        teams: z.array(z.object({ 
            name: z.string(),
            gamesPlayed: z.number(),
            wins: z.number(),
            players: z.array(z.object({
              name: z.string(),
              age: z.number(),
              strength: z.number(),
              strengthPot: z.number(),
              speed: z.number(),
              speedPot: z.number(),
              precision: z.number(),
              precisionPot: z.number(),
              contact: z.number(),
              contactPot: z.number(),
              class: z.string(),
              potential: z.number(),
              experience: z.number(),
              level: z.number(),
              classExp: z.number(),
              classLvl: z.number(),
              teamId: z.string()
        })),
      
      //League: z.object({}),
      leagueId: z.string()
    })), */
      myTeamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const league = await ctx.db.league.create({
        data: { id: input.id, name: input.name, myTeamId: input.myTeamId, userId: ctx.session.user.id },
      });
      return league;
    }),
  
  getByUserId: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const leaguesByUserId = await ctx.db.league.findMany({ where: { userId: input } })
    return leaguesByUserId;
  }),
});
