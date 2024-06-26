interface MatchLogProps {
    isActive?: boolean;
    contents?: string[];
    score?: string;
}

export function MatchTextLog(props: MatchLogProps) {
    return (
        <div
        className="flex flex-col p-2"
        style={{ visibility: props.isActive ? "visible" : "hidden" }}
        >
            <h1
            id="scoretext">{props.score}</h1>
            <textarea
            className="flex border-4 gap-2"
            id="log"
            readOnly
            autoFocus
            rows={10}
            cols={10}
            value={props.contents}>

            </textarea>
        </div>
    )
}