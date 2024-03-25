import { Player, Team } from "@prisma/client";
import { Console } from "console";
import { randomUUID } from "crypto";
import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";
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
    classLvl: number,
    focusStat: StatFocus, // StatFocus enum
    stats_season: playerMatchStats,
    stats_career: playerMatchStats,
}
interface playerMatchStats {
  at_bats: number,
  runs: number,
  walks: number,
  hits: number,
  doubles: number,
  triples: number,
  home_runs: number,
  rbi: number,
  strike_outs: number,
  errors: number,
  assists: number,
  putouts: number,
  k: number,
  walks_allowed: number,
  ip: number,
  runs_allowed: number
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
  playersJson: PlayerStateStruct[],
}

interface LeagueStateStruct {
  id: string,
  name: string,
  teams: TeamStateStruct[],
  schedule: { [key: number]: Matchup[]} // key is the week number and Matchup[] holds list of games for that week
}

interface GameDataStateStruct {
  //league: LeagueStateStruct,
  leagueId: string,
  leagueName: string,
  myTeamId: string,
  season: number,
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

enum StatFocus {
  STRENGTH = 0,
  SPEED = 1,
  PRECISION = 2,
  CONTACT = 3
}

interface Matchup { // store teamId of competing teams
  homeTeam: string,
  awayTeam: string
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

//type FieldPositions = '1B' | '2B' | 'SS' | '3B' | 'CF' | 'LF' | 'RF' | 'C' | 'P' ;

export default function Home() {
  //const [playerInfo, setPlayerInfo] = useState<PlayerStateStruct[]>([]);
  //const [teamInfo, setTeamInfo] = useState<TeamStateStruct>();
  const [leagueInfo, setLeagueInfo] = useState<LeagueStateStruct>({
    id: '',
    name: '',
    teams: [],
    schedule: {}
  });
  // LEAGUE TABLE STATE
  const [isLeagueTableActive, setIsLeagueTableActive] = useState<boolean>(true);

  const [gameData, setGameData] = useState<GameDataStateStruct>({
    //league: {id: '', name: '', teams: []},
    leagueId: '',
    leagueName: '',
    myTeamId: '',
    season: 1,
    week: 0,
    phase: 0,
    teams: [],
    schedule: {},
    fielderHexPos: default_fielderHexPos
  });
  const [isPlayingGame, setIsPlayingGame] = useState<boolean>(false);
  const [preGamePlayerStats, setPreGamePlayerStats] = useState<PlayerStateStruct[]>([])
  // This preserves state of isPlayingGame and gameData on refresh
  // cannot test locally if React strict mode is enabled
  useEffect(() => {
    const data_isPlayingGame = window.localStorage.getItem('isPlayingGame');
    if (data_isPlayingGame !== null) setIsPlayingGame(JSON.parse(data_isPlayingGame));

    const data_gameData = window.localStorage.getItem('gameData');
    if (data_gameData !== null) setGameData(JSON.parse(data_gameData));

    const data_preGamePlayerStats = window.localStorage.getItem('preGamePlayerStats');
    if (data_preGamePlayerStats !== null) setPreGamePlayerStats(JSON.parse(data_preGamePlayerStats));
  }, [])   

  useEffect(() => {
    window.localStorage.setItem('isPlayingGame', JSON.stringify(isPlayingGame));

    window.localStorage.setItem('gameData', JSON.stringify(gameData));

    window.localStorage.setItem('preGamePlayerStats', JSON.stringify(preGamePlayerStats));
  }, [isPlayingGame, gameData, preGamePlayerStats])
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

  const [selectedTeam, setSelectedTeam] = useState(0);
  const [leagueNameInput, setLeagueNameInput] = useState<string>('');
  const [teamNameInput, setTeamNameInput] = useState<string>('');
  const [warningTextLeague, setWarningTextLeague] = useState<string>('');
  const [warningTextTeam, setWarningTextTeam] = useState<string>('');

  // set hook functions as const so it can be used inside event handler
  const createLeagueConst = api.league.create.useMutation(); 
  const createTeamConst = api.team.create.useMutation(); 
  const createPlayerConst = api.player.create.useMutation(); 

// FUNCTIONS HERE USE REACT HOOKS
  const router = useRouter(); // used to navigate to Home Page
  function createLeague (e: FormEvent) {
    e.preventDefault(); // prevent page from refreshing on submit
    // ensure inputs are not empty
    if (leagueNameInput == null || leagueNameInput.trim().length === 0) {
      setWarningTextLeague('League Name cannot be blank!')
      if (teamNameInput == null || teamNameInput.trim().length === 0) {
        setWarningTextTeam('Team Name cannot be blank!')
      }
      else {
        setWarningTextTeam('')
      }
      return;
    }
    else {
      setWarningTextLeague('')
    }
    if (teamNameInput == null || teamNameInput.trim().length === 0) {
      setWarningTextTeam('Team Name cannot be blank!')
      return;
    }
    else {
      setWarningTextTeam('')
    }
    //
    
    setSelectedTeam(1);
    const numTeams: number = 30;
    let m: number = 0;
    let teamsToAdd: TeamStateStruct[] = [];
    let teamNamesUsed: string[] = [];
    while (m < numTeams)
    {
      let newPlayers: PlayerStateStruct[] = [];
      const numPlayers: number = 9;
      let team_lvl_min = 15;
      let team_lvl_max = 40;
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
          classLvl: 0, 
          focusStat: 0,
          stats_season: {
            at_bats: 0,
            runs: 0,
            walks: 0,
            hits: 0,
            doubles: 0,
            triples: 0,
            home_runs: 0,
            rbi: 0,
            strike_outs: 0,
            errors: 0,
            assists: 0,
            putouts: 0,
            k: 0,
            walks_allowed: 0,
            ip: 0,
            runs_allowed: 0  
          },
          stats_career: {
            at_bats: 0,
            runs: 0,
            walks: 0,
            hits: 0,
            doubles: 0,
            triples: 0,
            home_runs: 0,
            rbi: 0,
            strike_outs: 0,
            errors: 0,
            assists: 0,
            putouts: 0,
            k: 0,
            walks_allowed: 0,
            ip: 0,
            runs_allowed: 0  
          },
        }
        const classesProclivities: {[key: string]: Proclivity} = {
          '1B': proclivitiesArr[Math.floor(Math.random() * 6)]!,
          '2B': proclivitiesArr[Math.floor(Math.random() * 6)]!,
          'SS': proclivitiesArr[Math.floor(Math.random() * 6)]!,
          '3B': proclivitiesArr[Math.floor(Math.random() * 6)]!,
          'CF': proclivitiesArr[Math.floor(Math.random() * 6)]!,
          'LF': proclivitiesArr[Math.floor(Math.random() * 6)]!,
          'RF': proclivitiesArr[Math.floor(Math.random() * 6)]!,
          'C': proclivitiesArr[Math.floor(Math.random() * 6)]!,
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
        newPlayer.level = Math.floor(Math.random() * (team_lvl_max-team_lvl_min+1) + team_lvl_min); // random lvl between 30 and 5
        if (m % 2) {
          team_lvl_max += 3;
        }
        if (m % 3) {
          team_lvl_min += 2
        }
        if (m === 0) {
          team_lvl_max = 30;
          team_lvl_min = 10;
        }
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
        }
        // add stat proclivities based on initial stats
        newPlayer.strengthPot = class_stat_proclivities?.strength!;
        newPlayer.speedPot = class_stat_proclivities?.speed!;
        newPlayer.precisionPot = class_stat_proclivities?.precision!;
        newPlayer.contactPot = class_stat_proclivities?.contact!;

        // initial focus stat will be greatest stat
        const greatesetStatValue = Math.max(newPlayer.strength, newPlayer.speed, newPlayer.precision, newPlayer.contact);
        if (newPlayer.strength === greatesetStatValue){  newPlayer.focusStat = StatFocus.STRENGTH; }
        else if (newPlayer.speed === greatesetStatValue){  newPlayer.focusStat = StatFocus.SPEED; }
        else if (newPlayer.precision === greatesetStatValue){  newPlayer.focusStat = StatFocus.PRECISION; }
        else if (newPlayer.contact === greatesetStatValue){  newPlayer.focusStat = StatFocus.CONTACT; }

        newPlayers[n] = newPlayer;
        n++;
      }
      // ensure there are no duplicate team names
      let _teamName = generateTeamName();
      if (m === 0) {
        _teamName = teamNameInput;
      }
      while (teamNamesUsed.includes(_teamName)) {
        _teamName = generateTeamName();
      }
      let teamToAdd: TeamStateStruct = {
        id: crypto.randomUUID(),
        name: _teamName,
        gamesPlayed: 0,
        wins: 0,
        playersJson: newPlayers,
      }
      teamsToAdd[m] = teamToAdd;
      teamNamesUsed[m] = _teamName;
      

      m++;
    }

