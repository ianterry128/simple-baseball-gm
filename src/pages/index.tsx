import { Player } from "@prisma/client";
import { Console } from "console";
import { randomUUID } from "crypto";
import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { number } from "zod";
import { GenerateTeam } from "~/components/GenerateTeam";
import { MatchTextLog } from "~/components/MatchTextLog";
import { MatchTextLog2 } from "~/components/MatchTextLog2";
import { lastNames } from "~/data/names";
import { teamNames } from "~/data/names";

import { api } from "~/utils/api";
import { Position, hex_distance, hex_lineDraw } from "~/utils/hexUtil";

interface PlayerStateStruct {
    id: string,
    name: string,
    age: number,
    strength: number,
    strengthPot: number,
    speed: number,
    speedPot: number,
    precision: number,
    precisionPot: number,
    contact: number,
    contactPot: number,
    class: string,
    potential: number,
    experience: number,
    level: number,
    classExp: number,
    classLvl: number
}

interface TeamStateStruct {
  id: string,
  name: string,
  players: PlayerStateStruct[],
  wins: number,
  losses: number
}

interface LeagueStateStruct {
  id: string,
  name: string,
  teams: TeamStateStruct[]
}

/**
  interface Position {
    q: number,
    r: number,
    s: number,
  }
*/
enum StatPoint {
  STRENGTH = 0,
  SPEED = 1,
  PRECISION = 2,
  CONTACT = 3
}

interface Proclivity { // TODO: the properties must add up to === 1.0
  strength: number,
  speed: number,
  precision: number,
  contact: number
}

//type FieldPositions = '1B' | '2B' | 'SS' | '3B' | 'CF' | 'LF' | 'RF' | 'C' | 'P' ;

