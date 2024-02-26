import { Prisma } from "@prisma/client";
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
      playersJson: z.object({
        id: z.string(),
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
        teamId: z.string(),
      }).array(),
      /**
        League: z.object({
          name: z.string(),
          myTeamId: z.string()
        }),
      */
      leagueId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const _playersJson = input.playersJson as Prisma.JsonArray;
      const team = await ctx.db.team.create({
        data: { id: input.id, name: input.name, gamesPlayed: input.gamesPlayed, wins: input.wins, playersJson: _playersJson, leagueId: input.leagueId },
      });
      return team;
    }),

  getTeamNameById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const teamByTeamId = await ctx.db.team.findUnique({ where: { id: input } })
    return teamByTeamId;
  }),
});
