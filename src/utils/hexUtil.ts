// these functions mostly inspired by https://www.redblobgames.com/grids/hexagons

export interface Position {
    q: number,
    r: number,
    s: number,
  }

export interface Pixel {
    x: number,
    y: number,
}

export function hex_subtract(a: Position, b: Position): Position {
    return ({
        q: a.q - b.q,
        r: a.r - b.r,
        s: a.s - b.s
    })
}

export function hex_add(a: Position, b: Position): Position {
    return ({
        q: a.q + b.q,
        r: a.r + b.r,
        s: a.s + b.s
    })
}

export function hex_distance(a: Position, b: Position): number {
    let vec = hex_subtract(a, b);
    return ((Math.abs(vec.q) + Math.abs(vec.r) + Math.abs(vec.s)) / 2)
}

export function lerp(a: number, b: number, t: number): number {
    return (a + (b-a) * t)
}

export function hex_lerp(a: Position, b: Position, t: number): Position {
    return ({
        q: lerp(a.q, b.q, t),
        r: lerp(a.r, b.r, t),
        s: lerp(a.s, b.s, t)
    })
}

function hex_round(_hex: Position): Position {
    let _q = Math.round(_hex.q);
    let _r = Math.round(_hex.r);
    let _s = Math.round(_hex.s);

    let _q_diff = Math.abs(_q - _hex.q);
    let _r_diff = Math.abs(_r - _hex.r);
    let _s_diff = Math.abs(_s - _hex.s);

    if (_q_diff > _r_diff && _q_diff > _s_diff) {
        _q = -_r - _s;
    }
    else if (_r_diff > _s_diff) {
        _r = -_q - _s;
    }
    else {
        _s = -_q - _r;
    }

    return ({
        q: _q,
        r: _r,
        s: _s
    })
}

export function hex_lineDraw(a: Position, b: Position): Position[] {
    let N: number = hex_distance(a, b);
    let results: Position[] = [];
    for (let i=0; i<=N; i++) {
        results[i] = hex_round(hex_lerp(a, b, 1.0/N * i));
    }
    return results
}

export function hex_to_pixel(_hex: Position, size: number, offset: Pixel): Pixel {
    let x = size * (3./2 * _hex.q) + offset.x;
    let y = size * (Math.sqrt(3)/2 * _hex.q  +  Math.sqrt(3) * _hex.r) + offset.y;

    return {x: x, y: y}
}

export function pixel_to_hex(pixel: Pixel, size: number, offset: Pixel): Position {
    let realPixel: Pixel = {x: pixel.x - offset.x, y: pixel.y - offset.y};
    let _q = ( 2./3 * realPixel.x) / size;
    let _r = (-1./3 * realPixel.x  +  Math.sqrt(3)/3 * realPixel.y) / size;

    return hex_round({q:_q, r:_r, s:-_q-_r});
}

export function hex_scale(_hex: Position, radius: number): Position {
    return {q:_hex.q * radius, r:_hex.r * radius, s:_hex.s * radius};
}


export function hex_ring(center: Position, radius: number): Position[] {
    let results: Position[] = [];
    let directions: Position[] = [
        {q:1, r:0, s:-1}, {q:1, r:-1, s:0}, {q:0, r:-1, s:1}, 
        {q:-1, r:0, s:1}, {q:-1, r:1, s:0}, {q:0, r:1, s:-1}, 
    ];
    // this code doesn't work for radius == 0;
    let hex = hex_add(center, hex_scale(directions[4]!, radius));
    for (let i=0; i<6; i++) {
        for (let j=0; j<radius; j++) {
            results.push(hex);
            hex = hex_add(hex, directions[i]!);
        }
    }         
    return results
}


    
