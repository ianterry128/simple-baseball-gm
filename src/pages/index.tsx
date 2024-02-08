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
  players: PlayerStateStruct[]
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

enum Height {
  GROUND = 0,
  AIR = 1,
  HIGH = 2
}
interface Hex {
  position: Position,
  ballHeight: Height
  //isFair: boolean,
  //hasBall: boolean,
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
type SB_BasesOccupied = {
  first: string,
  second: string,
  third: string
}

type FieldActionResults = {
  outCounter: number,
  fieldActionLogContents: string[],
  baseResults: BasesOccupied,
  runsScored: number
}

type FieldPositions = '1B' | '2B' | 'SS' | '3B' | 'CF' | 'LF' | 'RF' | 'C' | 'P' ;

let hexField = new Map<Position, Hex>();

export default function Home() {
  const hello = api.post.hello.useQuery({ text: "from tRPC" });
  //const [playerInfo, setPlayerInfo] = useState<PlayerStateStruct[]>([]);
  //const [teamInfo, setTeamInfo] = useState<TeamStateStruct>();
  const [leagueInfo, setLeagueInfo] = useState<LeagueStateStruct>({
    id: '',
    name: '',
    teams: []
  });
  const [selectedTeam, setSelectedTeam] = useState(0);
  function setSelectedTeamById(_id: string) {
    let i: number = 0;
    while (i < leagueInfo.teams.length && leagueInfo.teams[i]?.id !== _id) {
      i++;
    }
    setSelectedTeam(i);
  }
  // LEAGUE TABLE STATE
  const [isLeagueTableActive, setIsLeagueTableActive] = useState<boolean>(true);

// LOG STATE VARIABLES
  const [logContents, setLogContents] = useState<string[]>([]);
  const [logIndex, setLogIndex] = useState<number>(0);
  const [isLogPaused, setIsLogPaused] = useState<boolean>(true);
  const [logInterval, setLogInterval] = useState<number>(1500);
  const [logSpeedTxt, setLogSpeedTxt] = useState<string>('Speed >');
  /**
    function appendLogContents(_text: string) {
      setLogContents([
        ...logContents,
        _text
      ]);
    }
  */
  const [isLogActive, setIsLogActive] = useState<boolean>(false);

  // SCOREBOARD STATE VARIABLES
  const [sb_teamHome, setSb_teamHome] = useState<string>('');
  const [sb_teamAway, setSb_teamAway] = useState<string>('');
  const [sb_runsHome, setSb_runsHome] = useState<number>(0);
  const [sb_runsAway, setSb_runsAway] = useState<number>(0);
  const [sb_inning, setSb_inning] = useState<number>(0);
  const [sb_inningHalf, setSb_inningHalf] = useState<string>('');
  const [sb_hitsHome, setSb_hitsHome] = useState<number>(0);
  const [sb_hitsAway, setSb_hitsAway] = useState<number>(0);
  const [sb_errHome, setSb_errHome] = useState<number>(0);
  const [sb_errAway, setSb_errAway] = useState<number>(0);
  const [sb_outs, setSb_outs] = useState<number>(0);
  const [sb_batter, setSb_batter] = useState<string>('');
  const [sb_baseRunners, setSb_baseRunners] = useState<SB_BasesOccupied>({
    first: 'none',
    second: 'none',
    third: 'none'
  });

  const [numInnings, setNumInnings] = useState<number>(6);

// FUNCTIONS HERE USE REACT HOOKS
  function createLeague () {
    setSelectedTeam(1);
    const numTeams: number = 6;
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
          '1B': {strength:0.30, speed:0.20, precision:0.10, contact:0.40},
          '2B': {strength:0.30, speed:0.20, precision:0.10, contact:0.40},
          'SS': {strength:0.30, speed:0.20, precision:0.10, contact:0.40},
          '3B': {strength:0.30, speed:0.20, precision:0.10, contact:0.40},
          'CF': {strength:0.30, speed:0.20, precision:0.10, contact:0.40},
          'LF': {strength:0.30, speed:0.20, precision:0.10, contact:0.40},
          'RF': {strength:0.30, speed:0.20, precision:0.10, contact:0.40},
          'C': {strength:0.30, speed:0.20, precision:0.10, contact:0.40},
          'P': {strength:0.25, speed:0.15, precision:0.50, contact:0.10}
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
        newPlayer.level = Math.floor(Math.random() * (75-60+1) + 60); // random lvl between 5 and 12
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
        players: newPlayers
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
                      <td>0</td>
                      <td>0</td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
    )
  }

