export function MatchTextLog() {
    return (
        <div
        className="flex flex-col p-2">
            <h1
            id="scoretext">Home: 0 Away: 0</h1>
            <textarea
            className="flex border-4 gap-2"
            id="log"
            readOnly
            autoFocus
            rows={50}
            cols={60}>

            </textarea>
        </div>
    )
}