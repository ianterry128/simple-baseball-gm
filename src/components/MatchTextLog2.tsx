import { useEffect, useState } from "react";

interface MatchLogProps2 {
    isActive?: boolean;
    contents?: string[];
    score?: string;
    _logIndex?: number;
}

export function MatchTextLog2(props: MatchLogProps2) {

    /**
        const [mystr, setMystr] = useState('initial str');
        useEffect(() => {
            const intervalId = setInterval(() => {
              setMystr(() => props.contents?.shift() as string)
            }, 1000);
            return () => clearInterval(intervalId);
          }, []);
    */ 
          

    return (
        <div
        className="flex flex-col p-2"
        style={{ visibility: props.isActive ? "visible" : "hidden" }}
        >
            <h1
            id="scoretext">{props.score}</h1>
            <textarea
            className="flex border-4 gap-2"
            id="log3"
            readOnly
            autoFocus
            rows={10}
            cols={10}
            value={props.contents?.slice(0, props._logIndex)}
            >

            </textarea>
        </div>
    )
}