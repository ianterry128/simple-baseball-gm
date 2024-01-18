// these functions mostly inspired by https://www.redblobgames.com/grids/hexagons

export interface Position {
    q: number,
    r: number,
    s: number,
  }

export function hex_subtract(a: Position, b: Position): Position {
    return ({
        q: a.q - b.q,
        r: a.r - b.r,
        s: a.s - b.s
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
