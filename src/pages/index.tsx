import { Player } from "@prisma/client";
import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { GenerateTeam } from "~/components/GenerateTeam";
import { lastNames } from "~/data/names";

import { api } from "~/utils/api";

interface PlayerStateStruct {
    name: String,
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

export default function Home() {
  const hello = api.post.hello.useQuery({ text: "from tRPC" });
  const [playerName, setPlayerName] = useState("John Doe");
  const [playerInfo, setPlayerInfo] = useState<PlayerStateStruct[]>([]);

// FUNCTIONS HERE USE REACT HOOKS
  function displayTeam () {
    let newPlayers: PlayerStateStruct[] = [];
    const numPlayers: number = 9;
    let n = 0;
    while (n < numPlayers)
    {
      let newPlayer: PlayerStateStruct = {
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
      console.log(_name);
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
    setPlayerInfo(newPlayers); 
  }

  /*function refreshFunc(){
    const currentName = typeof window !== 'undefined' ? localStorage.getItem("_playerName") : playerName;
    if (typeof currentName === 'string')
    {
      setPlayerName(currentName);
    }
  }*/

  //const displayName = typeof window !== 'undefined' ? localStorage.getItem("_playerName") : "Jane Doe";
  return (
    <>
    <div className="flex flex-col">
      <h1 className="text-center text-2xl">Welcome to Simple Baseball GM!</h1>
      <button 
            className="rounded-full transition-colors duration-200 hover:bg-green-500 
        bg-green-700 text-white shadow-sm font-bold px-10 py-5 place-self-center"
            onClick={() => displayTeam()}>
            New League
      </button>
      <h1>{playerName}</h1>
      
        <li>name: {playerInfo[0]?.name} | position: {playerInfo[0]?.class}</li>
        <li>name: {playerInfo[1]?.name} | Position: {playerInfo[1]?.class}</li>
        <li>name: {playerInfo[2]?.name} | position: {playerInfo[2]?.class}</li>
        <li>name: {playerInfo[3]?.name} | position: {playerInfo[3]?.class}</li>
        <li>name: {playerInfo[4]?.name} | Position: {playerInfo[4]?.class}</li>
        <li>name: {playerInfo[5]?.name} | position: {playerInfo[5]?.class}</li>
        <li>name: {playerInfo[6]?.name} | position: {playerInfo[6]?.class}</li>
        <li>name: {playerInfo[7]?.name} | position: {playerInfo[7]?.class}</li>
        <li>name: {playerInfo[8]?.name} | Position: {playerInfo[8]?.class}</li>
      
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