    let newLeague: LeagueStateStruct = {
      id: crypto.randomUUID(),
      name: leagueNameInput,
      teams: teamsToAdd,
      schedule: createSchedule(teamsToAdd)
    }

    // store info in React state
    setLeagueInfo(newLeague);
    // store teams in database
    // TODO: is it necessary to store teams and players in database in their own tables???
    for (let i=0; i<teamsToAdd.length; i++) {
      // store players in database
      for (let j=0; j<teamsToAdd[i]?.playersJson.length!; j++) {
        createPlayerConst.mutate({ 
          id: teamsToAdd[i]?.playersJson[j]?.id!,
          name: teamsToAdd[i]?.playersJson[j]?.name!,
          age: teamsToAdd[i]?.playersJson[j]?.age!,
          strength: teamsToAdd[i]?.playersJson[j]?.strength!,
          strengthPot: teamsToAdd[i]?.playersJson[j]?.strengthPot!,
          speed: teamsToAdd[i]?.playersJson[j]?.speed!,
          speedPot: teamsToAdd[i]?.playersJson[j]?.speedPot!,
          precision: teamsToAdd[i]?.playersJson[j]?.precision!,
          precisionPot: teamsToAdd[i]?.playersJson[j]?.precisionPot!,
          contact: teamsToAdd[i]?.playersJson[j]?.contact!,
          contactPot: teamsToAdd[i]?.playersJson[j]?.contactPot!,
          class: teamsToAdd[i]?.playersJson[j]?.class!,
          potential: teamsToAdd[i]?.playersJson[j]?.potential!,
          experience: teamsToAdd[i]?.playersJson[j]?.experience!,
          level: teamsToAdd[i]?.playersJson[j]?.level!,
          classExp: teamsToAdd[i]?.playersJson[j]?.classExp!,
          classLvl: teamsToAdd[i]?.playersJson[j]?.classLvl!,
          teamId: teamsToAdd[i]?.id!,
          focusStat: teamsToAdd[i]?.playersJson[j]?.focusStat!
          });
      }
      createTeamConst.mutate({ id: teamsToAdd[i]?.id!, name: teamsToAdd[i]?.name!, gamesPlayed: 0, wins: 0, playersJson: teamsToAdd[i]?.playersJson.map((v) => {
        return {
          id: v.id,
          name: v.name,
          age: v.age,
          strength: v.strength,
          strengthPot: v.strengthPot,
          speed: v.speed,
          speedPot: v.speedPot,
          precision: v.precision,
          precisionPot: v.precisionPot,
          contact: v.contact,
          contactPot: v.contactPot,
          class: v.class,
          potential: v.potential,
          experience: v.experience,
          level: v.level,
          classExp: v.classExp,
          classLvl: v.classLvl,
          teamId: teamsToAdd[i]?.id!,
          focusStat: v.focusStat
        }
      })!, leagueId: newLeague.id});
      
    }
    // store league info in database
    createLeagueConst.mutate({ id: newLeague.id, name: newLeague.name, teamsJson: teamsToAdd.map((v) => {
      return {
        id: v.id,
        name: v.name,
        gamesPlayed: v.gamesPlayed,
        wins: v.wins,
        playersJson: v.playersJson.map((item) => {
          return {
            id: item.id,
            name: item.name,
            age: item.age,
            strength: item.strength,
            strengthPot: item.strengthPot,
            speed: item.speed,
            speedPot: item.speedPot,
            precision: item.precision,
            precisionPot: item.precisionPot,
            contact: item.contact,
            contactPot: item.contactPot,
            class: item.class,
            potential: item.potential,
            experience: item.experience,
            level: item.level,
            classExp: item.classExp,
            classLvl: item.classLvl,
            teamId: v.id,
            focusStat: item.focusStat,
            stats_season: {
              at_bats: 0,
              runs: 0,
              walks: 0,
              hits: 0,
              doubles: 0,
              triples: 0,
              home_runs: 0,
              rbi: 0,
              strike_outs: 0,
              errors: 0,
              assists: 0,
              putouts: 0,
              k: 0,
              walks_allowed: 0,
              ip: 0,
              runs_allowed: 0,
            },
            stats_career: {
              at_bats: 0,
              runs: 0,
              walks: 0,
              hits: 0,
              doubles: 0,
              triples: 0,
              home_runs: 0,
              rbi: 0,
              strike_outs: 0,
              errors: 0,
              assists: 0,
              putouts: 0,
              k: 0,
              walks_allowed: 0,
              ip: 0,
              runs_allowed: 0,
            }
          }
        }),
        leagueId: newLeague.id
      }
    }) , myTeamId: newLeague.teams[0]?.id!, myTeamName: teamNameInput, season: 1, week: 0, scheduleJson: newLeague.schedule});

