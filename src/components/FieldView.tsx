import { Player } from "@prisma/client";
import { Console } from "console";
import { useEffect, useState } from "react";
import { api } from "~/utils/api";
import { Pixel, Position, hex_distance, hex_lineDraw, hex_ring, hex_to_pixel, pixel_to_hex } from "~/utils/hexUtil";


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
  fielderHexPos: Record<FieldPositions, Position>
}


export function FieldView(props: FieldViewProps) {
  const [hexCoord, setHexCoord] = useState<Position>({
    q: 0,
    r: 0,
    s: 0,
  });
  const [canvasState, setCanvasState] = useState<HTMLCanvasElement>();
  const [hexSizeState, setHexSizeState] = useState<number>(7);
  //const [placedOfCount, setPlacedOfCount] = useState<number>(0);
  //const [isPlacingOfState, setIsPlacingOfState] = useState<boolean>(false);

  const canvas_w = 900;
  const canvas_h = 550;

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

    canvas.addEventListener( 'mousedown', event => {
    
      const bb = canvas.getBoundingClientRect();
      const x = Math.floor( (event.clientX - bb.left) / bb.width * canvas.width );
      const y = Math.floor( (event.clientY - bb.top) / bb.height * canvas.height );
      let hexCoord: Position = pixel_to_hex({x:x, y:y}, r, {x: canvas_w/2, y: canvas_h-r});

      //console.log(`pixel coord: ${x}, ${y}`);
      console.log(`hex coord: ${hexCoord.q}, ${hexCoord.r}, ${hexCoord.s}`)
      setHexCoord(hexCoord);

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
      console.log(`fp = ${fp} and fielderhexpos[fp]= ${f_positions[fp as FieldPositions]}`)
      if (fp === '1B' || fp === '3B') {
        let pixel  = hex_to_pixel(f_positions[fp as FieldPositions], hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
        drawHex(canvas.getContext('2d')!, pixel.x, pixel.y, hexSizeState, 'purple');
        drawRing(canvas.getContext('2d')!, f_positions[fp as FieldPositions], 2, hexSizeState, 'purple');
      }
      if (fp === '2B' || fp === 'SS') {
        let pixel  = hex_to_pixel(f_positions[fp as FieldPositions], hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
        drawHex(canvas.getContext('2d')!, pixel.x, pixel.y, hexSizeState, 'blue');
        drawRing(canvas.getContext('2d')!, f_positions[fp as FieldPositions], 3, hexSizeState, 'blue');
      }
      if (fp === 'LF' || fp === 'CF' || fp === 'RF') {
        let pixel  = hex_to_pixel(f_positions[fp as FieldPositions], hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
        drawHex(canvas.getContext('2d')!, pixel.x, pixel.y, hexSizeState, 'red');
        drawRing(canvas.getContext('2d')!, f_positions[fp as FieldPositions], 5, hexSizeState, 'red');
      }
      if (fp === 'P') {
        let pixel  = hex_to_pixel(f_positions[fp as FieldPositions], hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
        drawHex(canvas.getContext('2d')!, pixel.x, pixel.y, hexSizeState, 'gold');
        drawRing(canvas.getContext('2d')!, f_positions[fp as FieldPositions], 2, hexSizeState, 'gold');
      }
      if (fp === 'C') {
        let pixel  = hex_to_pixel(f_positions[fp as FieldPositions], hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
        drawHex(canvas.getContext('2d')!, pixel.x, pixel.y, hexSizeState, 'black');
        drawRing_C(canvas.getContext('2d')!, f_positions[fp as FieldPositions], 2, hexSizeState, 'black');
      }
    }

  }

  // onClick
  function placeOutFielder() {
    canvasState?.addEventListener('mousedown', placeOutfielderEventFunc);
    placed_of_count = 0;
  }
  
  function placeOutfielderEventFunc(event: MouseEvent) {
    if (placed_of_count < 3) {
      const bb = canvasState!.getBoundingClientRect();
      const x = Math.floor( (event.clientX - bb.left) / bb.width * canvasState!.width );
      const y = Math.floor( (event.clientY - bb.top) / bb.height * canvasState!.height );
      let place_pos: Position = pixel_to_hex({x:x, y:y}, hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
  
      //draw player
      let pixel  = hex_to_pixel(place_pos, hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
      drawHex(canvasState?.getContext('2d')!, pixel.x, pixel.y, hexSizeState, 'red');
      drawRing(canvasState?.getContext('2d')!, place_pos, 5, hexSizeState, 'red');
      placed_of_count += 1;
      if (placed_of_count === 3) {
        canvasState?.removeEventListener('mousedown', placeOutfielderEventFunc);
      }
    }
    console.log(`placedOfCount = ${placed_of_count}`);
  }

  function placeMiddleInfielder() {
    canvasState?.addEventListener('mousedown', placeMiddleInfielderEventFunc);
    placed_mif_count = 0;
  }
  
  function placeMiddleInfielderEventFunc(event: MouseEvent) {
    if (placed_mif_count < 2) {
      const bb = canvasState!.getBoundingClientRect();
      const x = Math.floor( (event.clientX - bb.left) / bb.width * canvasState!.width );
      const y = Math.floor( (event.clientY - bb.top) / bb.height * canvasState!.height );
      let place_pos: Position = pixel_to_hex({x:x, y:y}, hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
  
      //draw player
      let pixel  = hex_to_pixel(place_pos, hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
      drawHex(canvasState?.getContext('2d')!, pixel.x, pixel.y, hexSizeState, 'blue');
      drawRing(canvasState?.getContext('2d')!, place_pos, 3, hexSizeState, 'blue');
      placed_mif_count += 1;
      if (placed_mif_count === 2) {
        canvasState?.removeEventListener('mousedown', placeMiddleInfielderEventFunc);
      }
    }
  }

  function placeRange2Fielders() {
    canvasState?.addEventListener('mousedown', placeRange2FieldersEventFunc);
    placed_r2_count = 0;
  }
  
  function placeRange2FieldersEventFunc(event: MouseEvent) {
    if (placed_r2_count < 4) {
      const bb = canvasState!.getBoundingClientRect();
      const x = Math.floor( (event.clientX - bb.left) / bb.width * canvasState!.width );
      const y = Math.floor( (event.clientY - bb.top) / bb.height * canvasState!.height );
      let place_pos: Position = pixel_to_hex({x:x, y:y}, hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
  
      //draw player
      let pixel  = hex_to_pixel(place_pos, hexSizeState, {x: canvas_w/2, y: canvas_h-hexSizeState});
      drawHex(canvasState?.getContext('2d')!, pixel.x, pixel.y, hexSizeState, 'purple');
      drawRing(canvasState?.getContext('2d')!, place_pos, 2, hexSizeState, 'purple');
      placed_r2_count += 1;
      if (placed_r2_count === 4) {
        canvasState?.removeEventListener('mousedown', placeRange2FieldersEventFunc);
      }
    }
  }

 useEffect(() => { // TODO: why is left end of field cut off when I do it this way?
  drawHexes(50,50);
  drawFieldersInitial(props.fielderHexPos);
 }, [])

  return (
    <>
    <div className="overflow-x-auto">
      <div className="flex flex-col">
        <h1 className="text-center text-2xl">Graphics worksheet</h1>
        <h1 className="text-center">{hexCoord.q}, {hexCoord.r}, {hexCoord.s}</h1>
        <div className="flex flex-row p-2 margin-auto">
          <button 
                className="rounded-full transition-colors duration-200 hover:bg-green-500 
            bg-green-700 text-white shadow-sm font-bold px-10 py-5 w-52"
                onClick={() => placeOutFielder()}>
                Place Outfielder
          </button>
          <button 
                className="rounded-full transition-colors duration-200 hover:bg-green-500 
            bg-green-700 text-white shadow-sm font-bold px-10 py-5 w-52"
                onClick={() => placeMiddleInfielder()}>
                Place M-IF
          </button>
          <button 
                className="rounded-full transition-colors duration-200 hover:bg-green-500 
            bg-green-700 text-white shadow-sm font-bold px-10 py-5 w-52"
                onClick={() => placeRange2Fielders()}>
                Place Others
          </button>
        </div>
        <div className="flex p-2 gap-4 margin-auto">
          <canvas id="canvas" 
            className="border-2 "
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


