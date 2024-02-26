import { Player, Prisma } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { Console } from "console";
import { randomUUID } from "crypto";
import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { JSONArray } from "node_modules/superjson/dist/types";
import { useEffect, useState } from "react";
import { number } from "zod";
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

/**
  interface TeamStateStruct {
    id: string,
    name: string,
    players: PlayerStateStruct[],
    wins: number,
    losses: number
  }
*/
interface TeamStateStruct {
  id: string,
  name: string,
  gamesPlayed: number,
  wins: number,
  playersJson: PlayerStateStruct[]
}

interface LeagueStateStruct {
  id: string,
  name: string,
  teams: TeamStateStruct[]
}

interface GameDataStateStruct {
  //league: LeagueStateStruct,
  leagueId: string,
  leageName: string,
  myTeamId: string,
  week: number,
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
  //const [playerInfo, setPlayerInfo] = useState<PlayerStateStruct[]>([]);
  //const [teamInfo, setTeamInfo] = useState<TeamStateStruct>();
  const [leagueInfo, setLeagueInfo] = useState<LeagueStateStruct>({
    id: '',
    name: '',
    teams: []
  });
  // LEAGUE TABLE STATE
  const [isLeagueTableActive, setIsLeagueTableActive] = useState<boolean>(false);

  const [gameData, setGameData] = useState<GameDataStateStruct>({
    //league: {id: '', name: '', teams: []},
    leagueId: '',
    leageName: '',
    myTeamId: '',
    week: 0,
    teams: []
  });
  const [isPlayingGame, setIsPlayingGame] = useState<boolean>(false);
  // This preserves state of isPlayingGame and gameData on refresh
  // cannot test locally if React strict mode is enabled
  useEffect(() => {
    const data_isPlayingGame = window.localStorage.getItem('isPlayingGame');
    if (data_isPlayingGame !== null) setIsPlayingGame(JSON.parse(data_isPlayingGame))

    const data_gameData = window.localStorage.getItem('gameData');
    if (data_gameData !== null) setGameData(JSON.parse(data_gameData))
  }, [])   

  useEffect(() => {
    window.localStorage.setItem('isPlayingGame', JSON.stringify(isPlayingGame));

    window.localStorage.setItem('gameData', JSON.stringify(gameData));
  }, [isPlayingGame, gameData])
  //
  

  /**
    function getInitial_IsPlayingGame(): boolean {
      let ret_str = null;
      useEffect(() => {
        ret_str = localStorage.getItem('isPlayingGame');
      })   
      if (ret_str !== null && ret_str !== undefined) {
        return JSON.parse(ret_str);
      }
      return false;
    }
    function setIsPlayingGame_wrapper(value: boolean) {
      let value_str = JSON.stringify(value);
      useEffect(() => {
        localStorage.setItem('isPlayingGame', value_str);
      })
      setIsPlayingGame(value);
    }
  */
  //setIsPlayingGame(initialState_isPlayingGame);

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

  // set hook functions as const so it can be used inside event handler
  const createLeagueConst = api.league.create.useMutation(); 
  const createTeamConst = api.team.create.useMutation(); 
  const createPlayerConst = api.player.create.useMutation(); 

// FUNCTIONS HERE USE REACT HOOKS

// COMPONENTS THAT REQUIRE STATE VARIABLES FROM HOME FUNCTION
function MyLeaguesTable() {
  if (isPlayingGame) {
    return;
  }

  const session = useSession();
  const user = session.data?.user;
  const leagueQuery = api.league.getByUserId.useQuery(user?.id!)
  if (leagueQuery.isFetching) { // TODO: animated loading spinner?
    return <h1>fetching...</h1>;
  }
  if (leagueQuery.isLoading) {
    return <h1>loading...</h1>;
  }
  if (leagueQuery.data === undefined) {
    return;
  }
  // this displays if user has not created any leagues
  if (leagueQuery.data[0] === null || leagueQuery.data[0] === undefined) { 
    return <h2>You have not yet created any Leagues</h2>;
  }

  return (
    <div>
    <table className="table-auto border-2 border-spacing-2 p-8">
      <caption>My Leagues</caption>
      <thead>
        <tr className="even:bg-gray-50 odd:bg-white">
          <th>---</th>
          <th>League</th>
          <th>Team</th>
          <th>Season</th>
        </tr>
      </thead>
      <tbody>

        {
          leagueQuery.data?.map((item, index) => {
            return (
              <tr key={crypto.randomUUID()} className="even:bg-green-200 odd:bg-gray-50">
                <td className="px-5 py-2">
                  <button 
                    onClick={() => { 
                      // set state that needs to persist for playing game
                      setIsPlayingGame(true);
          
                      // from https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields
                      if (
                        item?.teamsJson &&
                        typeof item?.teamsJson === 'object' &&
                        Array.isArray(item?.teamsJson)
                      ) {
                        const teamsObject = item?.teamsJson as Prisma.JsonArray
                        setGameData({
                          //league: {id: item.id, name: item.name, teams: item.teamsJson},
                          leagueId: item.id,
                          leageName: item.name,
                          myTeamId: item.myTeamId,
                          week: item.week,
                          teams: JSON.parse(JSON.stringify(teamsObject))
                        })
                      }
                      
                    }}
                    className="block rounded-md transition-colors duration-200 hover:bg-green-500 
                  bg-green-700 text-center justify-center text-white shadow-sm font-bold h-7 w-20">PLAY
                  </button>
                </td>
                <td className="px-2">{item.name}</td>
                <td className="px-2">{item.myTeamName}</td>
                <td className="px-2">1</td>
              </tr>
            )
          })
        }
      </tbody>
    </table>
  </div>
  )
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

      </div>
      <div className="flex p-2 gap-4"> 
        {/* can have a table here showing the user's different leagues*/}
        <MyLeaguesTable />
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