    // store league info in state variables
    setGameData({
      leagueId: newLeague.id,
      leagueName: newLeague.name,
      myTeamId: newLeague.teams[0]?.id!,
      season: 1,
      week: 0,
      phase: WeekPhase.PREGAME,
      teams: teamsToAdd,
      schedule: newLeague.schedule,
      fielderHexPos: default_fielderHexPos
    })
    setIsPlayingGame(true);
    setPreGamePlayerStats(teamsToAdd[0]!.playersJson);

    router.push('/') // this navigates to Home Page
  }

  const schedule: { [key: number]: Matchup[]} = {}

  

  return (
    <>
    <div className="flex flex-col">
      <h1 className="text-center text-2xl">Welcome to Simple Baseball GM!</h1>
      <div className="flex p-2"> 
        <form onSubmit={createLeague}>
          <ul className="flex flex-col gap-y-3">
            <li className="flex gap-x-3">
              <label htmlFor="league name">League Name:</label>
              <input 
              className="border-2 rounded-md"
              type="text" 
              id="league_name" 
              onChange={(e) => {
                setLeagueNameInput(e.target.value);
                if (e.target.value != null || leagueNameInput.trim().length !== 0) {
                  setWarningTextLeague('')
                }
                }}
              />
              <h2 className="text-red-600" id="warning_league">{warningTextLeague}</h2>
            </li>
            <li className="flex gap-x-3">
              <label htmlFor="team name">Team Name:</label>
              <input 
              className="border-2 rounded-md"
              type="text" 
              id="team_name" 
              onChange={(e) => {
                setTeamNameInput(e.target.value)
                if (e.target.value != null || leagueNameInput.trim().length !== 0) {
                  setWarningTextTeam('')
                }
              }} />
              <h2 className="text-red-600" id="warning_team">{warningTextTeam}</h2>
            </li>
            <li>
              <button 
                type="submit"
                className="rounded-full transition-colors duration-200 hover:bg-green-500 
              bg-green-700 text-white shadow-sm font-bold px-10 py-5 w-52">
                Create League
              </button>
            </li>
          </ul>
  </form>
      </div>
      <div className="flex p-2 gap-4"> 
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

export function createSchedule(teams: TeamStateStruct[]): { [key: number]: Matchup[]} {
  const num_weeks = 32;
  const num_teams = teams.length;
  let schedule: { [key: number]: Matchup[]} = {};
  let indices: number[] = [];
  for (let i=0, k=0, j=1; i<num_teams; i++) {
    if (i % 2 === 0) {
      indices[i] = k;
      k++;
    }
    else {
      indices[i] = num_teams-j;
      j++;
    }   
  }

  for (let w=0; w<num_weeks; w++) {
    let matches: Matchup[] = [];
    let num_matches = num_teams / 2;
    let m = 0;

    let h_ind = indices[0];
    let a_ind = indices[1];
    let i = 0;
    while (m < num_matches) {
      matches[m] = {
        homeTeam: teams[h_ind!]?.id!,
        awayTeam: teams[a_ind!]?.id!
      }
      //console.log(`home team: ${h_ind} vs away team: ${a_ind}`);
      i += 2;
      h_ind = indices[i];
      a_ind = indices[i+1];
      m += 1;
    }
    // edit indices based on berger algorithm - https://en.wikipedia.org/wiki/Round-robin_tournament#Scheduling_algorithm
    for (let i=0; i < indices.length; i++) {
      if (indices[i] !== num_teams-1) {
        indices[i] = indices[i]! + (num_teams/2) >= (num_teams-1) ? 
          indices[i]! + (num_teams/2) - (num_teams-1) : 
          indices[i]! + (num_teams/2);
      }
    }
    // add mathups for this week to schedule
    schedule[w] = matches;
  }
  return schedule;
}


