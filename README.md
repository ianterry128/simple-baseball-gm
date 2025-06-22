# Simple Baseball GM

a game by Ian Terry

## Overview

Simple Baseball GM is a sports management game with a focus on fun rather than realism.

## How to Play

A single season plays out over the course of 32 weeks. Each week consists of three **phases**, the **Pregame phase**, **Game phase**, and **Postgame phase**.

### Pregame Phase

During the **pregame phase**, you can set your team's **batting order** and player **field positions** from the **Dashboard** screen.
- Change **batting order** by selecting the up or down arrows for a corresponding player in the **My Team** table.
- Change player **field positions** by first selecting a player in the **My Team** table then using the arrow buttons below the table to change the player's **field position** one hex at a time. The player's current **field position** will be reflected on the **field view** in the center of the **Dashboard** screen.

During the **pregame phase** and **game phase** you can see the stats of your opponent for that week on the right side of the **Dashboard** screen.

You can navigate to the next phase (**game phase**) by clicking the **Sim Game >>** button on the top navigation bar.

### Game Phase

During the **game phase**, you will be able to "watch" the game for that week using the **game log** and **animated scoreboard**. Click on the **Start/Pause Log** button to begin replaying the game simulation.

Note that the game actually simulates fully upon clicking the **Sim Game >>** button during the **pregame phase**. This has some implications:
- Information displayed on the **Team Info** screen during the **game phase** reflects your team information as it is AFTER the game simulation.
- You can progress to the next phase (**postgame phase**) without watching the game simulation.
- The **League Info** screen will show the league standings as they are AFTER the game simulation. However, all other teams' games for that week have not simulated yet, so their results will not be reflected in the **League Info** screen until the next **pregame phase**.

You can navigate to the next phase (**postgame phase**) by clicking the **Gain EXP >>** button on the top navigation bar.

### Postgame Phase

During the **postgame phase**, you can see how each of your players performed during that week's game. You can also see how much experience each player gained and whether or not they leveled up. If a player did level up, their new level will appear in green text with a "+1" superscript indicating that their level has increased by 1. Any stat increases for the player due to the level up will also show in green text with a "+1", "+2", or "+3" superscript indicating how much the stat has increased. This information is displayed on the **Dashboard** screen.

You can navigate to the **pregame phase** of the next week by clicking the **Save and Go to Next Week >>** button on the top navigation bar. Note that clicking this button also saves your game data to the database, and this is the ONLY WAY to save your game data. You can not save game data to the database during the **pregame** or **game** phases.

## Game Simulation