export default function Home() {
  const hello = api.post.hello.useQuery({ text: "from tRPC" });
  //const [playerInfo, setPlayerInfo] = useState<PlayerStateStruct[]>([]);
  //const [teamInfo, setTeamInfo] = useState<TeamStateStruct>();
  const [leagueInfo, setLeagueInfo] = useState<LeagueStateStruct>({
    id: '',
    name: '',
    teams: []
  });
  // LEAGUE TABLE STATE
  const [isLeagueTableActive, setIsLeagueTableActive] = useState<boolean>(true);

  const proclivities: {[key: string]: Proclivity} = {
    'slugger': {strength:0.50, speed:0.10, precision:0.10, contact:0.30},
    'contact hitter': {strength:0.30, speed:0.10, precision:0.10, contact:0.50},
    'pitcher': {strength:0.20, speed:0.20, precision:0.40, contact:0.20},
    'speed hitter': {strength:0.15, speed:0.50, precision:0.05, contact:0.30},
    'speed fielder': {strength:0.10, speed:0.50, precision:0.30, contact:0.10},
    'strong fielder': {strength:0.40, speed:0.10, precision:0.40, contact:0.10},
    'balanced': {strength:0.25, speed:0.25, precision:0.25, contact:0.25},
  }
  const proclivitiesArr: Proclivity[] = [
    proclivities['slugger']!,
    proclivities['contact hitter']!,
    proclivities['speed hitter']!,
    proclivities['speed fielder']!,
    proclivities['strong fielder']!,
    proclivities['balanced']!
  ]

  const [selectedTeam, setSelectedTeam] = useState(0);

// FUNCTIONS HERE USE REACT HOOKS
  function createLeague () {
    setSelectedTeam(1);
    const numTeams: number = 30;
    let m: number = 0;
    let teamsToAdd: TeamStateStruct[] = [];
    let teamNamesUsed: string[] = [];
    while (m < numTeams)
    {
      let newPlayers: PlayerStateStruct[] = [];
      const numPlayers: number = 9;
      let team_lvl_max = 16;
      let n = 0;
      while (n < numPlayers)
      {
        let newPlayer: PlayerStateStruct = {
          id: crypto.randomUUID(),
          name: '',
          age: 0,
          strength: 0,
          strengthPot: 0,
          speed: 0,
          speedPot: 0,
          precision: 0,
          precisionPot: 0,
          contact: 0,
          contactPot: 0,
          class: '',
          potential: 0,
          experience: 0,
          level: 0,
          classExp: 0,
          classLvl: 0
        }
        const classesProclivities: {[key: string]: Proclivity} = {
          '1B': proclivitiesArr[m%6]!,
          '2B': proclivitiesArr[m%6]!,
          'SS': proclivitiesArr[m%6]!,
          '3B': proclivitiesArr[m%6]!,
          'CF': proclivitiesArr[m%6]!,
          'LF': proclivitiesArr[m%6]!,
          'RF': proclivitiesArr[m%6]!,
          'C': proclivitiesArr[m%6]!,
          'P': proclivities['pitcher']!
        }

        const classesToGen: string[] = [
          '1B',
          '2B',
          'SS',
          '3B',
          'CF',
          'LF',
          'RF',
          'C',
          'P'
        ];
        newPlayer.class = classesToGen[n]!;
        let class_stat_proclivities = classesProclivities[newPlayer.class];
        /**
          let class_stat_proclivities: Proclivity = {
            strength: 0.25,
            speed: 0.25,
            precision: 0.25,
            contact: 0.25
          }
        */

        const _name = generateName();
        newPlayer.name = _name
        newPlayer.age = Math.floor(Math.random() * (40 - 16) + 16);
        // choose lvl of player
        newPlayer.level = Math.floor(Math.random() * (30-5+1) + 5); // random lvl between 30 and 5
        //team_lvl_max -= newPlayer.level; // to ensure every team has same total lvls across players
        let numStatPoints = 16 + ((newPlayer.level-1)*3); // lvl 1 has 20 total stat points and each additional lvl has +3
        // we start at 16, because each stat MUST have at least 1 point
        newPlayer.strength = 1;
        newPlayer.speed = 1;
        newPlayer.precision = 1;
        newPlayer.contact = 1;
        let stat_to_add: StatPoint = Math.floor(Math.random() * (4-0+1) + 0);
        for (let i=0; i<numStatPoints; i++) {
          switch (stat_to_add) {
            case StatPoint.STRENGTH:
              newPlayer.strength += 1;
              break;
            case StatPoint.SPEED:
              newPlayer.speed += 1;
              break;
            case StatPoint.PRECISION:
              newPlayer.precision += 1;
              break;
            case StatPoint.CONTACT:
              newPlayer.contact += 1;
              break;
          }
          stat_to_add = getNextStatPoint(class_stat_proclivities ?? {strength:0.25, speed:0.25, precision:0.25, contact:0.25});
          //stat_to_add = Math.floor(Math.random() * (3-0+1) + 0); // choose next stat to add
        }
        //newPlayer.strength = Math.floor(Math.random() * (30 - 1) + 1);
        //newPlayer.speed = Math.floor(Math.random() * (30 - 1) + 1);
        //newPlayer.precision = Math.floor(Math.random() * (30 - 1) + 1);
        //newPlayer.contact = Math.floor(Math.random() * (30 - 1) + 1);

        newPlayers[n] = newPlayer;
        n++;
      }
      // ensure there are no duplicate team names
      let _teamName = generateTeamName();
      while (teamNamesUsed.includes(_teamName)) {
        _teamName = generateTeamName();
      }
      let teamToAdd: TeamStateStruct = {
        id: crypto.randomUUID(),
        name: _teamName,
        players: newPlayers,
        wins: 0,
        losses: 0,
      }
      teamsToAdd[m] = teamToAdd;
      teamNamesUsed[m] = _teamName;

      m++;
    }

    let newLeague: LeagueStateStruct = {
      id: crypto.randomUUID(),
      name: 'Simple League',
      teams: teamsToAdd
    }

    // store info in React state
    setLeagueInfo(newLeague);
  }

  /**
    function exhibition(team_home:TeamStateStruct, team_away:TeamStateStruct) {
      // set visibility of log
      setIsLogActive(true);
      setLogContents(['']);
      let _localContents: string[] = [];
  
      // set league table visibility
      setIsLeagueTableActive(false);
      MatchSim(leagueInfo, team_home, team_away, _localContents)
      setLogContents(_localContents);
    }
  */

  return (
    <>
    <div className="flex flex-col">
      <h1 className="text-center text-2xl">Welcome to Simple Baseball GM!</h1>
      <div className="flex p-2">
        <button 
              className="rounded-full transition-colors duration-200 hover:bg-green-500 
          bg-green-700 text-white shadow-sm font-bold px-10 py-5 w-52"
              onClick={() => createLeague()}>
              New League
        </button>
      </div>
      <div className="flex p-2 gap-4"> 
        {/* can have a table here showing the user's different leagues*/}
      </div>
    </div>
    <div className="flex">
      {/* perhaps have a footer here with some info about the developer */}
    </div>  
    </>
  );
}

// Functions outside Home() do not require REACT hooks
function generateName(): string {
  let surName: string = "";
   
  const randName = lastNames[Math.floor(Math.random() * 2000)];
  if (typeof randName === `string`)
  {
      surName = randName;
  }

  return surName;
}

function generateTeamName(): string {
  let _teamName: string = "";
   
  const randName = teamNames[Math.floor(Math.random() * teamNames.length)];
  if (typeof randName === `string`)
  {
      _teamName = randName;
  }

  return _teamName;
}

function getNextStatPoint(proclivities: Proclivity): number {
  const num = Math.random();
  if (num < proclivities.strength) return 0;
  else if (num < proclivities.speed + proclivities.strength) return 1;
  else if (num < proclivities.precision + proclivities.speed + proclivities.strength) return 2;
  else return 3;
}


