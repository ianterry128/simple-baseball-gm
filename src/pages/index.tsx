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
  baseResults: BasesOccupied
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
    let basesOccupied: BasesOccupied = {first:'none', second:'none', third:'none'};
    let fieldActionResults: FieldActionResults = {outCounter:0, fieldActionLogContents:[], baseResults: basesOccupied};
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
        
        pitchResults = pitch(team_home.players[home_p_index]!, team_away.players[away_bat_cur]!);
        // What happens after a hit? (or miss)
        if (pitchResults.hitLine.length > 0) { // if hitline.length >1 then the ball was hit
          fieldAction(away_lineup[away_bat_cur]!, home_lineup, pitchResults.hitLine, basesOccupied) // input batter, field team, hitline,
          // output outcount, scoreToAdd, baseRanTo
        }
        //outCount += fieldActionResults.outCounter;
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
        
        pitchResults = pitch(team_away.players[away_p_index]!, team_home.players[home_bat_cur]!);
        fieldAction(home_lineup[home_bat_cur]!, away_lineup, pitchResults.hitLine, basesOccupied);
        //outCount += fieldActionResults.outCounter;
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

/**
  function populateHexField() {
    hexField.set({q:0, r:0, s:0}, {position: {q:0,r:0,s:0}, ballHeight: 0});
  }
*/

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
        launchAngle = Math.floor(Math.random() * 3 + 1); // any launchAngle is possible
      }
      else if (hitDistance < 3) { // if hitdistance is less than 3, height is GROUND
        launchAngle = Height.GROUND;
      }
    }

    // since hex_lineDraw returns Position[], we have to convert it to Hex[]...
    // here we set ball height for each hex in the hitLine, based on launchAngle
    let i = 1;
    console.log(`${batter.name} hitline is: `) // for debugging
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
  type FieldPositions = '1B' | '2B' | 'SS' | '3B' | 'CF' | 'LF' | 'RF' | 'C' | 'P' 
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

  // TODO: write function that returns list of fielders whose range the hitline passes through
  let fieldersInRange = getFieldersInRange(fieldTeam, hitLine);
  let speed_F: number = 0;
  fieldersInRange.forEach((fielder) => {
    console.log(`${fielder.class} ${fielder.name} is in range`)
  })
  
  
  //speed_F = Math.floor(Math.random() * fielder.speed + 1); // roll speed
  /**
    for (let i=0; i < hitLine.length; i++) { // for each hex the ball passes through
      fieldTeam.forEach((fielder) => {  // for each fielder
        if (hitLine[i]?.ballHeight !== Height.HIGH) { // if the ball at this hex is not high
          let dist = hex_distance(fielderHexPos[fielder.class as FieldPositions], hitLine[i]?.position!)
          // Corner IF can move 2 hex to snag passing ball
          if (fielder.class === '1B' || fielder.class === '3B' || fielder.class === "P") {
            if (dist <= 2) {
              let prec_F = Math.floor(Math.random() * fielder.precision + 1);
              if (prec_F >= hitLine.length) { // if fielder's prec roll beats ball hit str
                _outcounter += 1;
                //break;
              }
            }
          }
          // Middle IF can move 3 hex to snag passing ball
          if (fielder.class === '2B' || fielder.class === 'SS') {
            if (dist <= 3) {
              let prec_F = Math.floor(Math.random() * fielder.precision + 1);
              if (prec_F >= hitLine.length) { // if fielder's prec roll beats ball hit str
                _outcounter += 1;
                //break;
              }
            }
          }
          // OF can move 5 hex to snag passing ball
          if (fielder.class === 'LF' || fielder.class === 'RF' || fielder.class === 'CF') {
            if (dist <= 5) {
              let prec_F = Math.floor(Math.random() * fielder.precision + 1);
              if (prec_F >= hitLine.length) { // if fielder's prec roll beats ball hit str
                _outcounter += 1;
                //break;
              }
            }
          }
          // Base runner gets to first base after however many turns it takes to get to 13 speed
        }    
      })
      }
  */
    

  return {outCounter:0, fieldActionLogContents: [], baseResults: {first:'', second:'', third:''}}
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

function getFieldersInRange(fieldTeam: PlayerStateStruct[], hitLine: Hex[]): PlayerStateStruct[] {
  let fielders: PlayerStateStruct[] = [];
  type FieldPositions = '1B' | '2B' | 'SS' | '3B' | 'CF' | 'LF' | 'RF' | 'C' | 'P' 
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
        if (fielder.class === '1B' || fielder.class === '3B' || fielder.class === 'P' || fielder.class === 'C') {
          if (dist <= 2) {
            fielders.push(fielder);
            // need to "break" so we don't push same fielder for multiple hitline positions
          }
        }
        // Middle IF can move 3 hex to snag passing ball
        if (fielder.class === '2B' || fielder.class === 'SS') {
          if (dist <= 3) {
            fielders.push(fielder);
          }
        }
        // OF can move 5 hex to snag passing ball
        if (fielder.class === 'LF' || fielder.class === 'RF' || fielder.class === 'CF') {
          if (dist <= 5) {
            fielders.push(fielder);
          }
        }
      }
    })
        // Base runner gets to first base after however many turns it takes to get to 13 speed
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


