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
  schedule: { [key: number]: Matchup[]}
}

enum WeekPhase {
  PREGAME = 0,
  GAME = 1,
  POSTGAME = 2
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
    teams: [],
    schedule: {},
  });
  // LEAGUE TABLE STATE
  const [isLeagueTableActive, setIsLeagueTableActive] = useState<boolean>(false);

  const [selectedTeam, setSelectedTeam] = useState(0);
  function setSelectedTeamById(_id: string) {
    let i: number = 0;
    while (i < leagueInfo.teams.length && leagueInfo.teams[i]?.id !== _id) {
      i++;
    }
    setSelectedTeam(i);
  }

  const [isViewSchedule, setIsViewSchedule] = useState<boolean>(false);

  const [gameData, setGameData] = useState<GameDataStateStruct>({
    //league: {id: '', name: '', teams: []},
    leagueId: '',
    leagueName: '',
    myTeamId: '',
    week: 0,
    phase: 0,
    teams: [],
    schedule: {}
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
                          schedule: JSON.parse(JSON.stringify(item.scheduleJson))
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

  return (
    <div className="flex flex-row flex-wrap">

        <div className="w-full sm:w-1/5 lg:w-1/5 px-1 bg-red-300">
          <TeamDisplayLineupChangeTable 
            leagueInfoProp={_leagueInfo}
            teamIndexProp={0}
          /> 
        </div>
        <div className="w-full sm:w-3/5 lg:w-3/5 px-1 bg-orange-300">
          <FieldView />
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

    setGameData({
      leagueId: gameData.leagueId,
      leagueName: gameData.leagueName,
      myTeamId: gameData.myTeamId,
      week: gameData.week,
      phase: gameData.phase,
      teams: [reordered_team, ...gameData.teams],
      schedule: gameData.schedule
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
                  <tr key={value.id} className="even:bg-green-200 odd:bg-gray-50">
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
  return (
    <div className="flex flex-row p-1 gap-3 bg-neutral-100">
      <button onClick={() => setIsViewSchedule(false)}>Dashboard</button>
      <button onClick={() => setIsViewSchedule(true)}>Schedule</button>
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