It is important to understand how the actual game simulation works so that you can make informed decisions about how to set your batting order, player field positions, and focus stats. I will assume you know the [basic rules of baseball](https://simple.wikipedia.org/wiki/Baseball).

### Pitching 

Upon pitching, the pitcher rolls their precision stat. 
- If the result is less than the (batter's level * 1/3), then the batter walks. 
- Otherwise, the batter rolls their contact stat, which is compared against the pitcher's precision roll. 
    - If the batter's contact roll is less than the pitcher's precision roll, then the batter either strikes out (20% chance) or hits with weak contact (80% chance). 
    - If the batter's contact roll is greater than or equal to the pitcher's precision roll, then the batter hits the ball. The batter's strength stat is rolled to determine the hit distance.

### Hitting and Fielding

There is a lot that happens when a batter succesfully hits the ball. Going in order:
1. The hit distance is determined by rolling the batter's strength stat. A higher strength roll corresponds to a greater hit distance. See the hit distance chart below to see how the strength roll correlates with hit distance.
2. The **final position** of the ball is chosen randomly from all available hex tiles at the hit distance.
3. The **launch angle** of the hit is chosen semi-randomly from three options: 1. **Ground**, 2. **Air**, and 3. **High**.
4. A line of hexagons (the **hit line**) is drawn from the batters box at hex position (0, 0, 0) to the **final position**. Each hexagon in the line has a corresponding **ball height**, which is determined by the **launch angle**.
5. If any hex along the the **hit line** passes through any fielder's **reaction range** with a **ball height** of **ground** or **air**, then the fielder can attempt to field the ball. In cases where the **hit line** passes through multiple fielders' **reaction ranges**, only one fielder is chosen to field the ball. The chosen fielder will be the fielder that is able to field the ball at a hex at the shortest distance along the **hit line**.
6. When attempting to field the ball, the fielder rolls their precision stat against the **ball factor**. The **ball factor** is a randomly chosen number between 1 to 15 (inclusive). If the fielder in question is the pitcher, his precision stat is reduced by 0.25x when rolling precision.
    -If the fielder's precision roll is greater than or equal to the **ball factor**, then the fielder successfully fields the ball.
        - If the ball is fielded with a **ball height** of **air**, then the batter is caught out.
        - If the ball is fielded with a **ball height** of **ground**, then the fielder rolls their strength against the **lead runner's** speed roll. Depending on how far the fielder is from the base they are throwing to, the fielder's strength may be augmented by as much as 2.0x or reduced by 0.7x when determining the strength roll. If the strength roll is greater than the **lead runner's** speed roll, then the **lead runner** is out.
    - If the fielder's precision roll is less than the **ball factor**, then the fielder makes an error. The fielder can not throw the batter out, but he will attempt to hold the batter to first. The fielder will throw to first by rolling his strength against the batter's speed. If the batter's speed roll is greater than or equal to the fielder's strength roll, then the batter makes it to second base, and all other runners advance by one base. Otherwise, the batter is held to a single.
7. If the **hit line** does not pass through any fielder's **reaction range** with a ball height of **ground** or **air**, then the ball will come to rest in the **final position**.
8. Whichever fielder is able to move to the **final position** in the least amount of turns will field the ball. The number of turns required for a fielder to move to the **final position** depends on the fielder's initial field position and their **move speed**, which is based on their speed stat. 
9. Each base runner is guaranteed to attempt to advance at least one base, but they may attempt more. For each turn required for the fielder to move to the **final position**, each base runner will roll their speed stat and the result will be added to a running total. Each time a base runner's running total reaches 50, the base runner will attempt to advance one extra base and the running total will reset. For example, let's say it takes the fielder 3 turns to reach the **final position**, and there is a man on first base. The lead base runner and batter will each roll their speed stat three times. Let's say the lead runner rolls 25, 29, and 12. This runner will attempt to advance 2 bases, from first to third. This is because his running total exceeded 50 one time; so he attempts to advance the 1 guaranteed base plus the 1 extra base. Let's say the batter rolls 8, 3, and 10. The batter will only attempt to run to first base, because his running total only amounted to 21 after all 3 turns. Note that the number of bases a base runner will attempt to advance is limited by the number of advances attempted by any runners ahead of them.
10. The fielder that recovered the ball will then attempt to throw out the lead runner by rolling his strength stat against the lead runner's speed stat. 
    - If the fielder's strength roll is lesss than or equal to the lead runner's speed roll, all runners will safely advance to their attempted bases PLUS one additional base. Using the example above, the lead runner would score and the batter would advance to second base.
    - If the fielder's strength roll is greater than ((runner's speed roll + ball factor) * 2) AND the strength roll is greater than 30, the lead runner will be thrown out. Otherwise, all runners will advance to their attempted bases.

#### Weak Contact

Weak contact can occur when the batter's contact roll is less than the pitcher's precision roll. When weak contact occurs, the ball is hit directly to the position occupied by one of the fielding team's infielders. The ball is hit with a maximum ball factor of 3 instead of the usual maximum ball factor of 15, which makes it unlikely for the fielder to make an error. A batter with a high speed stat still has a good chance of making it to first base safely on a ground ball.

#### Reaction Range 

Every player has a **reaction range** when fielding. IF the path of a batted ball (**hit line**) passes through any tile in a fielder's **reaction range** with a **ball height** of **ground** or **air**, then that fielder will be able to attempt to field the ball. The **reaction range** of a fielder is based on their **class** (commonly referred to as position).
| Fielder Class | Reaction Range |
| ------------- | -------------- |
| Catcher       | 2 tiles        |
| Pitcher       | 1 tile         |
| 1st Base      | 2 tiles        |
| 2nd Base      | 3 tiles        |
| Short Stop    | 3 tiles        |
| 3rd Base      | 2 tiles        |
| Right Field   | 5 tiles        |
| Center Field  | 5 tiles        |
| Left Field    | 5 tiles        |

#### Mercy Rule

If either team has more than a 10 run lead after playing 5 innings, the game will end.

## Player Stats

Player performance is governed by 4 player stats:

- **Strength** - Controls hit distance of batted balls and likelihood of throwing runners out on force plays.
- **Speed** - Determines how likely a runner is to make it on base without being thrown out and also how likely it is for a runner to go for extra bases. For fielders, controls how many hexes they can move in a single turn when recovering a ball that landed outside their range.
- **Precision** - Determines how likely a fielder is to catch a batted ball or make an error. For pitchers, determines likelihood of throwing strikes, walking the batter, or forcing weak contact.
- **Contact** - Determines how likely a batter is to hit the ball.

## Development Details

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`. 

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

