import { Player } from "@prisma/client";
import { Console } from "console";
import { useEffect, useState } from "react";
import { api } from "~/utils/api";
import { Pixel, Position, hex_distance, hex_lineDraw, hex_ring, hex_to_pixel, pixel_to_hex } from "~/utils/hexUtil";

interface PlayerClassName {
  id: string,
  name: string, 
  class: string,  
}

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

type FieldPositions = '1B' | '2B' | 'SS' | '3B' | 'CF' | 'LF' | 'RF' | 'C' | 'P' ;

interface FieldViewProps {
  fielderHexPos: Record<FieldPositions, Position>,
  numInnings: number,
  phase: number,
  logContents: string[],
  players: PlayerClassName[],
}

// SCOREBOARD STUFF
type SB_BasesOccupied = {
  first: string,
  second: string,
  third: string
}
// these are used for scoreboard during game simulation
let __homeInningRuns: string[] = []; 
let __awayInningRuns: string[] = [];
//

export function FieldView(props: FieldViewProps) {
  const [hexCoord, setHexCoord] = useState<Position>({
    q: 0,
    r: 0,
    s: 0,
  });
  const [hexCoordString, setHexCoordString] = useState<string>('Hover over hex to see coordinates')
  const [canvasState, setCanvasState] = useState<HTMLCanvasElement>();
  const [hexSizeState, setHexSizeState] = useState<number>(7);

  // LOG STATE VARIABLES
  //const [logContents, setLogContents] = useState<string[]>([]);
  const [logIndex, setLogIndex] = useState<number>(0);
  const [isLogPaused, setIsLogPaused] = useState<boolean>(true);
  const [logInterval, setLogInterval] = useState<number>(1500);
  const [logSpeedTxt, setLogSpeedTxt] = useState<string>('Speed >');
  /**
    function appendLogContents(_text: string) {
      setLogContents([
        ...logContents,
        _text
      ]);
    }
  */
  //const [isLogActive, setIsLogActive] = useState<boolean>(false);
  
  // SCOREBOARD STATE VARIABLES
  const [sb_teamHome, setSb_teamHome] = useState<string>('');
  const [sb_teamAway, setSb_teamAway] = useState<string>('');
  const [sb_runsHome, setSb_runsHome] = useState<number>(0);
  const [sb_runsAway, setSb_runsAway] = useState<number>(0);
  const [sb_inning, setSb_inning] = useState<number>(0);
  const [sb_inningHalf, setSb_inningHalf] = useState<string>('');
  const [sb_hitsHome, setSb_hitsHome] = useState<number>(0);
  const [sb_hitsAway, setSb_hitsAway] = useState<number>(0);
  const [sb_errHome, setSb_errHome] = useState<number>(0);
  const [sb_errAway, setSb_errAway] = useState<number>(0);
  const [sb_outs, setSb_outs] = useState<number>(0);
  const [sb_batter, setSb_batter] = useState<string>('');
  const [sb_homeInningRuns, setSb_homeInningRuns] = useState<string[]>(__homeInningRuns);
  const [sb_awayInningRuns, setSb_awayInningRuns] = useState<string[]>(__awayInningRuns);
  const [sb_hasInningRunsRun, setSb_hasInningRunsRun] = useState<boolean>(false);
  const [sb_baseRunners, setSb_baseRunners] = useState<SB_BasesOccupied>({
    first: 'none',
    second: 'none',
    third: 'none'
  });

  if (!sb_hasInningRunsRun) {
    for (let i=0; i<props.numInnings; i++) {
      __awayInningRuns[i] = '-';
      __homeInningRuns[i] = '-';
    }
    setSb_hasInningRunsRun(true);
  }
  // SCOREBOARD STATE VARIABLES
  

  const canvas_w = 900;
  const canvas_h = 500;

  let placed_of_count = 0;
  let placed_mif_count = 0;
  let placed_r2_count = 0;

  const a = 2 * Math.PI / 6;

  const left_dist = 40;
  const right_dist = 40;
  const center_dist = 40;
  // FUNCTIONS HERE USE REACT HOOKS

  function drawHexes(x: number, y: number) { // TODO: think I don't need x and y parameters
    const canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
    setCanvasState(canvas);
    const ctx = canvas.getContext('2d');
    const r = hexSizeState; // this determines size of each hex
    setHexSizeState(r);
    let home_pos: Position = {q:0, r:0, s:0};
    let first_pos: Position = {q:13, r:-13, s:0};
    let second_pos: Position = {q:0, r:-13, s:13};
    let third_pos: Position = {q:-13, r:0, s:13};
    let r_post: Position = {q:right_dist, r:-right_dist, s:0};
    let l_post: Position = {q:-left_dist, r:0, s:left_dist};
    let center: Position = {q:0, r:-center_dist, s:center_dist};
    let mound_pos: Position = {q:0, r:-7, s:7};

    //drawHex(ctx!, x, y, r);
    //draw grass
    drawSquare(ctx!, {q:l_post.q, r:l_post.r, s:l_post.s}, 
      {q:center.q, r:center.r, s:center.s}, 
      {q:r_post.q, r:r_post.r, s:r_post.s}, {q:home_pos.q, r:home_pos.r, s:home_pos.s}, r, '#48a82a');

    drawLine(ctx!, first_pos, second_pos, r, '#a88f32');
    drawLine(ctx!, second_pos, third_pos, r, '#a88f32');
    drawLine(ctx!, home_pos, third_pos, r, '#a88f32');
    drawLine(ctx!, home_pos, first_pos, r, '#a88f32');
    //draw dirt
    drawSquare(ctx!, third_pos, second_pos, first_pos, home_pos, r, '#7d7210');
    drawLine(ctx!, {q:third_pos.q, r:third_pos.r-1, s:third_pos.s+1}, {q:second_pos.q, r:second_pos.r-1, s:second_pos.s+1}, r, '7d7210');
    drawLine(ctx!, {q:first_pos.q, r:first_pos.r-1, s:first_pos.s+1}, {q:second_pos.q, r:second_pos.r-1, s:second_pos.s+1}, r, '7d7210'); 
    drawLine(ctx!, {q:third_pos.q, r:third_pos.r-2, s:third_pos.s+2}, {q:second_pos.q, r:second_pos.r-2, s:second_pos.s+2}, r, '7d7210');
    drawLine(ctx!, {q:first_pos.q, r:first_pos.r-2, s:first_pos.s+2}, {q:second_pos.q, r:second_pos.r-2, s:second_pos.s+2}, r, '7d7210');
    //draw infield grass
    drawSquare(ctx!, {q:-9, r:-2, s:11}, {q:0, r:-11, s:11}, {q:9, r:-11, s:2}, {q:0, r:-2, s:2}, r, '#48a82a');
    //draw foul lines
    drawLine(ctx!, home_pos, r_post, r, 'white');
    drawLine(ctx!, home_pos, l_post, r, 'white');
    drawLine(ctx!, l_post, center, r, 'white');
    drawLine(ctx!, center, r_post, r, 'white');
    //draw base lines
    drawLine(ctx!, third_pos, second_pos, r, 'white');
    drawLine(ctx!, second_pos, first_pos, r, 'white');
    //draw bases
    let base_pixel  = hex_to_pixel(first_pos, r, {x: canvas_w/2, y: canvas_h-r});
    drawHex(ctx!, base_pixel.x, base_pixel.y, r, 'silver');
    base_pixel  = hex_to_pixel(second_pos, r, {x: canvas_w/2, y: canvas_h-r});
    drawHex(ctx!, base_pixel.x, base_pixel.y, r, 'silver');
    base_pixel  = hex_to_pixel(third_pos, r, {x: canvas_w/2, y: canvas_h-r});
    drawHex(ctx!, base_pixel.x, base_pixel.y, r, 'silver');
    base_pixel  = hex_to_pixel(home_pos, r, {x: canvas_w/2, y: canvas_h-r});
    drawHex(ctx!, base_pixel.x, base_pixel.y, r, 'silver');
    //draw mound plate
    let p_mound_pix = hex_to_pixel(mound_pos, r, {x: canvas_w/2, y: canvas_h-r});
    drawHex(ctx!, p_mound_pix.x, p_mound_pix.y, r, 'silver');
    //draw mound dirt
    drawRing(ctx!, mound_pos, 1, r, '#7d7210');

    canvas.addEventListener( 'mousemove', event => {
    
      const bb = canvas.getBoundingClientRect();
      const x = Math.floor( (event.clientX - bb.left) / bb.width * canvas.width );
      const y = Math.floor( (event.clientY - bb.top) / bb.height * canvas.height );
      let _hexCoord: Position = pixel_to_hex({x:x, y:y}, r, {x: canvas_w/2, y: canvas_h-r});

      //console.log(`pixel coord: ${x}, ${y}`);
      //console.log(`hex coord: ${_hexCoord.q}, ${_hexCoord.r}, ${_hexCoord.s}`)
      //setHexCoord(hexCoord);
      if (_hexCoord.q > 40 || _hexCoord.r > 0 || _hexCoord.s > 40 || _hexCoord.q < -40 || _hexCoord.r < -40 || _hexCoord.s < 0) {
        setHexCoordString(`Hover over hex to see coordinates`)
      }
      else {
        setHexCoordString(`${_hexCoord.q}, ${_hexCoord.r}, ${_hexCoord.s}`)
      }
  });

  canvas.addEventListener( 'mousedown', event => {
    
    const bb = canvas.getBoundingClientRect();
    const x = Math.floor( (event.clientX - bb.left) / bb.width * canvas.width );
    const y = Math.floor( (event.clientY - bb.top) / bb.height * canvas.height );
    let _hexCoord: Position = pixel_to_hex({x:x, y:y}, r, {x: canvas_w/2, y: canvas_h-r});
    let centered_pixel  = hex_to_pixel(_hexCoord, r, {x: canvas_w/2, y: canvas_h-r});
    let prev_pixel: Pixel  = hex_to_pixel(hexCoord, r, {x: canvas_w/2, y: canvas_h-r});
    
    //console.log(`pixel coord: ${x}, ${y}`);
    //console.log(`hex coord: ${_hexCoord.q}, ${_hexCoord.r}, ${_hexCoord.s}`)
    if (_hexCoord.q > 40 || _hexCoord.r > 0 || _hexCoord.s > 40 || _hexCoord.q < -40 || _hexCoord.r < -40 || _hexCoord.s < 0) {
      //setHexCoord()
    }
    else {
      setHexCoord(_hexCoord);
      //drawHex(ctx!, centered_pixel.x, centered_pixel.y, r, "pink")
    }
});
  }

  function drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color?: string) {
    
    ctx?.beginPath();
    for (let i=0; i<6; i++) {
      ctx?.lineTo(x + size * Math.cos(a*(i)), y + size * Math.sin(a*i));
    }
    ctx?.closePath();
    if (color !== undefined) {
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx?.stroke();
  }

  function drawLine(ctx: CanvasRenderingContext2D, from: Position, to: Position, size: number, color?: string) {
   
    let hex_line: Position[] = hex_lineDraw(from, to);
    let num_hexes = hex_line.length;
    let pixel: Pixel = {x:0, y:0};
    let y: number = 0;
    for (let i=0; i<num_hexes; i++) {
      pixel  = hex_to_pixel(hex_line[i]!, size, {x: canvas_w/2, y: canvas_h-hexSizeState});
      drawHex(ctx, pixel.x, pixel.y, size, color);
    }
  }

  function drawSquare(ctx: CanvasRenderingContext2D, left: Position, top: Position, right: Position, bottom: Position, size: number, color: string) {
    let num_lines: number = hex_distance(top, right);
    let fromPos = left;
    let toPos = top;
    for (let i=0; i<=num_lines; i++) {
      drawLine(ctx!, fromPos, toPos, size, color);
      fromPos = {q: fromPos.q + 1, r: fromPos.r, s: fromPos.s - 1};
      toPos = {q: toPos.q + 1, r: toPos.r, s: toPos.s - 1};
    }
  }

  function drawRing(ctx: CanvasRenderingContext2D, center_hex: Position, radius: number, size: number, color?: string) {
    let hexes_to_draw: Position[] = hex_ring(center_hex, radius);
    let pixel: Pixel = {x:0, y:0};

    for (let i=0; i<hexes_to_draw.length; i++) {
      pixel  = hex_to_pixel(hexes_to_draw[i]!, size, {x: canvas_w/2, y: canvas_h-hexSizeState});
      drawHex(ctx, pixel.x, pixel.y, size, color);
    }
  }
  /* This version of drawRing is for the Catcher */
  function drawRing_C(ctx: CanvasRenderingContext2D, center_hex: Position, radius: number, size: number, color?: string) {
    let hexes_to_draw: Position[] = hex_ring(center_hex, radius);
    let pixel: Pixel = {x:0, y:0};

    for (let i=6; i<hexes_to_draw.length-1; i++) {
      pixel  = hex_to_pixel(hexes_to_draw[i]!, size, {x: canvas_w/2, y: canvas_h-hexSizeState});
      drawHex(ctx, pixel.x, pixel.y, size, color);
    }
    //pixel  = hex_to_pixel({q:-1, r:0, s:1}, size, {x: canvas_w/2, y: canvas_h-hexSizeState});
    //drawHex(ctx, pixel.x, pixel.y, size, color);
    //pixel  = hex_to_pixel({q:1, r:-1, s:0}, size, {x: canvas_w/2, y: canvas_h-hexSizeState});
    //drawHex(ctx, pixel.x, pixel.y, size, color);
  }

  function drawPosLabels(ctx: CanvasRenderingContext2D, _pixel: Pixel, position: FieldPositions) {

    ctx.fillStyle = "black"
    ctx.globalAlpha = 0.8
    ctx.fillRect(_pixel.x-13, _pixel.y-28, 130, 25)
    ctx.globalAlpha = 1.0
    ctx.font = "14px arial"
    ctx.fillStyle = "white"
    let hexCoordText: string = `${position}: ${props.fielderHexPos[position].q}, ${props.fielderHexPos[position].r}, ${props.fielderHexPos[position].s}`
    ctx.fillText(hexCoordText, _pixel.x-10, _pixel.y-10)
  }

  function drawFieldersInitial(f_positions: Record<FieldPositions, Position>) {
    /**
      const fielderHexPos: Record<FieldPositions, Position> = {
        '1B': {q:12,r:-15,s:3},
        '2B': {q:6,r:-15,s:9},
        'SS': {q:-4,r:-11,s:15},
        '3B': {q:-12,r:-3,s:15},
        'CF': {q:0,r:-25,s:25},
        'LF': {q:-14,r:-10,s:24},
        'RF': {q:14,r:-24,s:10},
        'C': {q:0,r:0,s:0},
        'P': {q:0,r:-7,s:7}
      }
    */
    const canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
    //setCanvasState(canvas);

    for (const fp in f_positions) {
      //console.log(`fp = ${fp} and fielderhexpos[fp]= ${f_positions[fp as FieldPositions]}`)
      if (fp === '1B' || fp === '3B') {
        let pixel  = hex_to_pixel(f_positions[fp as FieldPositions], hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
        drawHex(canvas.getContext('2d')!, pixel.x, pixel.y, hexSizeState, 'purple');
        drawRing(canvas.getContext('2d')!, f_positions[fp as FieldPositions], 2, hexSizeState, 'purple');
        //drawPosLabels(canvas.getContext('2d')!, pixel, fp)
      }
      if (fp === '2B' || fp === 'SS') {
        let pixel  = hex_to_pixel(f_positions[fp as FieldPositions], hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
        drawHex(canvas.getContext('2d')!, pixel.x, pixel.y, hexSizeState, 'blue');
        drawRing(canvas.getContext('2d')!, f_positions[fp as FieldPositions], 3, hexSizeState, 'blue');
        //drawPosLabels(canvas.getContext('2d')!, pixel, fp)
      }
      if (fp === 'LF' || fp === 'CF' || fp === 'RF') {
        let pixel  = hex_to_pixel(f_positions[fp as FieldPositions], hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
        drawHex(canvas.getContext('2d')!, pixel.x, pixel.y, hexSizeState, 'red');
        drawRing(canvas.getContext('2d')!, f_positions[fp as FieldPositions], 5, hexSizeState, 'red');
        //drawPosLabels(canvas.getContext('2d')!, pixel, fp)
      }
      if (fp === 'P') {
        let pixel  = hex_to_pixel(f_positions[fp as FieldPositions], hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
        drawHex(canvas.getContext('2d')!, pixel.x, pixel.y, hexSizeState, 'gold');
        drawRing(canvas.getContext('2d')!, f_positions[fp as FieldPositions], 1, hexSizeState, 'gold');
        //drawPosLabels(canvas.getContext('2d')!, pixel, fp)
        
      }
      if (fp === 'C') {
        let pixel  = hex_to_pixel(f_positions[fp as FieldPositions], hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
        drawHex(canvas.getContext('2d')!, pixel.x, pixel.y, hexSizeState, 'black');
        drawRing_C(canvas.getContext('2d')!, f_positions[fp as FieldPositions], 2, hexSizeState, 'black');
        //drawPosLabels(canvas.getContext('2d')!, pixel, fp)
      }
    }

  }

  // COMPONENTS
  interface MatchLogProps3 {
    isActive?: boolean;
    _homeInningRuns: string[];
    _awayInningRuns: string[]
}

function MatchTextLog3(props_matchlog: MatchLogProps3) {
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isLogPaused) {
        // update scoreboard state variables here
        setLogIndex(c => c + 1); 
        let str = props.logContents[logIndex];
        if (str?.includes('steps up')) { // set batter TODO: do this a better way
          let batter = str.split(' ', 1);
          setSb_batter(batter[0]!);  
        }
        if (str?.includes('Inning')) { // update inning info
          let half = str.substring(0,3)==='Top' ? 'Top' : 'Bottom'
          setSb_inningHalf(half);
          if (half==='Top') {

            setSb_inning(n => n+1); // increment inning
            // set Away inning runs to 0
            // the increment doesn't register until next tick,
            //so we use sb_inning instead of sb_inning-1
            props_matchlog._awayInningRuns[sb_inning] = '0'; 
            setSb_awayInningRuns(props_matchlog._awayInningRuns);
            props_matchlog._homeInningRuns[sb_inning] = '-'; // this is in case of extra innings, to keep rows the same length during top of inning
          }
          else if (half==='Bottom') {
            // set Home inning runs to 0
            props_matchlog._homeInningRuns[sb_inning-1] = '0';
            setSb_homeInningRuns(props_matchlog._homeInningRuns);
          }
          setSb_outs(0); // reset outs to 0 when sides change
          let baseReset: SB_BasesOccupied = { //reset bases when sides change
            first: 'none',
            second: 'none',
            third: 'none'
          }
          setSb_baseRunners(baseReset);
        }
        if (str?.includes('strikes out')) { // strikeout
          setSb_outs(n => n+1);
        }
        if (str?.includes('an OUT!')) {
          setSb_outs(n => n+1);
        }
        if (str?.includes('out at')) {
          let curBases = sb_baseRunners;
          let _runner = str.split(' ', 1)[0];
          // which base was this runner previously on (if any)?
          let firstBaseString: string = (sb_baseRunners.first === _runner) ? 'none' : curBases.first;
          let secondBaseString: string = (sb_baseRunners.second === _runner) ? 'none' : curBases.second;
          let thirdBaseString: string = (sb_baseRunners.third === _runner) ? 'none' : curBases.third;
          let newBases: SB_BasesOccupied = {
            first: firstBaseString,
            second: secondBaseString,
            third: thirdBaseString
          }
          setSb_baseRunners(newBases);
        }
        if (str?.includes('missed')) { // record errors
          if (sb_inningHalf === 'Top') { // in top of the inning, Home team is in field
            setSb_errHome(n => n+1);
          }
          else {
            setSb_errAway(n => n+1);
          }
        }
        if (str?.includes('runners advance')) { // update baserunners
          let curBases = sb_baseRunners;
          let newBases: SB_BasesOccupied = {
            first: sb_batter,
            second: curBases.first,
            third: curBases.second
          }
          setSb_baseRunners(newBases);
          if (sb_inningHalf === 'Top') { // and record hits
            setSb_hitsAway(n => n+1);
          }
          else {
            setSb_hitsHome(n => n+1);
          }
        }
        if (str?.includes('hits a')) { // update hits NEW
          if (sb_inningHalf === 'Top') { // and record hits
            setSb_hitsAway(n => n+1);
          }
          else {
            setSb_hitsHome(n => n+1);
          }
        }
        if (str?.includes('advances to third base')) { // update baserunners TODO
          let curBases = sb_baseRunners;
          let _runner = str.split(' ', 1)[0];
          // which base was this runner previously on (if any)?
          let firstBaseString: string = (sb_baseRunners.first === _runner) ? 'none' : curBases.first;
          let secondBaseString: string = (sb_baseRunners.second === _runner) ? 'none' : curBases.second;
          let newBases: SB_BasesOccupied = {
            first: firstBaseString,
            second: secondBaseString,
            third: _runner!
          }
          setSb_baseRunners(newBases);
        }
        if (str?.includes('advances to second base')) { // update baserunners TODO
          let curBases = sb_baseRunners;
          let _runner = str.split(' ', 1)[0];
          // which base was this batter previously on (if any)?
          let firstBaseString: string = (sb_baseRunners.first === _runner) ? 'none' : curBases.first;
          let newBases: SB_BasesOccupied = {
            first: firstBaseString,
            second: _runner!,
            third: curBases.third
          }
          setSb_baseRunners(newBases);
        }
        if (str?.includes('advances to first base')) { // update baserunners TODO
          let curBases = sb_baseRunners;
          let _runner = str.split(' ', 1)[0];
          let newBases: SB_BasesOccupied = {
            first: _runner!,
            second: curBases.second,
            third: curBases.third
          }
          setSb_baseRunners(newBases);
        }
        if (str?.includes('scores')) {
          if (sb_inningHalf === 'Top') { // in top of the inning, Away team is at bat
            setSb_runsAway(n => n+1); // increment Away total runs
            // increment Away inning runs
            props_matchlog._awayInningRuns[sb_inning-1] = (parseInt(props_matchlog._awayInningRuns[sb_inning-1]!) + 1).toString();
            setSb_awayInningRuns(props_matchlog._awayInningRuns);
          }
          else {
            setSb_runsHome(n => n+1); // increment Home total runs
            // increment Home inning runs
            props_matchlog._homeInningRuns[sb_inning-1] = (parseInt(props_matchlog._homeInningRuns[sb_inning-1]!) + 1).toString();
            setSb_homeInningRuns(props_matchlog._homeInningRuns);
          }
          // set baserunners
          let curBases = sb_baseRunners;
          let newBases: SB_BasesOccupied = {
            first: curBases.first,
            second: curBases.second,
            third: curBases.third
          }
          let _player = str.split(' ', 1)[0];
          if (curBases.first === _player) {
            newBases.first = 'none';
          }
          else if (curBases.second === _player) {
            newBases.second = 'none';
          }
          else if (curBases.third === _player) {
            newBases.third = 'none';
          }
          setSb_baseRunners(newBases);
        }
      }
    }, logInterval);
    return () => clearInterval(intervalId);
  }, []);

    return (
        <div
        className="flex flex-col p-2"
        style={{ visibility: props_matchlog.isActive ? "visible" : "hidden" }}
        >
        <div className="flex p-2 gap-2">
          <Scoreboard></Scoreboard>
          <div className="flex flex-col gap-2">
            <button 
                className="rounded-full transition-colors duration-200 hover:bg-green-500 
            bg-green-700 text-white shadow-lg shadow-green-900 font-bold px-10 py-5 w-52"
                onClick={() => {
                  isLogPaused ? setIsLogPaused(false) : setIsLogPaused(true)
                }} >
                Start/Pause Log
            </button>
            <button 
                className="rounded-full transition-colors duration-200 hover:bg-green-500 
            bg-green-700 text-white shadow-lg shadow-green-900 font-bold px-10 py-5 w-52"
                onClick={() => {
                  if (logInterval === 1500) {
                    setLogInterval(1000);
                    setLogSpeedTxt("Speed >>");
                  }
                  else if (logInterval === 1000) {
                    setLogInterval(500);
                    setLogSpeedTxt("Speed >>>");
                  }
                  else if (logInterval === 500) {
                    setLogInterval(1500);
                    setLogSpeedTxt("Speed >");
                  }
                }} 
                >
                  {logSpeedTxt}
            </button>
          </div> 
        </div>
        
            <textarea
            className="flex border-4 gap-2 w-full shadow-md shadow-green-900"
            id="log2"
            readOnly
            autoFocus
            rows={5}
            cols={130}
            value={props.logContents?.slice(0, logIndex).reverse().join('')}
            >
            </textarea>
        </div>
    )
}

  function Scoreboard() {
    //create header row and inningRun columns
    let headerArr = [' '];
    //let inningRuns = []
    for (let i=0; i < __awayInningRuns.length; i++) {
      headerArr.push(`${i+1}`);
      //inningRuns.push('-');
    }
    headerArr.push('R');
    headerArr.push('H');
    headerArr.push('E');
    return (
      <div
      className="flex p-1 gap-3"
      >
        <table className="table-auto border-2 border-spacing-2 px-8 shadow-md shadow-green-900">
        <caption className=""><mark className="bg-gray-50 px-2 py-1">{sb_inningHalf} of inning {sb_inning}</mark></caption>
        <thead>
        <tr className="bg-slate-700 bg-opacity-80 text-white">
          {
            headerArr.map((v, index) => {
              if (index <= __awayInningRuns.length) {
                return (
                  <th 
                  className="px-2 font-light"
                  key={crypto.randomUUID()}>{v}</th>
                )
              }
              else {
                return (
                  <th 
                  className="px-2 font-bold"
                  key={crypto.randomUUID()}>{v}</th>
                )
              }    
            })
          }
          </tr>
        </thead>
        <tbody>
          <tr className="bg-gray-50">
            <td>Home</td>
            {
              sb_homeInningRuns.map((v) => {
                return (
                  <td
                  className="px-2" 
                  key={crypto.randomUUID()}>{v}</td>
                )
              })
            }
            <td className="px-2 font-bold" >{sb_runsHome}</td>
            <td className="px-2 font-bold" >{sb_hitsHome}</td>
            <td className="px-2 font-bold" >{sb_errHome}</td>
          </tr>
          <tr className="bg-gray-200">
            <td>Away</td>
            {
              sb_awayInningRuns.map((v) => {
                return (
                  <td
                  className="px-2" 
                  key={crypto.randomUUID()}>{v}</td>
                )
              })
            }
            <td className="px-2 font-bold" >{sb_runsAway}</td>
            <td className="px-2 font-bold" >{sb_hitsAway}</td>
            <td className="px-2 font-bold" >{sb_errAway}</td>
          </tr>
        </tbody>
      </table>
      <div className="p-2 bg-gray-50 rounded-md min-w-36 max-w-36 shadow-md shadow-green-900">
        <h1>Outs: {sb_outs}</h1>
        <h1>1st: {sb_baseRunners.first}</h1>
        <h1>2nd: {sb_baseRunners.second}</h1>
        <h1>3rd: {sb_baseRunners.third}</h1>
      </div>
      </div>
  )
  }

 useEffect(() => { // TODO: why is left end of field cut off when I do it this way?
  drawHexes(50,50);
  drawFieldersInitial(props.fielderHexPos);
 }, [])
 if (props.phase === 1) {
  return (
    <>
    <div className="overflow-x-auto">
      <div className="flex flex-col items-center">
        <div className="flex flex-row p-2 margin-auto">
          <MatchTextLog3
          isActive={true}
          _homeInningRuns={__homeInningRuns}
          _awayInningRuns={__awayInningRuns} />
        </div>
        <div className="p-2 bg-gray-50 rounded-md shadow-md shadow-green-900 w-auto ">
          <h1 className="text-center">{hexCoordString}</h1>
        </div>
        <div className="flex p-2 gap-2 justify-center margin-auto">
          <canvas id="canvas" 
            className=""
            width={canvas_w} 
            height={canvas_h}/>
        </div>
      </div>
    </div>
    </>
  );
 }

  return (
    <>
    <div className="overflow-x-auto py-2">
      <div className="flex flex-col items-center">
        {/*<h1 className="text-center text-2xl">Pregame Phase</h1>
        <h2 className="text-center">Set batting order and field positions</h2>*/}
        <div className="py-2 px-3 bg-gray-50 rounded-md shadow-md shadow-green-900 w-auto ">
          <h1 className="text-center">{hexCoordString}</h1>
        </div>
        <div className="flex flex-row p-2 margin-auto">
        </div>
        <div className="flex p-2 gap-2 justify-center margin-auto">
          <canvas id="canvas" 
            className=""
            width={canvas_w} 
            height={canvas_h}/>
        </div>
      </div>
    </div>
    </>
  );
}

// Functions outside Home() do not require REACT hooks

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



