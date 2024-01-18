import { Player } from "@prisma/client";
import { Console } from "console";
import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { GenerateTeam } from "~/components/GenerateTeam";
import { MatchTextLog } from "~/components/MatchTextLog";
import { lastNames } from "~/data/names";
import { teamNames } from "~/data/names";

import { api } from "~/utils/api";
import { Position, hex_lineDraw } from "~/utils/hexUtil";

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
    class?: string,
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
interface Hex {
  position: Position
  isFair: boolean,
  //hasBall: boolean,
}

type PitchResults = {
  outCounter: number,
  pitchLogContents: string[],
  hitLine: Hex[]
}

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

  const [logContents, setLogContents] = useState<string[]>([]);
  /**
    function appendLogContents(_text: string) {
      setLogContents([
        ...logContents,
        _text
      ]);
    }
  */
  const [isLogActive, setIsLogActive] = useState<boolean>(false);
  // TODO: set score while stepping through game log
  const [scoreStr, setScoreStr] = useState<string>('Home: 0  Away: 0');

  

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
        newPlayer.class = classesToGen[n];
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

  function LeagueTeamsTable({leagueInfoProp} : {leagueInfoProp:LeagueStateStruct}) {
    return (
        <div>
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
    const numInnings: number = 3;
    let outCount = 0;
    let strikeCount = 0;
    let ballCount = 0;
    let homeScore = 0;
    let awayScore = 0;
    let home_bat_cur = 0;
    let away_bat_cur = 0;
    let pitchResults: PitchResults = {outCounter:0, pitchLogContents:[], hitLine:[]};
    let hexesAtDistance: Hex[] = [];
  
    let home_lineup: PlayerStateStruct[] = createLineup(team_home);
    let away_lineup: PlayerStateStruct[] = createLineup(team_away);
    let home_p_index: number = getPitcher(team_home);
    let away_p_index: number = getPitcher(team_away);
  
    // set visibility of log
    setIsLogActive(true);
    //const txt = document.getElementById('log') as HTMLInputElement;
    //const score_txt = document.getElementById('scoretext') as HTMLInputElement;
    //txt.value = '';
    setLogContents(['']);
    let _localContents: string[] = [];

    while (currentInning <= numInnings) {
      // Top of the inning
      _localContents.push(`Top of Inning ${currentInning} begins...\n`)
      _localContents.push(`The ${team_away.name} are batting...\n`);
      while (outCount < 3) {
        _localContents.push(`${away_lineup[away_bat_cur]?.name} steps up to the plate...\n`);
        
        pitchResults = pitch('txt.value', team_home.players[home_p_index]!, team_away.players[away_bat_cur]!);
        outCount += pitchResults.outCounter;
        
          pitchResults.pitchLogContents.forEach((v) => {
            _localContents.push(v);
          });
        
        //_localContents.push(...pitchResults.pitchLogContents);
        //outCount += pitch('txt.value', team_home.players[home_p_index]!, team_away.players[away_bat_cur]!);
        away_bat_cur++;
        if (away_bat_cur > 8) away_bat_cur = 0;
      }
      outCount = 0;
      // Bottom of the inning
      _localContents.push(`Bottom of Inning ${currentInning} begins...\n`)
      _localContents.push(`The ${team_home.name} are batting...\n`)
      while (outCount < 3) {
        _localContents.push(`${home_lineup[home_bat_cur]?.name} steps up to the plate...\n`)
        
        pitchResults = pitch('txt.value', team_away.players[away_p_index]!, team_home.players[home_bat_cur]!);
        outCount += pitchResults.outCounter;
        
          pitchResults.pitchLogContents.forEach((v) => {
            _localContents.push(v);
          });
        
        //_localContents.push(...pitchResults.pitchLogContents);
        //outCount += pitch('txt.value', team_away.players[away_p_index]!, team_home.players[home_bat_cur]!);
        home_bat_cur++;
        if (home_bat_cur > 8) home_bat_cur = 0;
      }
      outCount = 0;
  
      currentInning++;
    }
    setLogContents(_localContents);
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
      <LeagueTeamsTable leagueInfoProp={leagueInfo} />   
      <MatchTextLog
        isActive={isLogActive}
        contents={logContents}
        score={scoreStr}
       />
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

function populateHexField() {
  hexField.set({q:0, r:0, s:0}, {position: {q:0,r:0,s:0}, isFair: true});
}

/**
  function MatchSim(leagueInfoProp:LeagueStateStruct, team_home:TeamStateStruct, team_away:TeamStateStruct) {
    let currentInning: number = 1;
    const numInnings: number = 3;
    let outCount = 0;
    let strikeCount = 0;
    let ballCount = 0;
    let homeScore = 0;
    let awayScore = 0;
    let home_bat_cur = 0;
    let away_bat_cur = 0;
  
    let home_lineup: PlayerStateStruct[] = createLineup(team_home);
    let away_lineup: PlayerStateStruct[] = createLineup(team_away);
    let home_p_index: number = getPitcher(team_home);
    let away_p_index: number = getPitcher(team_away);
  
    const txt = document.getElementById('log') as HTMLInputElement;
    const score_txt = document.getElementById('scoretext') as HTMLInputElement;
    txt.value = '';
    while (currentInning <= numInnings) {
      // Top of the inning
      txt.value += `Top of Inning ${currentInning} begins...\n`;
      txt.value += `The ${team_away.name} are batting...\n`;
      while (outCount < 3) {
        txt.value += `${away_lineup[away_bat_cur]?.name} steps up to the plate...\n`;
  
        outCount += pitch(txt.value, team_home.players[home_p_index]!, team_away.players[away_bat_cur]!);
        away_bat_cur++;
        if (away_bat_cur > 8) away_bat_cur = 0;
      }
      outCount = 0;
      // Bottom of the inning
      txt.value += `Bottom of Inning ${currentInning} begins...\n`;
      txt.value += `The ${team_home.name} are batting...\n`;
      while (outCount < 3) {
        txt.value += `${home_lineup[home_bat_cur]?.name} steps up to the plate...\n`;
  
        outCount += pitch(txt.value, team_away.players[away_p_index]!, team_home.players[home_bat_cur]!);
        home_bat_cur++;
        if (home_bat_cur > 8) home_bat_cur = 0;
      }
      outCount = 0;
  
      currentInning++;
    }
  }
*/

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

function getPitcher(team: TeamStateStruct): number {
  let i = 0;
  let index = 0;
  while (i < team.players.length) {
    if (team.players[i]?.class === "P") {
      index = i;
      return index;
    }
    i++;
  }
  return index;
}

function pitch(log: string, pitcher: PlayerStateStruct, batter: PlayerStateStruct): PitchResults {
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
    const finalBallPos: Hex = _hitDistArr[Math.floor(Math.random() * (_hitDistArr.length -1))] ?? {position:{q:0,r:0,s:0}, isFair:true}; // get hex of final ball pos
    const _hitLinePos: Position[] = hex_lineDraw({q:0,r:0,s:0}, finalBallPos.position); 
    // since hex_lineDraw returns Position[], we have to convert it to Hex[]
    let i = 0;
    while (i < _hitLinePos.length) {
      _hitLineHex[i] = {position:{q:_hitLinePos[i]?.q!, r:_hitLinePos[i]?.r!, s:_hitLinePos[i]?.s!}, isFair:true}
      i++;
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
    hexes[i] = {position:leftCenterLine[i]!, isFair:true};
    i++;
  }
  let j = i;
  while (j < leftCenterLine.length + centerRightLine.length - 1) {
    if (!hexes.some(val => {
      return JSON.stringify(val) === JSON.stringify({position:centerRightLine[i - leftCenterLine.length]!, isFair:true})
    }))
    {
      hexes[j] = {position:centerRightLine[i - leftCenterLine.length]!, isFair:true};
      j++;
    }
    i++;
  }
  return hexes;
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


