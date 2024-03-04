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
import { FieldView } from "~/components/FieldView";
import { lastNames } from "~/data/names";
import { teamNames } from "~/data/names";

import { api } from "~/utils/api";
import { Position, hex_distance, hex_lineDraw } from "~/utils/hexUtil";
/////////////////////////
// The following import prevents a Font Awesome icon server-side rendering bug, // taken from https://stackoverflow.com/questions/56334381/why-my-font-awesome-icons-are-being-displayed-big-at-first-and-then-updated-to-t
// where the icons flash from a very large icon down to a properly sized one:
import '@fortawesome/fontawesome-svg-core/styles.css';
// Prevent fontawesome from adding its CSS since we did it manually above:
import { config } from '@fortawesome/fontawesome-svg-core';
config.autoAddCss = false; /* eslint-disable import/first */
////////////////////////
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faHouse, faArrowUp, faArrowLeft, faArrowRight, faArrowDown } from '@fortawesome/free-solid-svg-icons'
library.add(faHouse, faArrowUp, faArrowLeft, faArrowRight, faArrowDown)

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
  teams: TeamStateStruct[],
  schedule: { [key: number]: Matchup[]} // key is the week number and Matchup[] holds list of games for that week
}

interface Matchup { // store teamId of competing teams
  homeTeam: string,
  awayTeam: string
}

interface GameDataStateStruct {
  //league: LeagueStateStruct,
  leagueId: string,
  leagueName: string,
  myTeamId: string,
  week: number,
  phase: number,
  teams: TeamStateStruct[],
  schedule: { [key: number]: Matchup[]},
  fielderHexPos: Record<FieldPositions, Position>
}

type FieldPositions = '1B' | '2B' | 'SS' | '3B' | 'CF' | 'LF' | 'RF' | 'C' | 'P' ;

enum WeekPhase {
  PREGAME = 0,
  GAME = 1,
  POSTGAME = 2
}

const default_fielderHexPos: Record<FieldPositions, Position> = {
  '1B': {q:12,r:-15,s:3},
  '2B': {q:6,r:-15,s:9},
  'SS': {q:-4,r:-11,s:15},
  '3B': {q:-12,r:-3,s:15},
  'CF': {q:0,r:-25,s:25},
  'LF': {q:-14,r:-10,s:24},
  'RF': {q:14,r:-24,s:10},
  'C': {q:0,r:0,s:0},
  'P': {q:0,r:-7,s:7}
}
/**
  interface Position {
    q: number,
    r: number,
    s: number,
  }
*/

interface Proclivity { // TODO: the properties must add up to === 1.0
  strength: number,
  speed: number,
  precision: number,
  contact: number
}
// TYPES, INTERFACES, and ENUMS NEEDED FOR MATCH SIMULATION
enum Height {
  GROUND = 0,
  AIR = 1,
  HIGH = 2
}
interface Hex {
  position: Position,
  ballHeight: Height
} 

type PitchResults = {
  outCounter: number,
  pitchLogContents: string[],
  hitLine: Hex[]
}

type BasesOccupied = {
  first: PlayerStateStruct | undefined,
  second: PlayerStateStruct | undefined,
  third: PlayerStateStruct | undefined
}

type FieldActionResults = {
  outCounter: number,
  fieldActionLogContents: string[],
  baseResults: BasesOccupied,
  runsScored: number
}

