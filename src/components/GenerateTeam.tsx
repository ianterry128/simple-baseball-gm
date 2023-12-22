import { lastNames } from "~/data/names";
import { Player } from "./CustomObjects";
import { useState } from "react";

interface GenerateTeamProps {
    isActive?: boolean;
    //_playerName: string;
}

export function GenerateTeam(props: GenerateTeamProps) {
    const displayName = typeof window !== 'undefined' ? localStorage.getItem("_playerName") : "Jane Doe";
    return (
        <div>
            <button 
            className="rounded-full transition-colors duration-200 hover:bg-green-500 
        bg-green-700 text-white shadow-sm font-bold px-10 py-5 place-self-center"
            onClick={() => displayTeam()}>
            New League
            </button>
            <h1>{displayName}</h1>
        </div>
    )
}

function generateTeamOnClick () {
    
}

function generateTeam () {
    

    return;
}
/*
function displayTeam () {
    const _name = generateName();
    console.log(_name);
    if (typeof window !== 'undefined') {
        localStorage.setItem("_playerName", _name);
    }
    //localStorage.setItem("_playerName", _name);
}*/

function generatePlayer() {
    const retPlayer: Player = {
        name: "John Doe",
        age: 22,

        strength: 10,
        speed: 12,
        precision: 7,
        contact: 8,

        strengthPot: 0.3,
        speedPot: 0.3,
        precisionPot: 0.2,
        contactPot: 0.2,

        class: "1B",
        potential: 3,
        experience: 0,
        level: 1,
        classExp: 0,
        classLvl: 1,
    }
}

/*
function generateName(): string {
    let surName: string = "";
    
    
    
    const randName = lastNames[Math.floor(Math.random() * 2000)];
    if (typeof randName === `string`)
    {
        surName = randName;
    }

    return surName;
}*/