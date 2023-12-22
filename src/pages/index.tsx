import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { GenerateTeam } from "~/components/GenerateTeam";
import { lastNames } from "~/data/names";

import { api } from "~/utils/api";

export default function Home() {
  const hello = api.post.hello.useQuery({ text: "from tRPC" });
  const [playerName, setPlayerName] = useState("John Doe");

// FUNCTIONS HERE USE REACT HOOKS
  function displayTeam () {
    const _name = generateName();
    console.log(_name);
    setPlayerName(_name);
  }

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