export default function Home() {
  // STATE VARIABLES ---
  const [leagueInfo, setLeagueInfo] = useState<LeagueStateStruct>({
    id: '',
    name: '',
    teams: [],
    schedule: {},
  });
  // LEAGUE TABLE STATE
  const [isLeagueTableActive, setIsLeagueTableActive] = useState<boolean>(false);

  const [selectedTeam, setSelectedTeam] = useState(0);
  function setSelectedTeamById(_id: string) {
    let i: number = 0;
    while (i < gameData.teams.length && gameData.teams[i]?.id !== _id) {
      i++;
    }
    setSelectedTeam(i);
  }

  const [selectedPlayer, setSelectedPlayer] = useState({
    id: '',
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
  });
  function setSelectedPlayerById(_id: string) {
    let i: number = 0;
    while (i < gameData.teams[0]!.playersJson.length && gameData.teams[0]!.playersJson[i]?.id !== _id) {
      i++;
    }
    setSelectedPlayer(gameData.teams[0]?.playersJson[i]!);
  }

  const [isViewSchedule, setIsViewSchedule] = useState<boolean>(false);

  // needed for game simulation
  const [logContents, setLogContents] = useState<string[]>([]);
  const [numInnings, setNumInnings] = useState<number>(9); // this controls number of innings played per game
  // ---
  // PERSISTANT STATE VARIABLES ~~~
  const [gameData, setGameData] = useState<GameDataStateStruct>({
    //league: {id: '', name: '', teams: []},
    leagueId: '',
    leagueName: '',
    myTeamId: '',
    week: 0,
    phase: 0,
    teams: [],
    schedule: {},
    fielderHexPos: default_fielderHexPos
  });
  const [isPlayingGame, setIsPlayingGame] = useState<boolean>(false);
  function setGameData_FielderHexPos(f_pos: FieldPositions, direction: Position) {
    if (f_pos === '1B') {
      setGameData({
        leagueId: gameData.leagueId,
        leagueName: gameData.leagueName,
        myTeamId: gameData.myTeamId,
        week: gameData.week,
        phase: gameData.phase, // change to reflect phase from database
        teams: gameData.teams,
        schedule: gameData.schedule,
        fielderHexPos: {
          '1B': {q: gameData.fielderHexPos['1B'].q + direction.q, r:gameData.fielderHexPos['1B'].r + direction.r, s: gameData.fielderHexPos['1B'].s + direction.s},
          '2B': gameData.fielderHexPos['2B'],
          'SS': gameData.fielderHexPos['SS'],
          '3B': gameData.fielderHexPos['3B'],
          'CF': gameData.fielderHexPos['CF'],
          'LF': gameData.fielderHexPos['LF'],
          'RF': gameData.fielderHexPos['RF'],
          'C': {q:0,r:0,s:0},
          'P': {q:0,r:-7,s:7}
        } // make it so this updates to custom positions
      })
    }
    if (f_pos === '2B') {
      setGameData({
        leagueId: gameData.leagueId,
        leagueName: gameData.leagueName,
        myTeamId: gameData.myTeamId,
        week: gameData.week,
        phase: gameData.phase, // change to reflect phase from database
        teams: gameData.teams,
        schedule: gameData.schedule,
        fielderHexPos: {
          '1B': gameData.fielderHexPos['1B'],
          '2B': {q: gameData.fielderHexPos['2B'].q + direction.q, r:gameData.fielderHexPos['2B'].r + direction.r, s: gameData.fielderHexPos['2B'].s + direction.s},
          'SS': gameData.fielderHexPos['SS'],
          '3B': gameData.fielderHexPos['3B'],
          'CF': gameData.fielderHexPos['CF'],
          'LF': gameData.fielderHexPos['LF'],
          'RF': gameData.fielderHexPos['RF'],
          'C': {q:0,r:0,s:0},
          'P': {q:0,r:-7,s:7}
        } // make it so this updates to custom positions
      })
    }
    if (f_pos === 'SS') {
      setGameData({
        leagueId: gameData.leagueId,
        leagueName: gameData.leagueName,
        myTeamId: gameData.myTeamId,
        week: gameData.week,
        phase: gameData.phase, // change to reflect phase from database
        teams: gameData.teams,
        schedule: gameData.schedule,
        fielderHexPos: {
          '1B': gameData.fielderHexPos['1B'],
          '2B': gameData.fielderHexPos['2B'],
          'SS': {q: gameData.fielderHexPos['SS'].q + direction.q, r:gameData.fielderHexPos['SS'].r + direction.r, s: gameData.fielderHexPos['SS'].s + direction.s},
          '3B': gameData.fielderHexPos['3B'],
          'CF': gameData.fielderHexPos['CF'],
          'LF': gameData.fielderHexPos['LF'],
          'RF': gameData.fielderHexPos['RF'],
          'C': {q:0,r:0,s:0},
          'P': {q:0,r:-7,s:7}
        } // make it so this updates to custom positions
      })
    }
    if (f_pos === '3B') {
      setGameData({
        leagueId: gameData.leagueId,
        leagueName: gameData.leagueName,
        myTeamId: gameData.myTeamId,
        week: gameData.week,
        phase: gameData.phase, // change to reflect phase from database
        teams: gameData.teams,
        schedule: gameData.schedule,
        fielderHexPos: {
          '1B': gameData.fielderHexPos['1B'],
          '2B': gameData.fielderHexPos['2B'],
          'SS': gameData.fielderHexPos['SS'],
          '3B': {q: gameData.fielderHexPos['3B'].q + direction.q, r:gameData.fielderHexPos['3B'].r + direction.r, s: gameData.fielderHexPos['3B'].s + direction.s},
          'CF': gameData.fielderHexPos['CF'],
          'LF': gameData.fielderHexPos['LF'],
          'RF': gameData.fielderHexPos['RF'],
          'C': {q:0,r:0,s:0},
          'P': {q:0,r:-7,s:7}
        } // make it so this updates to custom positions
      })
    }
    if (f_pos === 'CF') {
      setGameData({
        leagueId: gameData.leagueId,
        leagueName: gameData.leagueName,
        myTeamId: gameData.myTeamId,
        week: gameData.week,
        phase: gameData.phase, // change to reflect phase from database
        teams: gameData.teams,
        schedule: gameData.schedule,
        fielderHexPos: {
          '1B': gameData.fielderHexPos['1B'],
          '2B': gameData.fielderHexPos['2B'],
          'SS': gameData.fielderHexPos['SS'],
          '3B': gameData.fielderHexPos['3B'],
          'CF': {q: gameData.fielderHexPos['CF'].q + direction.q, r:gameData.fielderHexPos['CF'].r + direction.r, s: gameData.fielderHexPos['CF'].s + direction.s},
          'LF': gameData.fielderHexPos['LF'],
          'RF': gameData.fielderHexPos['RF'],
          'C': {q:0,r:0,s:0},
          'P': {q:0,r:-7,s:7}
        } // make it so this updates to custom positions
      })
    }
    if (f_pos === 'LF') {
      setGameData({
        leagueId: gameData.leagueId,
        leagueName: gameData.leagueName,
        myTeamId: gameData.myTeamId,
        week: gameData.week,
        phase: gameData.phase, // change to reflect phase from database
        teams: gameData.teams,
        schedule: gameData.schedule,
        fielderHexPos: {
          '1B': gameData.fielderHexPos['1B'],
          '2B': gameData.fielderHexPos['2B'],
          'SS': gameData.fielderHexPos['SS'],
          '3B': gameData.fielderHexPos['3B'],
          'CF': gameData.fielderHexPos['CF'],
          'LF': {q: gameData.fielderHexPos['LF'].q + direction.q, r:gameData.fielderHexPos['LF'].r + direction.r, s: gameData.fielderHexPos['LF'].s + direction.s},
          'RF': gameData.fielderHexPos['RF'],
          'C': {q:0,r:0,s:0},
          'P': {q:0,r:-7,s:7}
        } // make it so this updates to custom positions
      })
    }
    if (f_pos === 'RF') {
      setGameData({
        leagueId: gameData.leagueId,
        leagueName: gameData.leagueName,
        myTeamId: gameData.myTeamId,
        week: gameData.week,
        phase: gameData.phase, // change to reflect phase from database
        teams: gameData.teams,
        schedule: gameData.schedule,
        fielderHexPos: {
          '1B': gameData.fielderHexPos['1B'],
          '2B': gameData.fielderHexPos['2B'],
          'SS': gameData.fielderHexPos['SS'],
          '3B': gameData.fielderHexPos['3B'],
          'CF': gameData.fielderHexPos['CF'],
          'LF': gameData.fielderHexPos['LF'],
          'RF': {q: gameData.fielderHexPos['RF'].q + direction.q, r:gameData.fielderHexPos['RF'].r + direction.r, s: gameData.fielderHexPos['RF'].s + direction.s},
          'C': {q:0,r:0,s:0},
          'P': {q:0,r:-7,s:7}
        } // make it so this updates to custom positions
      })
    }
  }
  // ~~~
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

  // set hook functions as const so it can be used inside event handler
  const createLeagueConst = api.league.create.useMutation(); 
  const createTeamConst = api.team.create.useMutation(); 
  const createPlayerConst = api.player.create.useMutation(); 

// FUNCTIONS HERE USE REACT HOOKS
function exhibition(team_home:TeamStateStruct, team_away:TeamStateStruct) {
  // set visibility of log
  //setIsLogActive(true);
  setLogContents(['']);
  let _localContents: string[] = [];

  // set league table visibility
  //setIsLeagueTableActive(false);
  MatchSim(gameData, team_home, team_away, _localContents)
  setLogContents(_localContents);
}

/*
  // MatchSim returns TRUE if Home team wins. If Away team wins, return FALSE.
  */
  function MatchSim(gameDataProp:GameDataStateStruct, team_home:TeamStateStruct, team_away:TeamStateStruct, _logContents: string[]): boolean {
    let _num_innings = numInnings;
    let currentInning: number = 1;
    let outCount = 0;
    let homeScore = 0;
    let awayScore = 0;
    let home_bat_cur = 0;
    let away_bat_cur = 0;
    let pitchResults: PitchResults = {outCounter:0, pitchLogContents:[], hitLine:[]};
    let basesOccupied: BasesOccupied = {first:undefined, second:undefined, third:undefined};
    let fieldActionResults: FieldActionResults = {outCounter:0, fieldActionLogContents:[], baseResults: basesOccupied, runsScored: 0};
  
    let isMyTeam_Home: boolean = false;
    let isMyTeam_Away: boolean = false;
    let home_lineup: PlayerStateStruct[] = [];
    let away_lineup: PlayerStateStruct[] = [];
    if (team_home.id === gameData.myTeamId) {
      home_lineup = team_home.playersJson;
      away_lineup = createLineup(team_away);
      isMyTeam_Home = true;
    }
    else if (team_away.id === gameData.myTeamId) {
      home_lineup = createLineup(team_home);
      away_lineup = team_away.playersJson;
      isMyTeam_Away = true;
    }
    else {
      home_lineup = createLineup(team_home);
      away_lineup = createLineup(team_away);
    }
     
    let home_p_index: number = getPlayerIndex('P', team_home);
    let away_p_index: number = getPlayerIndex('P', team_away);
  
    // set visibility of log
    //setIsLogActive(true);
    //setLogContents(['']);
    //let _localContents: string[] = [];

    // set league table visibility
    //setIsLeagueTableActive(false);
    // set initial scoreboard info
    
    while (currentInning <= _num_innings) {
      // Top of the inning
      _logContents.push(`Top of Inning ${currentInning} begins...\n`)
      _logContents.push(`The ${team_away.name} are batting...\n`);
      while (outCount < 3) {
        _logContents.push(`${away_lineup[away_bat_cur]?.name} steps up to the plate...\n`);
        
        pitchResults = pitch(team_home.playersJson[home_p_index]!, team_away.playersJson[away_bat_cur]!);
        pitchResults.pitchLogContents.forEach((v) => { // log pitch log contents
          _logContents.push(v);
        });
        // What happens after a hit? (or miss)
        if (pitchResults.hitLine.length > 0) { // if hitline.length >1 then the ball was hit
          if (isMyTeam_Home) {
            fieldActionResults = fieldAction(away_lineup[away_bat_cur]!, home_lineup, pitchResults.hitLine, basesOccupied, outCount, gameDataProp, true) // input batter, field team, hitline,
          }
          else if (!isMyTeam_Home) {
            fieldActionResults = fieldAction(away_lineup[away_bat_cur]!, home_lineup, pitchResults.hitLine, basesOccupied, outCount, gameDataProp, false) // input batter, field team, hitline,
          }
          // output outcount, scoreToAdd, baseRanTo
          outCount += fieldActionResults.outCounter - outCount;
          basesOccupied = fieldActionResults.baseResults;
          awayScore += fieldActionResults.runsScored;
          fieldActionResults.fieldActionLogContents.forEach((v) => { // log field action log contents
            _logContents.push(v);
          });
        }
        else {
          outCount += pitchResults.outCounter;
        }
        //_localContents.push(`~~~ Home: ${homeScore} Away: ${awayScore} ||| Outs: ${outCount} ~~~\n`)
        //_localContents.push(...pitchResults.pitchLogContents);
        //outCount += pitch('txt.value', team_home.players[home_p_index]!, team_away.players[away_bat_cur]!);
        away_bat_cur++;
        if (away_bat_cur > 8) away_bat_cur = 0;
      }
      outCount = 0;
      basesOccupied = {first:undefined, second:undefined, third:undefined};
      if (homeScore > awayScore && currentInning === _num_innings) { // game is over if the Home team is ahead going into the bottom of the 9th
        _logContents.push(`The Home Team ${team_home.name} win!!!\n`)
        return true;
      }
      // Bottom of the inning
      _logContents.push(`Bottom of Inning ${currentInning} begins...\n`)
      _logContents.push(`The ${team_home.name} are batting...\n`)
      while (outCount < 3) {
        _logContents.push(`${home_lineup[home_bat_cur]?.name} steps up to the plate...\n`)
        
        pitchResults = pitch(team_away.playersJson[away_p_index]!, team_home.playersJson[home_bat_cur]!);
        pitchResults.pitchLogContents.forEach((v) => { // log pitch log contents
          _logContents.push(v);
        });
        // What happens after a hit? (or miss)
        if (pitchResults.hitLine.length > 0) { // if hitline.length >1 then the ball was hit
          if (isMyTeam_Away) {
            fieldActionResults = fieldAction(away_lineup[away_bat_cur]!, home_lineup, pitchResults.hitLine, basesOccupied, outCount, gameDataProp, true) // input batter, field team, hitline,
          }
          else if (!isMyTeam_Away) {
            fieldActionResults = fieldAction(away_lineup[away_bat_cur]!, home_lineup, pitchResults.hitLine, basesOccupied, outCount, gameDataProp, false) // input batter, field team, hitline,
          }
          // output outcount, scoreToAdd, baseRanTo
          outCount += fieldActionResults.outCounter - outCount;
          basesOccupied = fieldActionResults.baseResults;
          homeScore += fieldActionResults.runsScored;
          fieldActionResults.fieldActionLogContents.forEach((v) => { // log field action log contents
            _logContents.push(v);
          });
        }
        else {
          outCount += pitchResults.outCounter;
        }
        //_localContents.push(`~~~ Home: ${homeScore} Away: ${awayScore} ||| Outs: ${outCount} ~~~\n`)
        //_localContents.push(...pitchResults.pitchLogContents);
        //outCount += pitch('txt.value', team_away.players[away_p_index]!, team_home.players[home_bat_cur]!);
        home_bat_cur++;
        if (home_bat_cur > 8) home_bat_cur = 0;
      }
      outCount = 0;
      basesOccupied = {first:undefined, second:undefined, third:undefined};
      if (currentInning === _num_innings && homeScore === awayScore) {
        _num_innings += 1;
      }
      currentInning++;
    }
    if (homeScore > awayScore) {
      _logContents.push(`The Home Team ${team_home.name} win!!!\n`)
      return true;
    }
    _logContents.push(`The Away Team ${team_away.name} win!!!\n`)
    return false;
    //setLogContents(_localContents);
  }

  function getTeamById(id: string): TeamStateStruct | undefined {
    for (let i=0; i<gameData.teams.length; i++) {
      if (gameData.teams[i]!.id === id) {
        return gameData.teams[i];
      }
    }
  }

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
                        //const scheduleObject = item.scheduleJson as Prisma.JsonArray
                        setGameData({
                          //league: {id: item.id, name: item.name, teams: item.teamsJson},
                          leagueId: item.id,
                          leagueName: item.name,
                          myTeamId: item.myTeamId,
                          week: item.week,
                          phase: WeekPhase.PREGAME, // change to reflect phase from database
                          teams: JSON.parse(JSON.stringify(teamsObject)),
                          schedule: JSON.parse(JSON.stringify(item.scheduleJson)),
                          fielderHexPos: default_fielderHexPos // make it so this updates to custom positions
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
function MainGameView() {
  if (!isPlayingGame) return;
  if (isViewSchedule) {
    return (
      <ScheduleView />
    );
  }

  const _leagueInfo: LeagueStateStruct = {
    id: gameData.leagueId,
    name: gameData.leagueName,
    teams: gameData.teams,
    schedule: gameData.schedule
  }  

  let opp_team_id: string = '';
  let my_sched_index = 0;
  let i = 0;
  while (i< gameData.schedule[gameData.week]!.length && opp_team_id === ''){
    if (gameData.schedule[gameData.week]![i]!.awayTeam === gameData.myTeamId) {
      opp_team_id = gameData.schedule[gameData.week]![i]!.homeTeam;
    }
    if (gameData.schedule[gameData.week]![i]!.homeTeam === gameData.myTeamId) {
      opp_team_id = gameData.schedule[gameData.week]![i]!.awayTeam;
    }
  }
  useEffect(() => {
    setSelectedTeamById(opp_team_id); // this will cause second teamdisplaytable to show opponent team of the current week
  }, []);
  
  return (
    <div className="flex flex-row flex-wrap">

        <div className="w-full sm:w-1/5 lg:w-1/5 px-1 bg-red-300">
          <TeamDisplayLineupChangeTable 
            leagueInfoProp={_leagueInfo}
            teamIndexProp={0}
          /> 
          <div className="flex flex-col">
            <label>Set player field position: {selectedPlayer.class} {selectedPlayer.name}</label>
            <div className="flex flex-row">
              <FontAwesomeIcon 
                className='p-1 -rotate-45' icon={['fas', 'arrow-up']}
                onClick={() => setGameData_FielderHexPos(selectedPlayer.class as FieldPositions, {q:-1, r:0, s:1})} />
              <FontAwesomeIcon 
                className='p-1' icon={['fas', 'arrow-up']}
                onClick={() => setGameData_FielderHexPos(selectedPlayer.class as FieldPositions, {q:0, r:-1, s:1})} />
              <FontAwesomeIcon 
                className='p-1 rotate-45' icon={['fas', 'arrow-up']}
                onClick={() => setGameData_FielderHexPos(selectedPlayer.class as FieldPositions, {q:1, r:-1, s:0})} />
            </div>
            <div className="flex flex-row">
              <FontAwesomeIcon 
                className='p-1 rotate-45' icon={['fas', 'arrow-down']}
                onClick={() => setGameData_FielderHexPos(selectedPlayer.class as FieldPositions, {q:-1, r:1, s:0})} />
              <FontAwesomeIcon 
                className='p-1' icon={['fas', 'arrow-down']}
                onClick={() => setGameData_FielderHexPos(selectedPlayer.class as FieldPositions, {q:0, r:1, s:-1})} />
              <FontAwesomeIcon 
                className='p-1 -rotate-45' icon={['fas', 'arrow-down']}
                onClick={() => setGameData_FielderHexPos(selectedPlayer.class as FieldPositions, {q:1, r:0, s:-1})} />
            </div>
            
          </div>
          
        </div>
        <div className="w-full sm:w-3/5 lg:w-3/5 px-1 bg-orange-300 margin-auto">
          <h1 className="text-center">Week {gameData.week}</h1>
          <FieldView 
          fielderHexPos={gameData.fielderHexPos}/>
        </div>
        <div className="w-full sm:w-1/5 lg:w-1/5 px-1 bg-amber-200">
          <TeamDisplayTable 
            leagueInfoProp={_leagueInfo}
            teamIndexProp={selectedTeam}
          /> 
        </div>
      <LeagueTeamsTable
      leagueInfoProp={_leagueInfo}
      isActiveProp={true} />
    </div>
  )
}

/* 
// team display table that allows reordering of batting order
// IMPORTANT: batting order changes DO save to gameData state variable
// TODO: I don't think this needs props... can just use gameData state variable directly
*/
function TeamDisplayLineupChangeTable({leagueInfoProp, teamIndexProp} : {leagueInfoProp:LeagueStateStruct, teamIndexProp:number}) {
 
  function changeOrder(originalArray: PlayerStateStruct[], index: number, direction: string) {
    let newIndex = index + (direction === "UP" ? (-1) : 1)
    const movedItem = originalArray.find((value, _index) => _index === index);
    const remainingItems = originalArray.filter((value, _index) => _index !== index);

    const reorderedItems: PlayerStateStruct[] = [
      ...remainingItems.slice(0, newIndex),
      movedItem!,
      ...remainingItems.slice(newIndex)
    ];

    const reordered_team: TeamStateStruct = {
      id: gameData.teams[0]?.id!,
      name: gameData.teams[0]?.name!,
      gamesPlayed: gameData.teams[0]?.gamesPlayed!,
      wins: gameData.teams[0]?.wins!,
      playersJson: reorderedItems
    }

    const other_teams = gameData.teams.filter((value) => value.id !== gameData.myTeamId); // this gives every team except My Team

    setGameData({
      leagueId: gameData.leagueId,
      leagueName: gameData.leagueName,
      myTeamId: gameData.myTeamId,
      week: gameData.week,
      phase: gameData.phase,
      teams: [reordered_team, ...other_teams], 
      schedule: gameData.schedule,
      fielderHexPos: gameData.fielderHexPos
    })
  }

  const captionText: string = teamIndexProp === 0 ? "My Team: " : "Opponent Team: "
  return (
      <div className="overflow-x-auto">
        <table className="table-auto border-2 border-spacing-2 p-8">
          <caption>{captionText} {leagueInfoProp.teams[teamIndexProp]?.name}</caption>
          <thead>
            <tr className="even:bg-gray-50 odd:bg-white">
              <th>Batting Order</th>
              <th></th>
              <th>Name</th>
              <th>Class</th>
              <th>Str</th>
              <th>Spd</th>
              <th>Prc</th>
              <th>Con</th>
              <th>Lvl</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            {
              leagueInfoProp.teams[teamIndexProp]?.playersJson.map((value, index) => {
                return (
                  <tr key={value.id} 
                  className="even:bg-green-200 odd:bg-gray-50 hover:bg-blue-600 hover:text-gray-50"
                  onClick={() => {
                    setSelectedPlayerById(value.id);
                  }}>
                    <td>{index+1}</td>
                    <td>
                      {
                        index === 0 ? (
                          <button onClick={() => changeOrder(leagueInfoProp.teams[0]?.playersJson!, index, "DOWN")}>v</button>
                        ) :
                          index === 8 ? (
                            <button onClick={() => changeOrder(leagueInfoProp.teams[0]?.playersJson!, index, "UP")}>^</button> 
                          ) :
                            (
                              <div>
                                <button onClick={() => changeOrder(leagueInfoProp.teams[0]?.playersJson!, index, "UP")}>^</button> 
                                <button onClick={() => changeOrder(leagueInfoProp.teams[0]?.playersJson!, index, "DOWN")}>v</button>
                              </div>
                            )
                      }
                    </td>
                    <td>{value.name}</td>
                    <td>{value.class}</td>
                    <td>{value.strength}</td>
                    <td>{value.speed}</td>
                    <td>{value.precision}</td>
                    <td>{value.contact}</td>
                    <td>{value.level}</td>
                    <td>{value.age}</td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>
    )
  }

function LeagueTeamsTable({leagueInfoProp, isActiveProp} : {leagueInfoProp:LeagueStateStruct, isActiveProp:boolean}) {
  return (
      <div
      style={{ display: isActiveProp ? "inline" : "none" }}>
        <table className="table-auto border-2 border-spacing-2 p-8">
          <caption>My League: {leagueInfoProp.name}</caption>
          <thead>
            <tr className="even:bg-gray-50 odd:bg-white">
              <th>Name</th>
              <th>Wins</th>
              <th>Losses</th>
            </tr>
          </thead>
          <tbody>
            {
              leagueInfoProp.teams.map((index) => {
                return (
                  <tr 
                  key={index.id} 
                  className="even:bg-green-200 odd:bg-gray-50 hover:bg-blue-600 hover:text-gray-50"
                  onClick={() => {
                    setSelectedTeamById(index.id);
                  }}>
                    <td>{index.name}</td>
                    <td>{index.wins}</td>
                    <td>{index.gamesPlayed - index.wins}</td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>
  )
}

function ScheduleView() {
  const sched = Object.assign({}, gameData.schedule);
  let mySched: {opponent: string | undefined, h_a: string, react_key: string}[] = []
  for (let key in sched) {
    let matchups: Matchup[] = sched[key]!;
    for (let i=0; i<matchups.length; i++) {
      if (matchups[i]?.awayTeam === gameData.myTeamId) {
        // this is my match and I am away
        // get opponent team name from id
        let opp_id = matchups[i]?.homeTeam;
        let opp_name = gameData.teams.find((value) => value.id === opp_id)?.name;
        mySched[key] = {opponent: opp_name, h_a: 'A', react_key: crypto.randomUUID()}
      }
      else if (matchups[i]?.homeTeam === gameData.myTeamId) {
        // this is my match and I am home
        let opp_id = matchups[i]?.awayTeam;
        let opp_name = gameData.teams.find((value) => value.id === opp_id)?.name;
        mySched[key] = {opponent: opp_name, h_a: 'H', react_key: crypto.randomUUID()}
      }
    }
  }

  return (
    <div className="overflow-x-auto">
        <table className="table-auto border-2 border-spacing-2 p-8">
          <caption>My Schedule</caption>
          <thead>
            <tr className="even:bg-gray-50 odd:bg-white">
              <th>Week</th>
              <th>Opponent</th>
              <th>Home/Away</th>
              <th>Win/Loss</th>
            </tr>
          </thead>
          <tbody>
            {
              mySched.map((v, index) => {
                return (
                  <tr key={v.react_key} className="even:bg-green-200 odd:bg-gray-50">
                    <td>{index}</td>
                    <td>{v.opponent}</td>
                    <td>{v.h_a}</td>
                    <td>-</td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>
  )
}

function TopBar() {
  let isMyTeamHome: boolean = true;
  let opp_team: TeamStateStruct = {
    id: '',
    name: '',
    gamesPlayed: 0,
    wins: 0,
    playersJson: []
  }
  const my_team: TeamStateStruct = getTeamById(gameData.myTeamId)!;
  let opp_team_id: string = '';
  console.log("it ran the BEFORE part");
  if (gameData.schedule[gameData.week] === undefined) return; 
  console.log("it ran the AFTER part");
  let i = 0;
  while (i< gameData.schedule[gameData.week]!.length && opp_team_id === ''){
    console.log(`its on loop # ${i}`)
    if (gameData.schedule[gameData.week]![i]!.awayTeam === gameData.myTeamId) {
      opp_team_id = gameData.schedule[gameData.week]![i]!.homeTeam;
      opp_team = getTeamById(opp_team_id)!;
      isMyTeamHome = false;
    }
    if (gameData.schedule[gameData.week]![i]!.homeTeam === gameData.myTeamId) {
      opp_team_id = gameData.schedule[gameData.week]![i]!.awayTeam;
      opp_team = getTeamById(opp_team_id)!;
      isMyTeamHome = true;
    }
    i++;
  }

  return (
    <div className="flex flex-row p-1 gap-3 bg-neutral-100">
      <button onClick={() => setIsViewSchedule(false)}>Dashboard</button>
      <button onClick={() => setIsViewSchedule(true)}>Schedule</button>
      <button 
      className="transition-colors duration-200 hover:bg-green-400 
      bg-green-600 text-center text-white shadow-sm"
      onClick={() => { // TODO: Will this work?
        if (isMyTeamHome) exhibition(my_team, opp_team);
        else if (!isMyTeamHome) exhibition(opp_team, my_team);
      }}>
        Sim Game{` >>`}
      </button>
    </div>
  )
}

// This is the outermost HTML
  return (
    <>
    <div className="">
      <h1 className="text-center text-2xl">Welcome to Simple Baseball GM!</h1>
      <TopBar />
      <div className=""> 
        {/* can have a table here showing the user's different leagues*/}
        <MyLeaguesTable />
        <MainGameView />
      </div>
    </div>
    </>
  );
}

// Functions outside Home() do not require REACT hooks
// COMPONENTS
function TeamDisplayTable({leagueInfoProp, teamIndexProp} : {leagueInfoProp:LeagueStateStruct, teamIndexProp:number}) {
  const captionText: string = teamIndexProp === 0 ? "My Team: " : "Opponent Team: "
  return (
      <div className="overflow-x-auto">
        <table className="table-auto border-2 border-spacing-2 p-8">
          <caption>{captionText} {leagueInfoProp.teams[teamIndexProp]?.name}</caption>
          <thead>
            <tr className="even:bg-gray-50 odd:bg-white">
              <th>Name</th>
              <th>Class</th>
              <th>Str</th>
              <th>Spd</th>
              <th>Prc</th>
              <th>Con</th>
              <th>Lvl</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            {
              leagueInfoProp.teams[teamIndexProp]?.playersJson.map((index) => {
                return (
                  <tr key={index.id} className="even:bg-green-200 odd:bg-gray-50">
                    <td>{index.name}</td>
                    <td>{index.class}</td>
                    <td>{index.strength}</td>
                    <td>{index.speed}</td>
                    <td>{index.precision}</td>
                    <td>{index.contact}</td>
                    <td>{index.level}</td>
                    <td>{index.age}</td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>
    )
  }

// FUNCTIONS
// TODO: does this mutate the state object?? might not be what we want...
function createLineup(team: TeamStateStruct): PlayerStateStruct[] {
  // sorts batting order by Contact
  let lineUp: PlayerStateStruct[] = team.playersJson.sort((a, b) => {
    if (b.contact < a.contact) return -1;
    if (b.contact > a.contact) return 1;
    return 0;
  });

  return lineUp;
}

// TODO: enforce that only one of team or players is input
function getPlayerIndex(position: FieldPositions, team?: TeamStateStruct, players?: PlayerStateStruct[]): number {
  let i = 0;
  let index = 0;
  if (team !== undefined) {  // do this if team was input as TeamStateStruct
    while (i < team.playersJson.length) {
      if (team.playersJson[i]?.class === position) {
        index = i;
        return index;
      }
      i++;
    }
  }
  else if (players !== undefined) {  // else do this if team was input as PlayerStateStruct[]
    while (i < players.length) {
      if (players[i]?.class === position) {
        index = i;
        return index;
      }
      i++;
    }
  }  
  return index;
}

function pitch(pitcher: PlayerStateStruct, batter: PlayerStateStruct): PitchResults {
  const pitch_roll: number = Math.floor(Math.random() * (pitcher.precision - 1 + 1) + 1);
  const _con_roll: number = Math.floor(Math.random() * batter.contact + 1);

  let hitDistance: number = 0;
  let _hitLineHex: Hex[] = [];

  let retStrings: string[] = [];
  //log += `${pitcher.name} pitches with ${_prec_roll} precision...`
  retStrings.push(`${pitcher.name} pitches with ${pitch_roll} precision...\n`);
  if (_con_roll >= pitch_roll) {
    //log += `with ${_con_roll} contact, ${batter.name} gets a hit!!!`
    let str_roll = Math.floor(Math.random() * batter.strength + 1);
    hitDistance = hitDistanceCalc(str_roll);
    if (hitDistance === 40 || hitDistance === 41) { // the ball hits the outfield fence and bounces back to hex at dist 39
      hitDistance = 39;
    } 
    retStrings.push(`with ${_con_roll} contact, ${batter.name} hits the ball ${hitDistance} hexes!!! str_roll = ${str_roll}\n`);
    const _hitDistArr: Hex[] = getHexesAtDistance(hitDistance); // get hexes to select from for final hit ball position
    const finalBallPos: Hex = _hitDistArr[Math.floor(Math.random() * (_hitDistArr.length -1))] ?? {position:{q:0,r:0,s:0}, ballHeight:Height.GROUND}; // get hex of final ball pos
    const _hitLinePos: Position[] = hex_lineDraw({q:0,r:0,s:0}, finalBallPos.position); 
    // Determine launch angle
    let launchAngle: Height = 0;
    if (hitDistance > 15) { // if distance is 26 or greater, launchAngle must be HIGH... distance btwn 16 and 26 -> HIGH or AIR
      launchAngle = hitDistance < 27 ? Math.floor(Math.random() * 2 + 1) : Height.HIGH; 
    }
    else if (hitDistance <= 15) { // if distance is less than or equal to 15
      if (hitDistance >= 3) { // and greater than 3
        launchAngle = Math.floor(Math.random() * 3); // any launchAngle is possible
      }
      else if (hitDistance < 3) { // if hitdistance is less than 3, height is GROUND
        launchAngle = Height.GROUND;
      }
    }

    // since hex_lineDraw returns Position[], we have to convert it to Hex[]...
    // here we set ball height for each hex in the hitLine, based on launchAngle
    let i = 1;
    console.log(`${batter.name} hitline is (length=${_hitLinePos.length}) (launch=${launchAngle}): `) // for debugging
    if (launchAngle === Height.GROUND) {  // all hexes GROUND
      while (i < _hitLinePos.length) {
        _hitLineHex[i] = {position:{q:_hitLinePos[i]?.q!, r:_hitLinePos[i]?.r!, s:_hitLinePos[i]?.s!}, ballHeight:Height.GROUND}
        console.log(`hex: ${_hitLineHex[i]?.position.q}, ${_hitLineHex[i]?.position.r}, ${_hitLineHex[i]?.position.s} GROUND`) // for debugging
        i++;
      }
    }
    else if (launchAngle === Height.AIR) {
      while (i < _hitLinePos.length) {
        if (i <= _hitLinePos.length/1.4) { // these hexes AIR
          _hitLineHex[i] = {position:{q:_hitLinePos[i]?.q!, r:_hitLinePos[i]?.r!, s:_hitLinePos[i]?.s!}, ballHeight:Height.AIR}
          console.log(`hex: ${_hitLineHex[i]?.position.q}, ${_hitLineHex[i]?.position.r}, ${_hitLineHex[i]?.position.s} AIR`) // for debugging
          i++;
        }
        else if (i > _hitLinePos.length/1.4) { // these hexes GROUND
          _hitLineHex[i] = {position:{q:_hitLinePos[i]?.q!, r:_hitLinePos[i]?.r!, s:_hitLinePos[i]?.s!}, ballHeight:Height.GROUND}
          console.log(`hex: ${_hitLineHex[i]?.position.q}, ${_hitLineHex[i]?.position.r}, ${_hitLineHex[i]?.position.s} GROUND`) // for debugging
          i++;
        }
      }
    }
    else if (launchAngle === Height.HIGH) {
      while (i < _hitLinePos.length) {
        if (i === _hitLinePos.length-1) { // final position is GROUND
          _hitLineHex[i] = {position:{q:_hitLinePos[i]?.q!, r:_hitLinePos[i]?.r!, s:_hitLinePos[i]?.s!}, ballHeight:Height.GROUND}
          console.log(`hex: ${_hitLineHex[i]?.position.q}, ${_hitLineHex[i]?.position.r}, ${_hitLineHex[i]?.position.s} GROUND`) // for debugging
          i++;
        }
        if (i === _hitLinePos.length-2) { // Position 1 hex before final is AIR
          _hitLineHex[i] = {position:{q:_hitLinePos[i]?.q!, r:_hitLinePos[i]?.r!, s:_hitLinePos[i]?.s!}, ballHeight:Height.AIR}
          console.log(`hex: ${_hitLineHex[i]?.position.q}, ${_hitLineHex[i]?.position.r}, ${_hitLineHex[i]?.position.s} AIR`) // for debugging
          i++;
        }
        else if (i < _hitLinePos.length-2) { // all other hexes are HIGH
          _hitLineHex[i] = {position:{q:_hitLinePos[i]?.q!, r:_hitLinePos[i]?.r!, s:_hitLinePos[i]?.s!}, ballHeight:Height.HIGH}
          console.log(`hex: ${_hitLineHex[i]?.position.q}, ${_hitLineHex[i]?.position.r}, ${_hitLineHex[i]?.position.s} HIGH`) // for debugging
          i++;
        }
      }
    } 
    return {outCounter:0, pitchLogContents:retStrings, hitLine:_hitLineHex};
  }
  else {
    //log += `${batter.name} swings with ${_con_roll}, and it's a miss...`
    retStrings.push(`${batter.name} swings with ${_con_roll} contact, and it's a miss...\n`);
    retStrings.push(`${batter.name} strikes out!\n`);
    return {outCounter:1, pitchLogContents:retStrings, hitLine:[]};
  }
  //return {0,[]};
}

function hitDistanceCalc(str: number): number {
  let distance = 1;
  let i = 1;
  while (i < str) {
    if (i <= 10) {
      distance += 1;
    }
    else if (i <= 30) {
      if (i % 2 === 0) {
        distance += 1;
      }
    }
    else if (i <= 60) {
      if (i % 3 === 0) {
        distance += 1;
      }
    }
    else if (i <= 100) {
      if (i % 4 ===0) {
        distance += 1;
      }
    }
    i++;
  }

  return distance;
}

function getHexesAtDistance(distance: number): Hex[] {
  let hexes: Hex[] = [];
  let isFilled: boolean = false;
  let i = 0;
  const l_corner = {position:{q:-distance, r:0, s:distance}, isFair:true};
  const center = {position:{q:0, r:-distance, s:distance}, isFair:true};
  const r_corner = {position:{q:distance, r:-distance, s:0}, isFair:true};

  const leftCenterLine: Position[] = hex_lineDraw(l_corner.position, center.position);
  const centerRightLine: Position[] = hex_lineDraw(center.position, r_corner.position);

  while (i < leftCenterLine.length) {
    hexes[i] = {position:leftCenterLine[i]!, ballHeight:0};
    i++;
  }
  let j = i;
  while (j < leftCenterLine.length + centerRightLine.length - 1) {
    if (!hexes.some(val => {
      return JSON.stringify(val) === JSON.stringify({position:centerRightLine[i - leftCenterLine.length]!, isFair:true})
    }))
    {
      hexes[j] = {position:centerRightLine[i - leftCenterLine.length]!, ballHeight:0};
      j++;
    }
    i++;
  }
  return hexes;
}

function fieldAction(batter: PlayerStateStruct, fieldTeam: PlayerStateStruct[], hitLine: Hex[], basesOccupied: BasesOccupied, outs: number, _gameData: GameDataStateStruct, isMyTeamField: boolean): FieldActionResults {

  let retStrings: string[] = [];
  let _baseResults = basesOccupied;
  let _outcounter = outs;
  let _runsCounter = 0;

  let activeFielder: PlayerStateStruct | undefined = undefined;
  let activeBallIndex: number = 0;
  //TODO: check for backup fielders in case first fielder misses
  if (hitLine.length >= 42) { // it's a homerun
    _runsCounter += 1;
    retStrings.push(`${batter.name} hits a Home Run!!!!!\n`);
    retStrings.push(`${batter.name} scores!!!\n`);
    if (_baseResults.first !== undefined) {
      _runsCounter += 1;
      retStrings.push(`${_baseResults.first.name} scores!!!\n`);
    }
    if (_baseResults.second !== undefined) {
      _runsCounter += 1;
      retStrings.push(`${_baseResults.second.name} scores!!!\n`);
    }
    if (_baseResults.third !== undefined) {
      _runsCounter += 1;
      retStrings.push(`${_baseResults.third.name} scores!!!\n`);
    }
  }
  else if (hitLine.length <= 2) {  // catcher should not field the ball unless it is hit less than 3 hexes
    activeFielder = fieldTeam[getPlayerIndex('C', undefined, fieldTeam)]// Catcher fields the ball
    activeBallIndex = 1;
  }
  else {
    let fieldersInRange = getFieldersInRange(fieldTeam, hitLine, _gameData, isMyTeamField);
    activeBallIndex = fieldersInRange.findIndex(f => f !== undefined && f!== null); // returns earliest index where a fielder can field ball
    activeFielder = activeBallIndex !== -1 ? fieldersInRange[activeBallIndex] : undefined;  // findIndex returns -1 if no fielder is in range
    //console.log(`activeBallIndex: ${activeBallIndex} fielder: ${activeFielder?.name}`)
  }
  
  if (activeFielder !== undefined) { // THERE IS A FIELDER IN RANGE
    //console.log(`${activeFielder.class} ${activeFielder?.name} attempts to field the ball at ${hitLine[activeBallIndex]?.position.q} ${hitLine[activeBallIndex]?.position.r} ${hitLine[activeBallIndex]?.position.s}`);
    retStrings.push(`${activeFielder.class} ${activeFielder?.name} attempts to field the ball at ${hitLine[activeBallIndex]?.position.q} ${hitLine[activeBallIndex]?.position.r} ${hitLine[activeBallIndex]?.position.s}\n`);
    // fielder's precision roll must beat the ball factor to successfully catch... TODO: skills/perks that upgrade fielder prec_roll
    let prec_mod = 1;
    if (activeFielder.class === 'P') { // P debuffed by 75%, because they were too powerful in defense
      prec_mod = 0.25;
    }
    let prec_roll: number = Math.floor(Math.random() * activeFielder.precision*prec_mod + 1); 
    let ball_factor: number = Math.floor(Math.random() * 15 + 1); 
    retStrings.push(`${activeFielder.class} ${activeFielder.name} rolls ${prec_roll} vs ball factor of ${ball_factor}\n`)
    //let basesEarned_batter = 0;
    let basesEarned: number[] = [0, 0, 0, 0]; // index 0=batter, 1=firstRunner, 2=secondRunner, 3=thirdRunner. basesEarned[2] refers to number of bases earned by _baseResults.second
    if (prec_roll >= ball_factor) { // FIELDER SUCCESSFULLY FIELDS BALL
      if (hitLine[activeBallIndex]?.ballHeight === Height.AIR) { // catch out in air TODO: if ball in outfield, try to tag up
        _outcounter += 1;
        retStrings.push(`${activeFielder.class} ${activeFielder.name} catches the ball in the air.\n`)
        retStrings.push(`That's an OUT!\n`)
      }
      else if (hitLine[activeBallIndex]?.ballHeight === Height.GROUND) { // FIELDED ON GROUND
        retStrings.push(`${activeFielder.class} ${activeFielder.name} fields the ball on the ground.\n`);
        
        let force_base = 1; // always a force out on first base
        basesEarned[0] = 1; // batter always goes for one base
        if (_baseResults.first !== undefined) { // if there is base runner on first, 
          basesEarned[1] = 1; // he's forced to go for one, 
          force_base = 2; // and there is a force out possibility on second
          if (_baseResults.second !== undefined) {
            basesEarned[2] = 1; // he's forced to go for one, 
            force_base = 3; // and there is a force out possibility on third
            if (_baseResults.third !== undefined) {
              basesEarned[3] = 1; // he's forced to go for home, 
              force_base = 4; // and there is a force out possibility on home
            }
          }
        }
        // TODO: allow runners without force to possibly run??? perk?
        /**
          let leadRunner = _baseResults.third !== undefined ? _baseResults.third : 
            (_baseResults.second !== undefined ? _baseResults.second :
              (_baseResults.first !== undefined ? _baseResults.first : undefined));
        */

        let throw_position: Position = {q:13,r:-13,s:0};
        if (_outcounter < 2) { // TODO: if there are 2 outs, fielder will attempt to throw out at first
          switch (force_base) {
            case 1: // fielder will throw to first
              throw_position = {q:13,r:-13,s:0};
              break;
            case 2: // throw to second
              throw_position = {q:0,r:-13,s:13};
              break;
            case 3: // throw to third
              throw_position = {q:-13,r:0,s:13};
              break;
            case 4: // throw home
              throw_position = {q:0,r:0,s:0};
              break;
          }
        }
        
        let distance = hex_distance(hitLine[activeBallIndex]!.position, throw_position); // TODO: change position thrown to based on active ball position
        let throwFactor: number = getThrowFactor(distance);
        //basesEarned_batter = 0;
        let str_roll_f: number = Math.floor(Math.random() * (activeFielder.strength*throwFactor) + 1); // fielder throws with strength*throwFactor
        if (force_base === 1) { // attempt to get the out at first
          let spd_roll_batter: number = Math.floor(Math.random() * batter.speed + 1);  // batter runs with speed
          retStrings.push(`${activeFielder.class} ${activeFielder.name} throws with a strength of ${str_roll_f} against ${batter.name}'s speed of ${spd_roll_batter}.\n`);
          if (str_roll_f <= spd_roll_batter) { // batter beats the throw at 1st
            // it's a single
            basesEarned[0] = 1;
          }
          else if (str_roll_f > spd_roll_batter) { // batter thrown out at 1st TODO: deal with other baserunners
            basesEarned[0] = 0;
            _outcounter += 1;
            retStrings.push(`${batter.name} is thrown out at 1st!\n`)
            retStrings.push(`That's an OUT!\n`) 
          }
        }
        else if (force_base === 2) { // attempt to get out at second... and maybe double play
          let spd_roll_1: number = Math.floor(Math.random() * _baseResults.first!.speed + 1);  // runner on first runs with speed
          retStrings.push(`${activeFielder.class} ${activeFielder.name} throws with a strength of ${str_roll_f} against ${_baseResults.first!.name}'s speed of ${spd_roll_1}.\n`);
          if (str_roll_f <= spd_roll_1) { // runner beats the throw at 2nd
            // it's a single
            basesEarned[0] = 1;
            basesEarned[1] = 1;
          }
          else if (str_roll_f > spd_roll_1) { // runner1 thrown out at 2nd
            basesEarned[1] = -1;
            _outcounter += 1;
            retStrings.push(`${_baseResults.first!.name} is thrown out at 2nd!\n`);
            retStrings.push(`That's an OUT!\n`); 
            if (_outcounter < 3) { // if still less than 3 outs, try for double play
              let spd_roll_batter: number = Math.floor(Math.random() * batter.speed + 1);  // batter runs with speed
              console.log('It is happening!!!')
              if (activeFielder.class === '1B' || activeFielder.class === '2B' || activeFielder.class === 'RF') {
                // SS has ball because he caught it at second
                //get index of SS
                throwFactor = getThrowFactor(13);
                let index_ss = fieldTeam.findIndex(v => v.class === 'SS');
                console.log(`activeFielder SS index: ${index_ss}`)
                activeFielder = fieldTeam[index_ss];
                console.log(`activeFielder shortstop? ${activeFielder?.class}`)
                console.log(`activeFielder shortstop? ${activeFielder?.name}`)
              }
              else {
                // 2B has ball because he caught it at second
                //get index of 2B
                throwFactor = getThrowFactor(13);
                let index_2b = fieldTeam.findIndex(v => v.class === '2B');
                console.log(`activeFielder 2B index: ${index_2b}`)
                activeFielder = fieldTeam[index_2b];
                console.log(`activeFielder 2B? ${activeFielder?.class}`)
                console.log(`activeFielder 2B? ${activeFielder?.name}`)
              }
              let str_roll_f: number = Math.floor(Math.random() * (activeFielder!.strength*throwFactor) + 1);
              retStrings.push(`${activeFielder!.class} ${activeFielder!.name} throws with a strength of ${str_roll_f} against ${batter.name}'s speed of ${spd_roll_batter}.\n`);
              if (str_roll_f <= spd_roll_batter) { // batter beats the throw at 1st
                basesEarned[0] = 1;
                retStrings.push(`${batter.name} beats the throw at 1st!\n`)
              }
              else if (str_roll_f > spd_roll_batter) { // batter thrown out at 1st
                basesEarned[0] = 0;
                _outcounter += 1;
                retStrings.push(`${batter.name} is thrown out at 1st!\n`)
                retStrings.push(`That's an OUT!\n`) 
                retStrings.push(`It's a double play!\n`) 
              }
            }
          }
        }
        else if (force_base === 3) { // attempt to get out at third... and maybe double play... or triple play
          let field_roll: number = 0;
          let spd_roll_2: number = Math.floor(Math.random() * _baseResults.second!.speed + 1);  // runner on second runs with speed
          if (activeFielder.class !== '3B'){
            field_roll = str_roll_f;  // fielder throws with strength*throwFactor
            retStrings.push(`${activeFielder.class} ${activeFielder.name} throws with a strength of ${field_roll} against ${_baseResults.second!.name}'s speed of ${spd_roll_2}.\n`);
          }
          else if (activeFielder.class === '3B') { // 3B runs to tag third instead of throwing
            field_roll = Math.floor(Math.random() * activeFielder.speed*throwFactor + 1); // 3B runs with speed*throwFactor
            retStrings.push(`${activeFielder.class} ${activeFielder.name} runs to tag third with a speed of ${field_roll} against ${_baseResults.second!.name}'s speed of ${spd_roll_2}.\n`);
          }
          
          if (field_roll <= spd_roll_2) { // runner beats the throw at 3rd
            // it's a single
            basesEarned[0] = 1;
            basesEarned[1] = 1;
            basesEarned[2] = 1;
          }
          else if (field_roll > spd_roll_2) { // runner2 thrown out at 3rd
            basesEarned[2] = -1;
            _outcounter += 1;
            retStrings.push(`${_baseResults.second!.name} is out at 3rd!\n`);
            retStrings.push(`That's an OUT!\n`); 
            if (_outcounter < 3) { // if still less than 3 outs, try for out at second
              let spd_roll_1: number = Math.floor(Math.random() * _baseResults.first!.speed + 1);  // runner1 runs with speed
              if (activeFielder.class !== '3B') {
                // 3B has ball because he caught it at third
                //get index of 3B
                throwFactor = getThrowFactor(13);
                let index_3b = fieldTeam.findIndex(v => v.class === '3B');
                activeFielder = fieldTeam[index_3b];
              }
              
              let str_roll_f: number = Math.floor(Math.random() * (activeFielder!.strength*throwFactor) + 1);
              retStrings.push(`${activeFielder!.class} ${activeFielder!.name} throws with a strength of ${str_roll_f} against ${_baseResults.first!.name}'s speed of ${spd_roll_1}.\n`);
              if (str_roll_f <= spd_roll_1) { // runner1 beats the throw at 2nd
                basesEarned[0] = 1;
                basesEarned[1] = 1;
                retStrings.push(`${_baseResults.first!.name} beats the throw at 2nd!\n`)
              }
              else if (str_roll_f > spd_roll_1) { // runner1 thrown out at 2nd
                basesEarned[1] = -1;
                _outcounter += 1;
                retStrings.push(`${_baseResults.first!.name} is thrown out at 2nd!\n`);
                retStrings.push(`That's an OUT!\n`); 
                retStrings.push(`It's a double play!\n`);
                if (_outcounter < 3) { // if still less than 3 outs, try for triple play
                  let spd_roll_batter: number = Math.floor(Math.random() * batter.speed + 1);  // batter runs with speed
                  // 2B has ball because he caught it at second
                  //get index of 2B
                  throwFactor = getThrowFactor(13);
                  let index_2b = fieldTeam.findIndex(v => v.class === '2B');
                  activeFielder = fieldTeam[index_2b];
                  let str_roll_f: number = Math.floor(Math.random() * (activeFielder!.strength*throwFactor) + 1);
                  retStrings.push(`${activeFielder!.class} ${activeFielder!.name} throws with a strength of ${str_roll_f} against ${batter.name}'s speed of ${spd_roll_batter}.\n`);
                  if (str_roll_f <= spd_roll_batter) { // batter beats the throw at 1st
                    basesEarned[0] = 1;
                    retStrings.push(`${batter.name} beats the throw at 1st!\n`)
                  }
                  else if (str_roll_f > spd_roll_batter) { // batter thrown out at 1st
                    basesEarned[0] = 0;
                    _outcounter += 1;
                    retStrings.push(`${batter.name} is thrown out at 1st!\n`)
                    retStrings.push(`That's an OUT!\n`) 
                    retStrings.push(`Holy Moly! It's a triple play!\n`) 
                  }
                }
              }
            }
          }
        }
        else if (force_base === 4) { // attempt to get out at home... and maybe double play... or triple play
          let field_roll: number = str_roll_f;
          let spd_roll_3: number = Math.floor(Math.random() * _baseResults.third!.speed + 1);  // runner on third runs with speed
          if (activeFielder.class !== 'C'){
            field_roll = str_roll_f;  // fielder throws with strength*throwFactor
            retStrings.push(`${activeFielder.class} ${activeFielder.name} throws with a strength of ${field_roll} against ${_baseResults.third!.name}'s speed of ${spd_roll_3}.\n`);
          }
          else if (activeFielder.class === 'C') { // C runs to tag home instead of throwing
            field_roll = Math.floor(Math.random() * activeFielder.speed*throwFactor + 1); // C runs with speed*throwFactor
            retStrings.push(`${activeFielder.class} ${activeFielder.name} runs to tag home with a speed of ${field_roll} against ${_baseResults.third!.name}'s speed of ${spd_roll_3}.\n`);
          }
          
          if (field_roll <= spd_roll_3) { // runner3 beats the throw at home
            // it's a single
            basesEarned[0] = 1;
            basesEarned[1] = 1;
            basesEarned[2] = 1;
            basesEarned[3] = 1;
          }
          else if (field_roll > spd_roll_3) { // runner3 thrown out at home
            basesEarned[3] = -1;
            _outcounter += 1;
            retStrings.push(`${_baseResults.third!.name} is out at home!\n`);
            retStrings.push(`That's an OUT!\n`); 
            if (_outcounter < 3) { // if still less than 3 outs, try for out at third
              let spd_roll_2: number = Math.floor(Math.random() * _baseResults.second!.speed + 1);  // runner2 runs with speed
              if (activeFielder.class !== 'C') {
                // C has ball because he caught it at home
                //get index of C
                throwFactor = getThrowFactor(13);
                let index_c = fieldTeam.findIndex(v => v.class === 'C');
                activeFielder = fieldTeam[index_c];
              }
              let str_roll_f: number = Math.floor(Math.random() * (activeFielder!.strength*throwFactor) + 1);
              retStrings.push(`${activeFielder!.class} ${activeFielder!.name} throws with a strength of ${str_roll_f} against ${_baseResults.second!.name}'s speed of ${spd_roll_2}.\n`);
              if (str_roll_f <= spd_roll_2) { // runner2 beats the throw at 3rd
                basesEarned[0] = 1;
                basesEarned[1] = 1;
                basesEarned[2] = 1;
                retStrings.push(`${_baseResults.second!.name} beats the throw at 3rd!\n`)
              }
              else if (str_roll_f > spd_roll_2) { // runner2 thrown out at 3rd
                basesEarned[2] = -1;
                _outcounter += 1;
                retStrings.push(`${_baseResults.second!.name} is thrown out at 3rd!\n`);
                retStrings.push(`That's an OUT!\n`); 
                retStrings.push(`It's a double play!\n`);
                if (_outcounter < 3) { // if still less than 3 outs, try for triple play at 2nd
                  let spd_roll_1: number = Math.floor(Math.random() * _baseResults.first!.speed + 1);  // runner1 runs with speed
                  // 3B has ball because he caught it at third
                  //get index of 3B
                  throwFactor = getThrowFactor(13);
                  let index_3b = fieldTeam.findIndex(v => v.class === '3B');
                  activeFielder = fieldTeam[index_3b];
                  
                  let str_roll_f: number = Math.floor(Math.random() * (activeFielder!.strength*throwFactor) + 1);
                  retStrings.push(`${activeFielder!.class} ${activeFielder!.name} throws with a strength of ${str_roll_f} against ${_baseResults.first!.name}'s speed of ${spd_roll_1}.\n`);
                  if (str_roll_f <= spd_roll_1) { // runner1 beats the throw at 2nd
                    basesEarned[0] = 1;
                    basesEarned[1] = 1;
                    retStrings.push(`${_baseResults.first!.name} beats the throw at 2nd!\n`)
                  }
                  else if (str_roll_f > spd_roll_1) { // runner1 thrown out at 2nd
                    basesEarned[1] = -1;
                    _outcounter += 1;
                    retStrings.push(`${_baseResults.first!.name} is thrown out at 2nd!\n`);
                    retStrings.push(`That's an OUT!\n`); 
                    retStrings.push(`Well I'll be! It's a triple play!\n`);
                  }
                }
              }
            }
          }
        }
      } 
    }
    else { // FIELDER MISSED THE CATCH
      retStrings.push(`${activeFielder.class} ${activeFielder.name} missed the catch.\n`);

      let force_base = 1; // always a force out on first base
      basesEarned[0] = 1; // batter always goes for one base
      if (_baseResults.first !== undefined) { // if there is base runner on first, 
        basesEarned[1] = 1; // he's forced to go for one, 
        force_base = 2; // and there is a force out possibility on second
        if (_baseResults.second !== undefined) {
          basesEarned[2] = 1; // he's forced to go for one, 
          force_base = 3; // and there is a force out possibility on third
          if (_baseResults.third !== undefined) {
            basesEarned[3] = 1; // he's forced to go for home, 
            force_base = 4; // and there is a force out possibility on home
          }
        }
      }
      
      // limit runners basesEarned to maximum of bases earned by runner ahead of them
      if (_baseResults.third !== undefined) { // if there is runner on third, limit all other runners
        if (basesEarned[2]! > basesEarned[3]!) {
          basesEarned[2]! = basesEarned[3]!;
        }
        if (basesEarned[1]! > basesEarned[3]!+1) {
          basesEarned[1]! = basesEarned[3]!+1;
        }
        if (basesEarned[0]! > basesEarned[3]!+2) {
          basesEarned[0]! = basesEarned[3]!+2;
        }
      }
      if (_baseResults.second !== undefined) { // if there is runner on second, limit 1st and batter runners
        if (basesEarned[1]! > basesEarned[2]!) {
          basesEarned[1]! = basesEarned[2]!;
        }
        if (basesEarned[0]! > basesEarned[2]!+1) {
          basesEarned[0]! = basesEarned[2]!+1;
        }
      }
      if (_baseResults.first !== undefined) { // if there is runner on first, limit batter run
        if (basesEarned[0]! > basesEarned[1]!) {
          basesEarned[0]! = basesEarned[1]!;
        }
      }

      let distance = hex_distance(hitLine[activeBallIndex]!.position, {q:0,r:-13,s:13}); // TODO: change position thrown to based on active ball position
      let throwFactor: number = getThrowFactor(distance);
      let str_roll_f: number = Math.floor(Math.random() * (activeFielder.strength*throwFactor) + 1); // fielder throws with strength*throwfactor
      let spd_roll_batter: number = Math.floor(Math.random() * batter.speed + 1);  // batter runs with speed
      retStrings.push(`${activeFielder.class} ${activeFielder.name} throws with a strength of ${str_roll_f} against ${batter.name}'s speed of ${spd_roll_batter}.\n`);
      if (str_roll_f <= spd_roll_batter) { // batter runs for double and beats the throw
        basesEarned[0] += 1; // all runners advance an extra base
        basesEarned[1] += 1;
        basesEarned[2] += 1;
        basesEarned[3] += 1;
      }
      else if (str_roll_f > spd_roll_batter) { // held to single w/ no chance of throw out
        //basesEarned_batter = 1; 
      }
    }
    if (_outcounter < 3) {
      // GET HITS ON SCOREBOARD
      _runsCounter += updateScoreboard(basesEarned, retStrings, batter, _baseResults, _runsCounter);
    }
    //retStrings.push(`Runners on base: 1: ${_baseResults.first} | 2: ${_baseResults.second} | 3: ${_baseResults.third}\n`)
  }

  else if (activeFielder === undefined) { // THERE IS NO FIELDER IN RANGE
    let nearFielder_and_turns: {player:PlayerStateStruct, num_turns:number} = getNearestFielder(hitLine[hitLine.length-1]!, fieldTeam, _gameData, isMyTeamField);
    let nearFielder = nearFielder_and_turns.player;
    let num_turns = nearFielder_and_turns.num_turns;
    //let leadRunner = _baseResults.third !== undefined ? _baseResults.third : 
      //(_baseResults.second !== undefined ? _baseResults.second :
        // (_baseResults.first !== undefined ? _baseResults.first : undefined))
    //console.log(`leadRunner is ${leadRunner?.name}`); // for debugging

    let spd_runningTotals: {batterTot: number, firstTot: number, secondTot: number, thirdTot: number} = {batterTot: 0, firstTot: 0, secondTot: 0, thirdTot: 0};
    let basesEarned: number[] = [0, 0, 0, 0]; // index 0=batter, 1=firstRunner, 2=secondRunner, 3=thirdRunner. basesEarned[2] refers to number of bases earned by _baseResults.second
    // for each turn the fielder takes to get to the ball, each runner rolls speed. 
    // The running totals decide how many bases each runner goes (limited by lead runner)
    let base_run_threshold = 50;
    for (let i=0; i<num_turns; i++) {  
      if (_baseResults.third !== undefined) {
        spd_runningTotals.thirdTot += Math.floor(Math.random() * _baseResults.third.speed + 1);
        if (spd_runningTotals.thirdTot >= base_run_threshold) {
          //basesEarned.thirdTot += 1;  // once threshold is reached, add 1 to bases earned for this runner
          basesEarned[3] += 1;
          spd_runningTotals.thirdTot = 0; // reset running total after reaching threshold
        }
      }
      if (_baseResults.second !== undefined) {
        spd_runningTotals.secondTot += Math.floor(Math.random() * _baseResults.second.speed + 1);
        if (spd_runningTotals.secondTot >= base_run_threshold) {
          //basesEarned.secondTot += 1;
          basesEarned[2] += 1;
          spd_runningTotals.secondTot = 0;
        }
      }
      if (_baseResults.first !== undefined) {
        spd_runningTotals.firstTot += Math.floor(Math.random() * _baseResults.first.speed + 1);
        if (spd_runningTotals.firstTot >= base_run_threshold) {
          //basesEarned.firstTot += 1;
          basesEarned[1] += 1;
          spd_runningTotals.firstTot = 0;
        }
      }
      spd_runningTotals.batterTot += Math.floor(Math.random() * batter.speed + 1);
      if (spd_runningTotals.batterTot >= base_run_threshold) {
        //basesEarned.batterTot += 1;
        basesEarned[0] += 1;
        spd_runningTotals.batterTot = 0;
      }
    }
    // limit runners basesEarned to maximum of bases earned by runner ahead of them
    if (_baseResults.third !== undefined) { // if there is runner on third, limit all other runners
      if (basesEarned[2]! > basesEarned[3]!) {
        basesEarned[2]! = basesEarned[3]!;
      }
      if (basesEarned[1]! > basesEarned[3]!+1) {
        basesEarned[1]! = basesEarned[3]!+1;
      }
      if (basesEarned[0]! > basesEarned[3]!+2) {
        basesEarned[0]! = basesEarned[3]!+2;
      }
    }
    if (_baseResults.second !== undefined) { // if there is runner on second, limit 1st and batter runners
      if (basesEarned[1]! > basesEarned[2]!) {
        basesEarned[1]! = basesEarned[2]!;
      }
      if (basesEarned[0]! > basesEarned[2]!+1) {
        basesEarned[0]! = basesEarned[2]!+1;
      }
    }
    if (_baseResults.first !== undefined) { // if there is runner on first, limit batter run
      if (basesEarned[0]! > basesEarned[1]!) {
        basesEarned[0]! = basesEarned[1]!;
      }
    }
    // TDO: IF FIELDED IN INFIELD, DON'T AUTOMATICALLY GET 1 BASE or even if in outfield... I think...
      basesEarned[0] += 1; // all runners advance at least one base
      basesEarned[1] += 1;
      basesEarned[2] += 1;
      basesEarned[3] += 1;      
      let baseRunners: (PlayerStateStruct | undefined)[] = [batter, _baseResults.first, _baseResults.second, _baseResults.third];
      let doesRunnerExistButDidNotScore: boolean[] = [true, true, true, true]; // index 0=batter, 1=firstrunner, 2=secondrunner, 3=thirdrunner
      if (_baseResults.third !== undefined) { // this is horrible. TODO: do this in a way that isn't so horrible
        if (basesEarned[3]! >= 1) {
          doesRunnerExistButDidNotScore[3] = false;
        }
      }
      else if (_baseResults.third === undefined) {
        doesRunnerExistButDidNotScore[3] = false;
      }
      if (_baseResults.second !== undefined) {
        if (basesEarned[2]! >= 2) {
          doesRunnerExistButDidNotScore[2] = false;
        }
      }
      else if (_baseResults.second === undefined) {
        doesRunnerExistButDidNotScore[2] = false;
      }
      if (_baseResults.first !== undefined) {
        if (basesEarned[1]! >= 3) {
          doesRunnerExistButDidNotScore[1] = false;
        }
      }
      else if (_baseResults.first === undefined) {
        doesRunnerExistButDidNotScore[1] = false;
      }
      if (basesEarned[0]! >= 4) {
        doesRunnerExistButDidNotScore[0] = false;
      }
      let highestIndex = 0;
      for (let i=0; i<doesRunnerExistButDidNotScore.length; i++) {
        if (doesRunnerExistButDidNotScore[i] === true) {
          highestIndex = i;
        }
      }
      let leadRunnerNow = baseRunners[highestIndex];
      //let leadRunnerNow = highestIndex===3  ? _baseResults.third : (highestIndex===2  ? _baseResults.second : (highestIndex===1  ? _baseResults.first : batter));
  
      let base_to_throw: number = basesEarned[highestIndex]! + highestIndex + 1; // the base to throw to to attempt to get leadRunner out
      let throw_position: Position = {q:13,r:-13,s:0};
      if (_outcounter < 2) { // TODO: if there are 2 outs, fielder will attempt to throw out at first
        switch (base_to_throw) {
          case 1: // fielder will throw to first
            throw_position = {q:13,r:-13,s:0};
            break;
          case 2: // throw to second
            throw_position = {q:0,r:-13,s:13};
            break;
          case 3: // throw to third
            throw_position = {q:-13,r:0,s:13};
            break;
          case 4: // throw home
            throw_position = {q:0,r:0,s:0};
            break;
        }
      }
      //TODO: if throwFacter is > 2, do not run for extra bases
      let ball_factor: number = Math.floor(Math.random() * 15 + 1); 
      let distance = hex_distance(hitLine[hitLine.length-1]!.position, throw_position); // get distance between fielder and base he's throwing to
      let throwFactor: number = getThrowFactor(distance); // debuff this throwFacter based on numTurns?
      //let distanceFactor: number = getDistanceFactor(distance); // or buff distanceFacter by numTurns?
      let str_roll_of: number = Math.floor(Math.random() * nearFielder.strength*throwFactor + 1); // OF throws with strength*throwFactor
      let spd_roll_runner: number = Math.floor(Math.random() * leadRunnerNow!.speed + 1);  // runner runs with speed
      retStrings.push(`The ball comes to a rest at position ${hitLine[hitLine.length-1]!.position.q}, ${hitLine[hitLine.length-1]!.position.r}, ${hitLine[hitLine.length-1]!.position.s}\n`)
      retStrings.push(`${nearFielder.name} recovers the ball in ${num_turns} turns.\n`)
      retStrings.push(`${nearFielder.name} rolls throw strength of ${str_roll_of} vs ${leadRunnerNow?.name}'s speed roll of ${spd_roll_runner} with a ball factor of ${ball_factor}\n`)
      if (str_roll_of <= spd_roll_runner) { // lead runner and trailing runners get an extra base
        basesEarned[0] += 1; //TODO: only need to increment lead runner and trailing runners
        basesEarned[1] += 1;
        basesEarned[2] += 1;
        basesEarned[3] += 1;
      }
      else if (str_roll_of > spd_roll_runner) {
        // TODO: factor precision into this somehow. As it is, str is too powerful for defense
        if (str_roll_of >= (spd_roll_runner+ball_factor)*2 && str_roll_of > 30) { // critical running error! Thrown out. 
          let _base = basesEarned[highestIndex]! + highestIndex + 1;
          _outcounter += 1;
          basesEarned[highestIndex] = -1;
          console.log(`there are ${_outcounter} outs\n`)
          retStrings.push(`${leadRunnerNow?.name} is thrown out at base ${_base}\n`)
          //basesEarned[highestIndex] = 0; // lead runner was thrown out, but trailing runners still advance +1
          retStrings.push(`That's an OUT!\n`)
        }
        else { // held to bases earned while fielder was trying to get to the ball
          let _base = basesEarned[highestIndex]! + highestIndex;
          retStrings.push(`${leadRunnerNow?.name} was held to base ${_base}\n`)
        }
      }
      // TODO: WHAT IF PLAYER SCORES BUT THEN OTHER RUNNER GETS OUT 3???
    console.log(`NOW there are ${_outcounter} outs\n`)
    if (_outcounter < 3) { 
      // get hits on scoreboard
      _runsCounter += updateScoreboard(basesEarned, retStrings, batter, _baseResults, _runsCounter);
    }   
    //retStrings.push(`Runners on base: 1: ${_baseResults.first} | 2: ${_baseResults.second} | 3: ${_baseResults.third}\n`)
  }
  return {outCounter: _outcounter, fieldActionLogContents: retStrings, baseResults: _baseResults, runsScored: _runsCounter}
  //return {outCounter:0, fieldActionLogContents: [], baseResults: {first:'', second:'', third:''}, runsScored: 0}
}

function getFieldersInRange(fieldTeam: PlayerStateStruct[], hitLine: Hex[], _gameData: GameDataStateStruct, isMyTeam: boolean): PlayerStateStruct[] {
  let fielders: PlayerStateStruct[] = [];
  //type FieldPositions = '1B' | '2B' | 'SS' | '3B' | 'CF' | 'LF' | 'RF' | 'C' | 'P' 
  let fielderHexPos: Record<FieldPositions, Position> = {
    '1B': {q:12,r:-15,s:3},
    '2B': {q:6,r:-15,s:9},
    'SS': {q:-4,r:-11,s:15},
    '3B': {q:-12,r:-3,s:15},
    'CF': {q:0,r:-25,s:25},
    'LF': {q:-14,r:-10,s:24},
    'RF': {q:14,r:-24,s:10},
    'C': {q:0,r:0,s:0},
    'P': {q:0,r:-7,s:7}
  }
  if (isMyTeam === true) {
    fielderHexPos = _gameData.fielderHexPos;
  }

  for (let i=1; i < hitLine.length; i++) { // for each hex the ball passes through
    fieldTeam.forEach((fielder) => {  // for each fielder
      if (hitLine[i]?.ballHeight !== Height.HIGH) { // if the ball at this hex is not high
        let dist = hex_distance(fielderHexPos[fielder.class as FieldPositions], hitLine[i]?.position!)
        // Corner IF can move 2 hex to snag passing ball
        if (fielder.class === '1B' || fielder.class === '3B') {
          if (dist <= 2) {
            //fielders.push(fielder);
            fielders[i] = fielder;
            // need to "break" so we don't push same fielder for multiple hitline positions
          }
        }
        // Middle IF can move 3 hex to snag passing ball
        if (fielder.class === '2B' || fielder.class === 'SS') {
          if (dist <= 3) {
            //fielders.push(fielder);
            fielders[i] = fielder;
          }
        }
        // OF can move 5 hex to snag passing ball
        if (fielder.class === 'LF' || fielder.class === 'RF' || fielder.class === 'CF') {
          if (dist <= 5) {
            //fielders.push(fielder);
            fielders[i] = fielder;
          }
        }
        if (fielder.class === 'P') { // should P reaction range be 1 or 2?
          if (dist <= 2) {
            //fielders.push(fielder);
            fielders[i] = fielder;
          }
        }
      }
    })
    }    
  return fielders;
}

function getThrowFactor(distance: number): number {
  if (distance <= 2) return 3;
  else if (distance <= 7) return 2;
  else if (distance <= 15) return 1.5;
  else if (distance <= 25) return 1.0;
  else if (distance <= 35) return 0.7;
  else return 0.5;
}

function getNearestFielder(ball_hex: Hex, _fieldTeam: PlayerStateStruct[], _gameData: GameDataStateStruct, isMyTeam: boolean): {player:PlayerStateStruct, num_turns:number} { //TODO may have errors
  let fielderHexPos: Record<FieldPositions, Position> = {
    '1B': {q:12,r:-15,s:3},
    '2B': {q:6,r:-15,s:9},
    'SS': {q:-4,r:-11,s:15},
    '3B': {q:-12,r:-3,s:15},
    'CF': {q:0,r:-25,s:25},
    'LF': {q:-14,r:-10,s:24},
    'RF': {q:14,r:-24,s:10},
    'C': {q:0,r:0,s:0},
    'P': {q:0,r:-7,s:7}
  }
  if (isMyTeam === true) {
    fielderHexPos = _gameData.fielderHexPos;
  }

  let player_turns: {_dist: number, _turns: number, index: number}[] =[]
  for (let i=0; i<_fieldTeam.length; i++) {
    let moves_per_turn = getMoveSpeed(_fieldTeam[i]!)
    let distance = hex_distance(fielderHexPos[_fieldTeam[i]?.class as FieldPositions], ball_hex.position)
    let turns_this_player = Math.ceil(distance/moves_per_turn)
    player_turns[i] = {_dist: distance, _turns: turns_this_player, index: i}; // index property preserves original index to put into _fieldTeam
  }
  player_turns = player_turns.sort((a, b) => { // get players in order of least turns to greatest
    if (b._turns > a._turns) return -1;
    if (b._turns < a._turns) return 1;
    return 0;
  });

  let min_turns = player_turns[0]?._turns;
  let players_to_return: {distance: number, index: number}[] =[]; // these players have same number of turns
  for (let i=0; i<player_turns.length; i++) {
    if (player_turns[i]?._turns === min_turns) { // if this player takes the least amount of turns
      players_to_return[i] = {distance: player_turns[i]?._dist!, index: player_turns[i]?.index!}
    }
  }
  players_to_return = players_to_return.sort((a, b) => { // get players in order of least distance to greatest
    if (b.distance > a.distance) return -1;
    if (b.distance < a.distance) return 1;
    return 0;
  });

  return {player: _fieldTeam[players_to_return[0]?.index!]!, num_turns: min_turns as number}
}

function getMoveSpeed(_player: PlayerStateStruct): number {
  let moves = 0;
  if (_player.class === 'LF' || _player.class === 'CF' || _player.class === 'RF') {
    let i = 1;
    while (i < _player.speed) {
      if (i <= 10) {
        if (i % 2 === 0) {
          moves += 1;
        } 
      }
      else if (i <= 30) {
        if (i % 10 === 0) {
          moves += 1;
        }
      }
      else if (i <= 69) {
        if (i % 13 === 0) {
          moves += 1;
        }
      }
      else if (i <= 180) {
        if (i % 20 ===0) {
          moves += 1;
        }
      }
      i++;
    }
  }
  else if (_player.class === '1B' || _player.class === '2B' || _player.class === 'SS' || _player.class === '3B' || _player.class === 'C') {
    let i = 1;
    while (i < _player.speed) {
      if (i <= 9) {
        if (i % 3 === 0) {
          moves += 1;
        } 
      }
      else if (i <= 49) {
        if (i % 20 === 0) {
          moves += 1;
        }
      }
      else if (i <= 99) {
        if (i % 25 === 0) {
          moves += 1;
        }
      }
      else if (i <= 160) {
        if (i % 30 ===0) {
          moves += 1;
        }
      }
      i++;
    }
  }
  return moves;
}

/*
//  UpdateScoreboard only needs to return the number of runs scored. 
//  Input parameters retStrings and _baseResults are directly mutated, so they don't need to be returned.
*/
function updateScoreboard(_basesEarned: number[], _retStrings: string[], _batter: PlayerStateStruct, __baseResults: BasesOccupied, __runsCounter: number): number { 
  let _runsCounter_ = __runsCounter;

  // runners that got out should be removed from baseResults NOT SURE IF NEEDED
  if (_basesEarned[1] === -1) {
    __baseResults.first = undefined;
  }
  if (_basesEarned[2] === -1) {
    __baseResults.second = undefined;
  }
  if (_basesEarned[3] === -1) {
    __baseResults.third = undefined;
  }

  if (_basesEarned[0] === 1) {
    _retStrings.push(`${_batter.name} hits a single.\n`)
  }
  if (_basesEarned[0] === 2) {
    _retStrings.push(`${_batter.name} hits a double.\n`)
  }
  if (_basesEarned[0] === 3) {
    _retStrings.push(`${_batter.name} hits a triple.\n`)
  }

  let r_1 = __baseResults.first;
  let r_2 = __baseResults.second;
  let r_3 = __baseResults.third;
  if (__baseResults.third !== undefined) { // if there was a runner on third before the hit
    if (_basesEarned[3]! >= 1) {// if he earned at least 1 base, then he scored
      _runsCounter_ += 1;
      _retStrings.push(`${__baseResults.third.name} scores!!!\n`);
      __baseResults.third = undefined;
    }
  }
  if (__baseResults.second !== undefined) { // if there was a runner on second before the hit
    if (_basesEarned[2]! >= 2) {// if he earned at least 2 bases, then he scored
      _runsCounter_ += 1;
      _retStrings.push(`${__baseResults.second.name} scores!!!\n`);
      __baseResults.second = undefined;
    }
    else if (_basesEarned[2]! === 1) {
      _retStrings.push(`${__baseResults.second.name} advances to third base.\n`);
      __baseResults.third = r_2;
      __baseResults.second = undefined;
    }
  }
  if (__baseResults.first !== undefined) { // if there was a runner on first before the hit
    if (_basesEarned[1]! >= 3) {// if he earned at least 3 bases, then he scored
      _runsCounter_ += 1;
      _retStrings.push(`${__baseResults.first.name} scores!!!\n`);
      __baseResults.first = undefined;
    }
    else if (_basesEarned[1]! === 2) {
      _retStrings.push(`${__baseResults.first.name} advances to third base.\n`);
      __baseResults.third = r_1;
      __baseResults.first = undefined;
    }
    else if (_basesEarned[1]! === 1) {
      _retStrings.push(`${__baseResults.first.name} advances to second base.\n`);
      __baseResults.second = r_1;
      __baseResults.first = undefined;
    }
  }
  if (_basesEarned[0]! >= 4) {// if he earned at least 4 bases, then he scored
    _runsCounter_ += 1;
    _retStrings.push(`${_batter.name} hits a Home Run!!!!!\n`);
    _retStrings.push(`${_batter.name} scores!!!\n`);
  }
  else if (_basesEarned[0]! === 3) {
    _retStrings.push(`${_batter.name} advances to third base.\n`);
    __baseResults.third = _batter;
  }
  else if (_basesEarned[0]! === 2) {
    _retStrings.push(`${_batter.name} advances to second base.\n`);
    __baseResults.second = _batter;
  }
  else if (_basesEarned[0]! === 1) {
    _retStrings.push(`${_batter.name} advances to first base.\n`);
    __baseResults.first = _batter;
  }
  return _runsCounter_; 
}


