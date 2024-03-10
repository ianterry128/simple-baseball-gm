import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const playerRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ 
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
      focusStat: z.number()
    }))
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.db.player.create({
        data: { 
          id: input.id,
          name: input.name,
          age: input.age,
          strength: input.strength,
          strengthPot: input.strengthPot,
          speed: input.speed,
          speedPot: input.speedPot,
          precision: input.precision,
          precisionPot: input.precisionPot,
          contact: input.contact,
          contactPot: input.contactPot,
          class: input.class,
          potential: input.potential,
          experience: input.experience,
          level: input.level,
          classExp: input.classExp,
          classLvl: input.classLvl,
          teamId: input.teamId,
          focusStat: input.focusStat
         },
      });

      return player;
    }),
});
