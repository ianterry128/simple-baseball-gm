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
  const [sb_baseRunners, setSb_baseRunners] = useState<BasesOccupied>({
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
        
        const _name = generateName();
        //console.log(_name);
        newPlayer.name = _name;
        newPlayer.age = Math.floor(Math.random() * (40 - 16) + 16);
        newPlayer.strength = Math.floor(Math.random() * (30 - 1) + 1);

        newPlayer.speed = Math.floor(Math.random() * (30 - 1) + 1);

        newPlayer.precision = Math.floor(Math.random() * (30 - 1) + 1);

        newPlayer.contact = Math.floor(Math.random() * (30 - 1) + 1);

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
    
      /*
      // store info in React state
      setPlayerInfo(newPlayers); 
      setTeamInfo(teamToAdd);

      //store info in localstorage
      if (typeof window !== 'undefined') {
        localStorage.setItem("_playerInfo", JSON.stringify(newPlayers));
      }
      */
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
    let basesOccupied: BasesOccupied = {first:'none', second:'none', third:'none'};
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
      basesOccupied = {first:'none', second:'none', third:'none'};
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
      basesOccupied = {first:'none', second:'none', third:'none'};
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
            let baseReset: BasesOccupied = { //reset bases when sides change
              first: '',
              second: '',
              third: ''
            }
            setSb_baseRunners(baseReset);
          }
          if (str?.includes('miss...')) { // strikeout
            setSb_outs(n => n+1);
          }
          if (str?.includes('an OUT!')) {
            setSb_outs(n => n+1);
          }
          if (str?.includes('hits the ball')) { // record hits
            if (sb_inningHalf === 'Top') { // in top of the inning, Away team is at bat
              setSb_hitsAway(n => n+1);
            }
            else {
              setSb_hitsHome(n => n+1);
            }
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
            let newBases: BasesOccupied = {
              first: sb_batter,
              second: curBases.first,
              third: curBases.second
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
            <th>Age</th>
            <th>Str</th>
            <th>Spd</th>
            <th>Prc</th>
            <th>Con</th>
          </tr>
        </thead>
        <tbody>
          {
            leagueInfoProp.teams[teamIndexProp]?.players.map((index) => {
              return (
                <tr key={index.id} className="even:bg-green-200 odd:bg-gray-50">
                  <td>{index.name}</td>
                  <td>{index.class}</td>
                  <td>{index.age}</td>
                  <td>{index.strength}</td>
                  <td>{index.speed}</td>
                  <td>{index.precision}</td>
                  <td>{index.contact}</td>
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
  const _prec_roll: number = Math.floor(Math.random() * pitcher.precision + 1);
  const _con_roll: number = Math.floor(Math.random() * batter.contact + 1);

  let hitDistance: number = 0;
  let _hitLineHex: Hex[] = [];

  let retStrings: string[] = [];
  //log += `${pitcher.name} pitches with ${_prec_roll} precision...`
  retStrings.push(`${pitcher.name} pitches with ${_prec_roll} precision...\n`);
  if (_con_roll >= _prec_roll) {
    //log += `with ${_con_roll} contact, ${batter.name} gets a hit!!!`
    hitDistance = Math.floor(Math.random() * batter.strength + 1);
    retStrings.push(`with ${_con_roll} contact, ${batter.name} hits the ball ${hitDistance} hexes!!!\n`);
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
  // iterate through fielders
  //  fielder can field if his spd roll > ballspeed+distance
  
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
    console.log(`${activeFielder.class} ${activeFielder?.name} attempts to field the ball at ${hitLine[activeBallIndex]?.position.q} ${hitLine[activeBallIndex]?.position.r} ${hitLine[activeBallIndex]?.position.s}`);
    retStrings.push(`${activeFielder.class} ${activeFielder?.name} attempts to field the ball at ${hitLine[activeBallIndex]?.position.q} ${hitLine[activeBallIndex]?.position.r} ${hitLine[activeBallIndex]?.position.s}\n`);
    // fielder's precision roll must beat the ball factor to successfully catch... TODO: skills/perks that upgrade fielder prec_roll
    let prec_roll: number = Math.floor(Math.random() * activeFielder.precision + 1); 
    let ball_factor: number = Math.floor(Math.random() * 10 + 1); 
    retStrings.push(`${activeFielder.class} ${activeFielder.name} rolls ${prec_roll} vs ball factor of ${ball_factor}\n`)
    if (prec_roll >= ball_factor) {
      _outcounter += 1;
      retStrings.push(`That's an OUT!\n`)
    }
    else { // miss
      retStrings.push(`${activeFielder.class} ${activeFielder.name} missed the catch!\n`)
      let r_1 = _baseResults.first;
      let r_2 = _baseResults.second;
      let r_3 = _baseResults.third;
      // runners advance
      _baseResults.first = batter.name;
      _baseResults.second = r_1;
      _baseResults.third = r_2;
      retStrings.push(`runners advance...\n`)
      if (r_3 !== 'none') { // if there was a runner on third, he scores
        // runner scores
        _runsCounter += 1;
        retStrings.push(`${r_3} scores!!!\n`);
      }
      retStrings.push(`Runners on base: 1: ${_baseResults.first} | 2: ${_baseResults.second} | 3: ${_baseResults.third}\n`)
    }
  }
  else if (activeFielder === undefined) {
    let r_1 = _baseResults.first;
    let r_2 = _baseResults.second;
    let r_3 = _baseResults.third;
    // runners advance
    _baseResults.first = batter.name;
    _baseResults.second = r_1;
    _baseResults.third = r_2;
    retStrings.push(`runners advance...\n`)
    if (r_3 !== 'none') { // if there was a runner on third, he scores
      // runner scores
      _runsCounter += 1;
      retStrings.push(`${r_3} scores!!!\n`)
    }
    retStrings.push(`Runners on base: 1: ${_baseResults.first} | 2: ${_baseResults.second} | 3: ${_baseResults.third}\n`)
  }
  return {outCounter: _outcounter, fieldActionLogContents: retStrings, baseResults: _baseResults, runsScored: _runsCounter}
  //return {outCounter:0, fieldActionLogContents: [], baseResults: {first:'', second:'', third:''}, runsScored: 0}
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

/**
  function MatchTextLogLoc({_isActive, _contents} : {_isActive:boolean, _contents:string}) {
    return (
        <div
        className="flex flex-col p-2"
        style={{ visibility: _isActive ? "visible" : "hidden" }}
        >
            <h1
            id="scoretext">Home: 0 Away: 0</h1>
            <textarea
            className="flex border-4 gap-2"
            id="log"
            value={_contents}
            readOnly
            autoFocus
            rows={10}
            cols={10}>
  
            </textarea>
        </div>
    )
  }
*/


