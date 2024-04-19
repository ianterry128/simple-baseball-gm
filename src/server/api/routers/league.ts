import { Prisma } from "@prisma/client";
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
      teamsJson: z.object({
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
          focusStat: z.number(),
          stats_season: z.object({
            at_bats: z.number(),
            runs: z.number(),
            walks: z.number(),
            hits: z.number(),
            doubles: z.number(),
            triples: z.number(),
            home_runs: z.number(),
            rbi: z.number(),
            strike_outs: z.number(),
            errors: z.number(),
            assists: z.number(),
            putouts: z.number(),
            k: z.number(),
            walks_allowed: z.number(),
            ip: z.number(),
            runs_allowed: z.number(),
          }),
          stats_career: z.object({
            at_bats: z.number(),
            runs: z.number(),
            walks: z.number(),
            hits: z.number(),
            doubles: z.number(),
            triples: z.number(),
            home_runs: z.number(),
            rbi: z.number(),
            strike_outs: z.number(),
            errors: z.number(),
            assists: z.number(),
            putouts: z.number(),
            k: z.number(),
            walks_allowed: z.number(),
            ip: z.number(),
            runs_allowed: z.number(),
          }),
        }).array(),
        leagueId: z.string(),
      }).array(),
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
      myTeamId: z.string(),
      myTeamName: z.string(),
      season: z.number(),
      week: z.number(),
      scheduleJson: z.record(z.string(), z.object({ // use string type instead of number for key: https://github.com/colinhacks/zod?tab=readme-ov-file#record-key-type
        homeTeam: z.string(),
        awayTeam: z.string(),
        win_or_loss: z.string()
      }).array()), }))
    .mutation(async ({ ctx, input }) => {
      const _teamsJson = input.teamsJson as Prisma.JsonArray;
      //const _scheduleJson = input.scheduleJson as Prisma.JsonArray;
      const league = await ctx.db.league.create({
        data: { id: input.id, name: input.name, teamsJson: _teamsJson, myTeamId: input.myTeamId, myTeamName: input.myTeamName, season: input.season, week: input.week, scheduleJson: input.scheduleJson, userId: ctx.session.user.id },
      });
      return league;
    }),
  
  getByUserId: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const leaguesByUserId = await ctx.db.league.findMany({ where: { userId: input } })
    return leaguesByUserId;
  }),
});