  function MatchSim(leagueInfoProp:LeagueStateStruct, team_home:TeamStateStruct, team_away:TeamStateStruct) {
    let currentInning: number = 1;
    const inningsCount: number = numInnings;
    let outCount = 0;
    let strikeCount = 0;
    let ballCount = 0;
    let homeScore = 0;
    let awayScore = 0;
    let home_bat_cur = 0;
    let away_bat_cur = 0;
    let pitchResults: PitchResults = {outCounter:0, pitchLogContents:[], hitLine:[]};
    let basesOccupied: BasesOccupied = {first:undefined, second:undefined, third:undefined};
    let fieldActionResults: FieldActionResults = {outCounter:0, fieldActionLogContents:[], baseResults: basesOccupied, runsScored: 0};
    let hexesAtDistance: Hex[] = [];
  
    let home_lineup: PlayerStateStruct[] = createLineup(team_home);
    let away_lineup: PlayerStateStruct[] = createLineup(team_away);
    let home_p_index: number = getPlayerIndex('P', team_home);
    let away_p_index: number = getPlayerIndex('P', team_away);
  
    // set visibility of log
    setIsLogActive(true);
    setLogContents(['']);
    let _localContents: string[] = [];

    // set league table visibility
    setIsLeagueTableActive(false);
    // set initial scoreboard info
    

    while (currentInning <= numInnings) {
      // Top of the inning
      _localContents.push(`Top of Inning ${currentInning} begins...\n`)
      _localContents.push(`The ${team_away.name} are batting...\n`);
      while (outCount < 3) {
        _localContents.push(`${away_lineup[away_bat_cur]?.name} steps up to the plate...\n`);
        
        pitchResults = pitch(team_home.players[home_p_index]!, team_away.players[away_bat_cur]!);
        pitchResults.pitchLogContents.forEach((v) => { // log pitch log contents
          _localContents.push(v);
        });
        // What happens after a hit? (or miss)
        if (pitchResults.hitLine.length > 0) { // if hitline.length >1 then the ball was hit
          fieldActionResults = fieldAction(away_lineup[away_bat_cur]!, home_lineup, pitchResults.hitLine, basesOccupied) // input batter, field team, hitline,
          // output outcount, scoreToAdd, baseRanTo
          outCount += fieldActionResults.outCounter;
          basesOccupied = fieldActionResults.baseResults;
          awayScore += fieldActionResults.runsScored;
          fieldActionResults.fieldActionLogContents.forEach((v) => { // log field action log contents
            _localContents.push(v);
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
      // Bottom of the inning
      _localContents.push(`Bottom of Inning ${currentInning} begins...\n`)
      _localContents.push(`The ${team_home.name} are batting...\n`)
      while (outCount < 3) {
        _localContents.push(`${home_lineup[home_bat_cur]?.name} steps up to the plate...\n`)
        
        pitchResults = pitch(team_away.players[away_p_index]!, team_home.players[home_bat_cur]!);
        pitchResults.pitchLogContents.forEach((v) => { // log pitch log contents
          _localContents.push(v);
        });
        // What happens after a hit? (or miss)
        if (pitchResults.hitLine.length > 0) { // if hitline.length >1 then the ball was hit
          fieldActionResults = fieldAction(home_lineup[home_bat_cur]!, away_lineup, pitchResults.hitLine, basesOccupied) // input batter, field team, hitline,
          // output outcount, scoreToAdd, baseRanTo
          outCount += fieldActionResults.outCounter;
          basesOccupied = fieldActionResults.baseResults;
          homeScore += fieldActionResults.runsScored;
          fieldActionResults.fieldActionLogContents.forEach((v) => { // log field action log contents
            _localContents.push(v);
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
      currentInning++;
    }
    setLogContents(_localContents);
  }
  
    interface MatchLogProps3 {
      isActive?: boolean;
  }
  
  function MatchTextLog3(props: MatchLogProps3) {
    useEffect(() => {
      const intervalId = setInterval(() => {
        if (!isLogPaused) {
          // update scoreboard state variables here
          setLogIndex(c => c + 1); 
          let str = logContents[logIndex];
          if (str?.includes('steps up')) { // set batter TODO: do this a better way
            let batter = str.split(' ', 1);
            setSb_batter(batter[0]!);  
          }
          if (str?.includes('Inning')) { // update inning info
            let half = str.substring(0,3)==='Top' ? 'Top' : 'Bottom'
            setSb_inningHalf(half);
            if (half==='Top') {
              setSb_inning(n => n+1);
            }
            setSb_outs(0); // reset outs to 0 when sides change
            let baseReset: SB_BasesOccupied = { //reset bases when sides change
              first: 'none',
              second: 'none',
              third: 'none'
            }
            setSb_baseRunners(baseReset);
          }
          if (str?.includes('miss...')) { // strikeout
            setSb_outs(n => n+1);
          }
          if (str?.includes('an OUT!')) {
            setSb_outs(n => n+1);
          }
          if (str?.includes('missed')) { // record errors
            if (sb_inningHalf === 'Top') { // in top of the inning, Home team is in field
              setSb_errHome(n => n+1);
            }
            else {
              setSb_errAway(n => n+1);
            }
          }
          if (str?.includes('runners advance')) { // update baserunners
            let curBases = sb_baseRunners;
            let newBases: SB_BasesOccupied = {
              first: sb_batter,
              second: curBases.first,
              third: curBases.second
            }
            setSb_baseRunners(newBases);
            if (sb_inningHalf === 'Top') { // and record hits
              setSb_hitsAway(n => n+1);
            }
            else {
              setSb_hitsHome(n => n+1);
            }
          }
          if (str?.includes('hits a')) { // update hits NEW
            if (sb_inningHalf === 'Top') { // and record hits
              setSb_hitsAway(n => n+1);
            }
            else {
              setSb_hitsHome(n => n+1);
            }
          }
          if (str?.includes('advances to third base')) { // update baserunners TODO
            let curBases = sb_baseRunners;
            let _runner = str.split(' ', 1)[0];
            let newBases: SB_BasesOccupied = {
              first: curBases.first,
              second: curBases.second,
              third: _runner!
            }
            setSb_baseRunners(newBases);
          }
          if (str?.includes('advances to second base')) { // update baserunners TODO
            let curBases = sb_baseRunners;
            let _runner = str.split(' ', 1)[0];
            let newBases: SB_BasesOccupied = {
              first: curBases.first,
              second: _runner!,
              third: curBases.third
            }
            setSb_baseRunners(newBases);
          }
          if (str?.includes('advances to first base')) { // update baserunners TODO
            let curBases = sb_baseRunners;
            let _runner = str.split(' ', 1)[0];
            let newBases: SB_BasesOccupied = {
              first: _runner!,
              second: curBases.second,
              third: curBases.third
            }
            setSb_baseRunners(newBases);
          }
          if (str?.includes('scores')) {
            if (sb_inningHalf === 'Top') { // in top of the inning, Away team is at bat
              setSb_runsAway(n => n+1);
            }
            else {
              setSb_runsHome(n => n+1);
            }
            // set baserunners
            let curBases = sb_baseRunners;
            let newBases: SB_BasesOccupied = {
              first: curBases.first,
              second: curBases.second,
              third: curBases.third
            }
            let _player = str.split(' ', 1)[0];
            if (curBases.first === _player) {
              newBases.first = 'none';
            }
            else if (curBases.second === _player) {
              newBases.second = 'none';
            }
            else if (curBases.third === _player) {
              newBases.third = 'none';
            }
            setSb_baseRunners(newBases);
          }
        }
      }, logInterval);
      return () => clearInterval(intervalId);
    }, []);

      return (
          <div
          className="flex flex-col p-2"
          style={{ visibility: props.isActive ? "visible" : "hidden" }}
          >
              <div className="flex p-2">
              <button 
                className="rounded-full transition-colors duration-200 hover:bg-green-500 
            bg-green-700 text-white shadow-sm font-bold px-10 py-5 w-52"
                onClick={() => {
                  isLogPaused ? setIsLogPaused(false) : setIsLogPaused(true)
                }} >
                Start/Pause Log
            </button>
            <button 
                className="rounded-full transition-colors duration-200 hover:bg-green-500 
            bg-green-700 text-white shadow-sm font-bold px-10 py-5 w-52"
                onClick={() => {
                  if (logInterval === 1500) {
                    setLogInterval(1000);
                    setLogSpeedTxt("Speed >>");
                  }
                  else if (logInterval === 1000) {
                    setLogInterval(500);
                    setLogSpeedTxt("Speed >>>");
                  }
                  else if (logInterval === 500) {
                    setLogInterval(1500);
                    setLogSpeedTxt("Speed >");
                  }
                }} 
                >
                  {logSpeedTxt}
            </button>
          </div>
          <Scoreboard></Scoreboard>
              <textarea
              className="flex border-4 gap-2"
              id="log2"
              readOnly
              autoFocus
              rows={10}
              cols={10}
              value={logContents?.slice(0, logIndex).reverse()}
              >
              </textarea>
          </div>
      )
  }
  
  interface ScoreboardProps {
    isActive?: boolean;
}
  function Scoreboard(props: ScoreboardProps) {
    //create header row and inningRun columns
    let headerArr = [' '];
    let inningRuns = []
    for (let i=0; i < numInnings; i++) {
      headerArr.push(`${i+1}`);
      inningRuns.push('-');
    }
    headerArr.push('R');
    headerArr.push('H');
    headerArr.push('E');
    return (
      <div
      className="flex p-1"
      >
        <table className="table-auto border-2 border-spacing-2 px-8">
        <caption>`{sb_inningHalf} of the {sb_inning} inning`</caption>
        <thead>
        <tr className="even:bg-gray-50 odd:bg-white">
          {
            headerArr.map((v, index) => {
              if (index <= numInnings) {
                return (
                  <th 
                  className="px-2 font-light"
                  key={crypto.randomUUID()}>{v}</th>
                )
              }
              else {
                return (
                  <th 
                  className="px-2 font-bold"
                  key={crypto.randomUUID()}>{v}</th>
                )
              }    
            })
          }
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Home</td>
            {
              inningRuns.map((v) => {
                return (
                  <td
                  className="px-2" 
                  key={crypto.randomUUID()}>{v}</td>
                )
              })
            }
            <td className="px-2 font-bold" >{sb_runsHome}</td>
            <td className="px-2 font-bold" >{sb_hitsHome}</td>
            <td className="px-2 font-bold" >{sb_errHome}</td>
          </tr>
          <tr>
            <td>Away</td>
            {
              inningRuns.map((v) => {
                return (
                  <td
                  className="px-2" 
                  key={crypto.randomUUID()}>{v}</td>
                )
              })
            }
            <td className="px-2 font-bold" >{sb_runsAway}</td>
            <td className="px-2 font-bold" >{sb_hitsAway}</td>
            <td className="px-2 font-bold" >{sb_errAway}</td>
          </tr>
        </tbody>
      </table>
      <div className="p-2">
      <h1>Outs: {sb_outs}</h1>
      <h1>1st: {sb_baseRunners.first}</h1>
      <h1>2nd: {sb_baseRunners.second}</h1>
      <h1>3rd: {sb_baseRunners.third}</h1>
      </div>
      </div>
  )
  }

  //const displayName = typeof window !== 'undefined' ? localStorage.getItem("_playerName") : "Jane Doe";
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
        <button 
              className="rounded-full transition-colors duration-200 hover:bg-green-500 
          bg-green-700 text-white shadow-sm font-bold px-10 py-5 w-52"
              onClick={() => MatchSim(leagueInfo, leagueInfo.teams[0]!, leagueInfo.teams[selectedTeam]!)} >
              Exhibition
        </button>
      </div>
      <div className="flex p-2 gap-4">
        <TeamDisplayTable 
        leagueInfoProp={leagueInfo}
        teamIndexProp={0}
        /> 
        <TeamDisplayTable 
        leagueInfoProp={leagueInfo}
        teamIndexProp={selectedTeam}
        /> 
      </div>
      <LeagueTeamsTable 
      leagueInfoProp={leagueInfo}
      isActiveProp={isLeagueTableActive} />   
      {/*<MatchTextLog
        isActive={isLogActive}
        contents={logContents}
  />*/}
       <div>
       <MatchTextLog3
        isActive={isLogActive}
        />
       </div>
    </div>
    <div className="flex">
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

function TeamDisplayTable({leagueInfoProp, teamIndexProp} : {leagueInfoProp:LeagueStateStruct, teamIndexProp:number}) {
const captionText: string = teamIndexProp === 0 ? "My Team: " : "Opponent Team: "
return (
    <div>
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
            leagueInfoProp.teams[teamIndexProp]?.players.map((index) => {
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

// TODO: does this mutate the state object?? might not be what we want...
function createLineup(team: TeamStateStruct): PlayerStateStruct[] {
  let lineUp: PlayerStateStruct[] = team.players.sort((a, b) => {
    if (b.contact < a.contact) return -1;
    if (b.contact > a.contact) return 1;
    return 0;
  });
  
  // sort by best hitters
  let i = 0;
  while (i < team.players.length) {
    //console.log(`batter #${i+1} is ${lineUp[i]?.name} with CONTACT ${lineUp[i]?.contact}...`)
    i++;
  }

  return lineUp;
}
// TODO: enforce that only one of team or players is input
function getPlayerIndex(position: FieldPositions, team?: TeamStateStruct, players?: PlayerStateStruct[]): number {
  let i = 0;
  let index = 0;
  if (team !== undefined) {  // do this if team was input as TeamStateStruct
    while (i < team.players.length) {
      if (team.players[i]?.class === position) {
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
    return {outCounter:1, pitchLogContents:retStrings, hitLine:[]};
  }
  //return {0,[]};
}

function fieldAction(batter: PlayerStateStruct, fieldTeam: PlayerStateStruct[], hitLine: Hex[], basesOccupied: BasesOccupied): FieldActionResults {

  let retStrings: string[] = [];
  let _baseResults = basesOccupied;
  let _outcounter = 0;
  let _runsCounter = 0;

  let activeFielder: PlayerStateStruct | undefined = undefined;
  let activeBallIndex: number = 0;
  //TODO: check for backup fielders in case first fielder misses
  if (hitLine.length <= 2) {  // catcher should not field the ball unless it is hit less than 3 hexes
    activeFielder = fieldTeam[getPlayerIndex('C', undefined, fieldTeam)]// Catcher fields the ball
    activeBallIndex = 1;
  }
  else {
    let fieldersInRange = getFieldersInRange(fieldTeam, hitLine);
    activeBallIndex = fieldersInRange.findIndex(f => f !== undefined && f!== null); // returns earliest index where a fielder can field ball
    activeFielder = activeBallIndex !== -1 ? fieldersInRange[activeBallIndex] : undefined;  // findIndex returns -1 if no fielder is in range
    //console.log(`activeBallIndex: ${activeBallIndex} fielder: ${activeFielder?.name}`)
  }
  
  if (activeFielder !== undefined) { // if there is a fielder in range
    //console.log(`${activeFielder.class} ${activeFielder?.name} attempts to field the ball at ${hitLine[activeBallIndex]?.position.q} ${hitLine[activeBallIndex]?.position.r} ${hitLine[activeBallIndex]?.position.s}`);
    retStrings.push(`${activeFielder.class} ${activeFielder?.name} attempts to field the ball at ${hitLine[activeBallIndex]?.position.q} ${hitLine[activeBallIndex]?.position.r} ${hitLine[activeBallIndex]?.position.s}\n`);
    // fielder's precision roll must beat the ball factor to successfully catch... TODO: skills/perks that upgrade fielder prec_roll
    let prec_roll: number = Math.floor(Math.random() * activeFielder.precision + 1); 
    let ball_factor: number = Math.floor(Math.random() * 15 + 1); 
    retStrings.push(`${activeFielder.class} ${activeFielder.name} rolls ${prec_roll} vs ball factor of ${ball_factor}\n`)
    let basesEarned_batter = 0;
    let basesEarned_leadrunners = 0;
    if (prec_roll >= ball_factor) { // fielder successfully fields the ball
      if (hitLine[activeBallIndex]?.ballHeight === Height.AIR) { // catch out in air TODO: if ball in outfield, try to tag up
        _outcounter += 1;
        retStrings.push(`${activeFielder.class} ${activeFielder.name} catches the ball in the air.\n`)
        retStrings.push(`That's an OUT!\n`)
      }
      else if (hitLine[activeBallIndex]?.ballHeight === Height.GROUND) { // fielded on ground
        retStrings.push(`${activeFielder.class} ${activeFielder.name} fields the ball on the ground.\n`)
        basesEarned_batter = 0;
        if (activeFielder.class === 'LF' || activeFielder.class === 'CF'|| activeFielder.class === 'RF') // if this is an OF TODO: change to be hex positin based instead of fielder class
        {
          let str_roll_of: number = Math.floor(Math.random() * activeFielder.strength + 1); // OF throws with strength
          let spd_roll_batter: number = Math.floor(Math.random() * batter.speed + 1);  // batter runs with speed
          if (str_roll_of <= spd_roll_batter) { // batter runs for double and beats the throw
            basesEarned_batter = 2; // it's a double
          }
          else if (str_roll_of > spd_roll_batter) {
            if (str_roll_of >= spd_roll_batter*2 && str_roll_of > 20) { // critical running error! Thrown out. TODO: deal with other baserunners
              basesEarned_batter = 0;
              _outcounter += 1;
              retStrings.push(`${batter.name} is thrown out at 2nd!\n`)
              retStrings.push(`That's an OUT!\n`)
            }
            else { // held to single
              basesEarned_batter = 1; 
            }
          }
        }
        else {// if this is an IF
          let str_roll_if: number = Math.floor(Math.random() * (activeFielder.strength*1.5) + 1); // IF throws with strength*1.5
          let spd_roll_batter: number = Math.floor(Math.random() * batter.speed + 1);  // batter runs with speed
          if (str_roll_if <= spd_roll_batter) { // batter beats the throw at 1st
            basesEarned_batter = 1; // it's a single
          }
          else if (str_roll_if > spd_roll_batter) { // batter thrown out at 1st TODO: deal with other baserunners
            basesEarned_batter = 0;
            _outcounter += 1;
            retStrings.push(`${batter.name} is thrown out at 1st!\n`)
            retStrings.push(`That's an OUT!\n`) 
          }
        }
      } 
    }
    else { // fielder missed the catch
      if (activeFielder.class === 'LF' || activeFielder.class === 'CF'|| activeFielder.class === 'RF') { // if this fielder is an OF
        basesEarned_batter = 2;
        let str_roll_of: number = Math.floor(Math.random() * (activeFielder.strength*0.8) + 1); // OF throws with debuffed strength
        let spd_roll_batter: number = Math.floor(Math.random() * batter.speed + 1);  // batter runs with speed
        if (str_roll_of <= spd_roll_batter) { // batter runs for double and beats the throw
          basesEarned_batter = 2; // it's a double
        }
        else if (str_roll_of > spd_roll_batter) { // held to single w/ no chance of throw out
          basesEarned_batter = 1; 
        }
      }
      else { // if this is an IF
        basesEarned_batter = 1;
      }
      retStrings.push(`${activeFielder.class} ${activeFielder.name} missed the catch!\n`)
    }
    // deal with bases earned
    let r_1 = _baseResults.first;
    let r_2 = _baseResults.second;
    let r_3 = _baseResults.third;

    // runners advance
    if (basesEarned_batter === 1) {
      _baseResults.first = batter;
      _baseResults.second = r_1;
      _baseResults.third = r_2;
      retStrings.push(`runners advance...\n`)
      if (r_3 !== undefined) { // if there was a runner on third, he scores
        // runner scores
        _runsCounter += 1;
        retStrings.push(`${r_3.name} scores!!!\n`);
      }
    }
    else if (basesEarned_batter === 2) {
      _baseResults.first = undefined;
      _baseResults.second = batter;
      _baseResults.third = r_1;
      retStrings.push(`runners advance...\n`)
      if (r_2 !== undefined) { // if there was a runner on second, he scores
        // runner scores
        _runsCounter += 1;
        retStrings.push(`${r_2.name} scores!!!\n`);
      }
      if (r_3 !== undefined) { // if there was a runner on third, he scores
        // runner scores
        _runsCounter += 1;
        retStrings.push(`${r_3.name} scores!!!\n`);
      }
    } 
    //retStrings.push(`Runners on base: 1: ${_baseResults.first} | 2: ${_baseResults.second} | 3: ${_baseResults.third}\n`)
  }

  else if (activeFielder === undefined) { // THERE IS NO FIELDER IN RANGE
    let nearFielder_and_turns: {player:PlayerStateStruct, num_turns:number} = getNearestFielder(hitLine[hitLine.length-1]!, fieldTeam);
    let nearFielder = nearFielder_and_turns.player;
    let num_turns = nearFielder_and_turns.num_turns;
    let leadRunner = _baseResults.third !== undefined ? _baseResults.third : 
      (_baseResults.second !== undefined ? _baseResults.second :
         (_baseResults.first !== undefined ? _baseResults.first : undefined))
    console.log(`leadRunner is ${leadRunner?.name}`); // for debugging

    let spd_runningTotals: {batterTot: number, firstTot: number, secondTot: number, thirdTot: number} = {batterTot: 0, firstTot: 0, secondTot: 0, thirdTot: 0};
    //let basesEarned: {batterTot: number, firstTot: number, secondTot: number, thirdTot: number} = {batterTot: 0, firstTot: 0, secondTot: 0, thirdTot: 0};
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
  
      let distanceFactor = 30; // don't need "if infield"/"in outfield..." because of this
      let str_roll_of: number = Math.floor(Math.random() * nearFielder.strength + 1); // OF throws with strength
      let spd_roll_runner: number = Math.floor(Math.random() * leadRunnerNow!.speed + 1);  // runner runs with speed
      retStrings.push(`The ball comes to a rest at position ${hitLine[hitLine.length-1]!.position.q}, ${hitLine[hitLine.length-1]!.position.r}, ${hitLine[hitLine.length-1]!.position.s}\n`)
      retStrings.push(`${nearFielder.name} recovers the ball in ${num_turns} turns.\n`)
      retStrings.push(`${nearFielder.name} rolls throw strength of ${str_roll_of} vs ${leadRunnerNow?.name}'s speed roll of ${spd_roll_runner}\n`)
      if (str_roll_of <= spd_roll_runner) { // lead runner and trailing runners get an extra base
        basesEarned[0] += 1; //TODO: only need to increment lead runner and trailing runners
        basesEarned[1] += 1;
        basesEarned[2] += 1;
        basesEarned[3] += 1;
      }
      else if (str_roll_of > spd_roll_runner) {
        if (str_roll_of >= spd_roll_runner*2 && str_roll_of > distanceFactor) { // critical running error! Thrown out. TODO: deal with other baserunners
          let _base = basesEarned[highestIndex]! + highestIndex + 1;
          _outcounter += 1;
          retStrings.push(`${leadRunnerNow?.name} is thrown out at base ${_base}\n`)
          basesEarned[highestIndex] = 0; // lead runner was thrown out, but trailing runners still advance +1
          retStrings.push(`That's an OUT!\n`)
        }
        else { // held to bases earned while fielder was trying to get to the ball
          let _base = basesEarned[highestIndex]! + highestIndex;
          retStrings.push(`${leadRunnerNow?.name} was held to base ${_base}\n`)
        }
      }
// TODO: WHAT IF PLAYER SCORES BUT THEN OTHER RUNNER GETS OUT 3???
    // get hits on scoreboard
    if (basesEarned[0] === 1) {
      retStrings.push(`${batter.name} hits a single.\n`)
    }
    if (basesEarned[0] === 2) {
      retStrings.push(`${batter.name} hits a double.\n`)
    }
    if (basesEarned[0] === 3) {
      retStrings.push(`${batter.name} hits a triple.\n`)
    }

    let r_1 = _baseResults.first;
    let r_2 = _baseResults.second;
    let r_3 = _baseResults.third;
    if (_baseResults.third !== undefined) { // if there was a runner on third before the hit
      if (basesEarned[3]! >= 1) {// if he hearned at least 1 base, then he scored
        _runsCounter += 1;
        retStrings.push(`${_baseResults.third.name} scores!!!\n`);
        _baseResults.third = undefined;
      }
    }
    if (_baseResults.second !== undefined) { // if there was a runner on second before the hit
      if (basesEarned[2]! >= 2) {// if he hearned at least 2 base, then he scored
        _runsCounter += 1;
        retStrings.push(`${_baseResults.second.name} scores!!!\n`);
        _baseResults.second = undefined;
      }
      else if (basesEarned[2]! === 1) {
        retStrings.push(`${_baseResults.second.name} advances to third base.\n`);
        _baseResults.third = r_2;
        _baseResults.second = undefined;
      }
    }
    if (_baseResults.first !== undefined) { // if there was a runner on first before the hit
      if (basesEarned[1]! >= 3) {// if he hearned at least 3 bases, then he scored
        _runsCounter += 1;
        retStrings.push(`${_baseResults.first.name} scores!!!\n`);
        _baseResults.first = undefined;
      }
      else if (basesEarned[1]! === 2) {
        retStrings.push(`${_baseResults.first.name} advances to third base.\n`);
        _baseResults.third = r_1;
        _baseResults.first = undefined;
      }
      else if (basesEarned[1]! === 1) {
        retStrings.push(`${_baseResults.first.name} advances to second base.\n`);
        _baseResults.second = r_1;
        _baseResults.first = undefined;
      }
    }
    if (basesEarned[0]! >= 4) {// if he hearned at least 4 bases, then he scored
      _runsCounter += 1;
      retStrings.push(`${batter.name} hits a Home Run!!!!!\n`);
      retStrings.push(`${batter.name} scores!!!\n`);
    }
    else if (basesEarned[0]! === 3) {
      retStrings.push(`${batter.name} advances to third base.\n`);
      _baseResults.third = batter;
    }
    else if (basesEarned[0]! === 2) {
      retStrings.push(`${batter.name} advances to second base.\n`);
      _baseResults.second = batter;
    }
    else if (basesEarned[0]! === 1) {
      retStrings.push(`${batter.name} advances to first base.\n`);
      _baseResults.first = batter;
    }
    //retStrings.push(`Runners on base: 1: ${_baseResults.first} | 2: ${_baseResults.second} | 3: ${_baseResults.third}\n`)
  }
  return {outCounter: _outcounter, fieldActionLogContents: retStrings, baseResults: _baseResults, runsScored: _runsCounter}
  //return {outCounter:0, fieldActionLogContents: [], baseResults: {first:'', second:'', third:''}, runsScored: 0}
}

function hitDistanceCalc(str: number): number {
  let distance = 0;
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

/*
  getFieldersInRange returns a PlayerStateStruct[] like:
  fielders = [undefined, undefined, undefined, VALUE, VALUE, undefined...]
  where index of VALUEs also refers to index of hitLine where that fielder can field the ball
*/
function getFieldersInRange(fieldTeam: PlayerStateStruct[], hitLine: Hex[]): PlayerStateStruct[] {
  let fielders: PlayerStateStruct[] = [];
  //type FieldPositions = '1B' | '2B' | 'SS' | '3B' | 'CF' | 'LF' | 'RF' | 'C' | 'P' 
  const fielderHexPos: Record<FieldPositions, Position> = {
    '1B': {q:12,r:-15,s:3},
    '2B': {q:6,r:-15,s:9},
    'SS': {q:-6,r:-0,s:16},
    '3B': {q:-10,r:-5,s:15},
    'CF': {q:0,r:-25,s:25},
    'LF': {q:-14,r:-10,s:24},
    'RF': {q:14,r:-24,s:10},
    'C': {q:0,r:0,s:0},
    'P': {q:0,r:-7,s:7}
  }

  for (let i=1; i < hitLine.length; i++) { // for each hex the ball passes through
    fieldTeam.forEach((fielder) => {  // for each fielder
      if (hitLine[i]?.ballHeight !== Height.HIGH) { // if the ball at this hex is not high
        let dist = hex_distance(fielderHexPos[fielder.class as FieldPositions], hitLine[i]?.position!)
        // Corner IF can move 2 hex to snag passing ball
        if (fielder.class === '1B' || fielder.class === '3B' || fielder.class === 'P') {
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
      }
    })
    }    
  return fielders;
}

function getNearestFielder(ball_hex: Hex, _fieldTeam: PlayerStateStruct[]): {player:PlayerStateStruct, num_turns:number} { //TODO may have errors
  const fielderHexPos: Record<FieldPositions, Position> = {
    '1B': {q:12,r:-15,s:3},
    '2B': {q:6,r:-15,s:9},
    'SS': {q:-6,r:-0,s:16},
    '3B': {q:-10,r:-5,s:15},
    'CF': {q:0,r:-25,s:25},
    'LF': {q:-14,r:-10,s:24},
    'RF': {q:14,r:-24,s:10},
    'C': {q:0,r:0,s:0},
    'P': {q:0,r:-7,s:7}
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

function getNextStatPoint(proclivities: Proclivity): number {
  const num = Math.random();
  if (num < proclivities.strength) return 0;
  else if (num < proclivities.speed + proclivities.strength) return 1;
  else if (num < proclivities.precision + proclivities.speed + proclivities.strength) return 2;
  else return 3;
}


