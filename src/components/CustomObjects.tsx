// objects for game data. Should be able to convert this all to be stored in database.

interface League {
    name: string;
    teams: Team[];
}

interface Team {
    name: string;
    players: Player[];
}

export interface Player {
    name: string;
    age: number;

    strength: number;
    speed: number;
    precision: number;
    contact: number;

    strengthPot: number;
    speedPot: number;
    precisionPot: number;
    contactPot: number;

    class: string;
    potential: number;
    experience: number;
    level: number;
    classExp: number;
    classLvl: number;
}