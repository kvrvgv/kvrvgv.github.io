const W = "kvrvgv";
const ANSI = ["#f55", "#5f5", "#ff5", "#55f", "#f5f", "#5ff", "#fff", "#fa0"];

const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const wrap = (v, n) => ((v % n) + n) % n;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// cached color strings, quantized so the renderer can batch by color
const colorCache = new Map();
function hsl(h, s, l) {
    h = Math.round(wrap(h, 360) / 6) * 6;
    l = Math.max(0, Math.min(100, Math.round(l / 4) * 4));
    s = Math.round(s / 10) * 10;
    let key = h * 100000 + s * 1000 + l;
    let c = colorCache.get(key);
    if (!c) {
        c = `hsl(${h},${s}%,${l}%)`;
        colorCache.set(key, c);
    }
    return c;
}

// ---------- character grid ----------

const G = {
    cols: 0, rows: 0, cw: 10, lh: 18,
    ch: [], co: [],
    clear() {
        this.ch.fill(" ");
    },
    set(x, y, c, col) {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
        let i = y * this.cols + x;
        this.ch[i] = c;
        this.co[i] = col;
    },
    text(x, y, s, col) {
        for (let i = 0; i < s.length; i++)
            if (s[i] !== " ") this.set(x + i, y, s[i], col);
    },
};

let canvas = document.getElementById("c");
let ctx = canvas.getContext("2d");
let glow = document.getElementById("glow");
let gctx = glow.getContext("2d");
let fontSize = 20;
let font = "";

function resize() {
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth, h = window.innerHeight;
    fontSize = w < 600 ? 15 : 20;
    font = `${fontSize}px VT323, 'Courier New', monospace`;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    glow.width = Math.ceil(w / 2);
    glow.height = Math.ceil(h / 2);

    ctx.font = font;
    G.cw = Math.max(5, ctx.measureText("M").width);
    G.lh = Math.round(fontSize * 0.95);
    G.cols = Math.ceil(w / G.cw);
    G.rows = Math.ceil(h / G.lh);
    G.ch = new Array(G.cols * G.rows).fill(" ");
    G.co = new Array(G.cols * G.rows).fill("#fff");
    if (current) current.init();
}

function render() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = font;
    ctx.textBaseline = "top";

    let buckets = new Map();
    for (let i = 0; i < G.ch.length; i++) {
        if (G.ch[i] === " ") continue;
        let b = buckets.get(G.co[i]);
        if (!b) buckets.set(G.co[i], b = []);
        b.push(i);
    }
    for (let [col, list] of buckets) {
        ctx.fillStyle = col;
        for (let i of list) {
            let x = i % G.cols, y = (i / G.cols) | 0;
            ctx.fillText(G.ch[i], x * G.cw, y * G.lh);
        }
    }

    gctx.clearRect(0, 0, glow.width, glow.height);
    gctx.drawImage(canvas, 0, 0, glow.width, glow.height);
}

// ---------- 5x7 font for the big banner ----------

const FONT = {
    K: ["X...X", "X..X.", "X.X..", "XX...", "X.X..", "X..X.", "X...X"],
    V: ["X...X", "X...X", "X...X", "X...X", ".X.X.", ".X.X.", "..X.."],
    R: ["XXXX.", "X...X", "X...X", "XXXX.", "X.X..", "X..X.", "X...X"],
    G: [".XXX.", "X...X", "X....", "X.XXX", "X...X", "X...X", ".XXX."],
};

function bannerPixels(word) {
    let px = [];
    [...word.toUpperCase()].forEach((c, n) => {
        FONT[c].forEach((row, y) => {
            [...row].forEach((v, x) => {
                if (v === "X") px.push([n * 6 + x, y]);
            });
        });
    });
    return px;
}

// ---------- animations ----------

const ANIMS = [
    {
        name: "rain.sh",
        init() {
            this.drops = [];
            for (let x = 0; x < G.cols; x++)
                this.drops.push(this.drop(true));
        },
        drop(initial) {
            return {
                y: initial ? rnd(-G.rows, G.rows) : rnd(-20, 0),
                speed: rnd(0.25, 1.1),
                len: 6 * rint(1, 5),
                hue: pick([120, 120, 120, 180, 300, 40, 0, 200]),
                off: rint(0, 6),
            };
        },
        frame(t) {
            this.drops.forEach((d, x) => {
                d.y += d.speed;
                let head = Math.floor(d.y);
                for (let i = 0; i < d.len; i++) {
                    let y = head - i;
                    let c = W[wrap(y + d.off, 6)];
                    let col = i === 0 ? "#fff" : hsl(d.hue, 100, 60 - (i / d.len) * 45);
                    G.set(x, y, c, col);
                }
                if (head - d.len > G.rows) this.drops[x] = this.drop(false);
            });
        },
    },
    {
        name: "bounce.exe",
        init() {
            let n = Math.max(10, Math.floor(G.cols * G.rows / 220));
            this.words = [];
            for (let i = 0; i < n; i++) {
                this.words.push({
                    x: rnd(0, G.cols - 6), y: rnd(0, G.rows - 1),
                    vx: rnd(0.3, 1) * pick([-1, 1]), vy: rnd(0.15, 0.5) * pick([-1, 1]),
                    col: pick(ANSI), trail: [],
                });
            }
        },
        frame(t) {
            for (let w of this.words) {
                w.trail.unshift([w.x, w.y]);
                if (w.trail.length > 5) w.trail.pop();
                w.x += w.vx;
                w.y += w.vy;
                if (w.x < 0 || w.x > G.cols - 6) { w.vx *= -1; w.col = pick(ANSI); w.x = Math.max(0, Math.min(G.cols - 6, w.x)); }
                if (w.y < 0 || w.y > G.rows - 1) { w.vy *= -1; w.col = pick(ANSI); w.y = Math.max(0, Math.min(G.rows - 1, w.y)); }
            }
            for (let w of this.words)
                w.trail.forEach(([x, y], i) => G.text(Math.round(x), Math.round(y), W, hsl(0, 0, 30 - i * 5)));
            for (let w of this.words)
                G.text(Math.round(w.x), Math.round(w.y), W, w.col);
        },
    },
    {
        name: "plasma.c",
        init() {},
        frame(t) {
            let cx = G.cols / 2, cy = G.rows / 2;
            for (let y = 0; y < G.rows; y++) {
                for (let x = 0; x < G.cols; x++) {
                    let v = (Math.sin(x * 0.09 + t) +
                        Math.sin(y * 0.17 + t * 0.7) +
                        Math.sin(x * 0.05 + y * 0.09 + t * 1.3) +
                        Math.sin(Math.hypot(x - cx, (y - cy) * 2) * 0.1 - t * 1.7)) / 4;
                    if (v < -0.55) continue;
                    let c = W[wrap(x + y * 2, 6)];
                    if (v > 0.6) c = c.toUpperCase();
                    G.set(x, y, c, hsl(v * 160 + t * 40, 90, 38 + v * 26));
                }
            }
        },
    },
    {
        name: "fire.bin",
        init() {
            this.f = new Float32Array(G.cols * (G.rows + 1));
            this.decay = 36 * 3 / (G.rows * 0.9);
        },
        frame(t) {
            let f = this.f, w = G.cols, h = G.rows + 1;
            for (let x = 0; x < w; x++)
                f[(h - 1) * w + x] = Math.random() < 0.85 ? 36 : 10;
            for (let s = 0; s < 2; s++) {
                for (let y = 1; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let src = y * w + x;
                        let r = rint(0, 3);
                        let dst = src - w - r + 1;
                        if (dst < 0) continue;
                        f[dst] = Math.max(0, f[src] - (r & 1) * this.decay * rnd(0.5, 1.5));
                    }
                }
            }
            const ramp = " .,:;";
            for (let y = 0; y < G.rows; y++) {
                for (let x = 0; x < w; x++) {
                    let v = f[y * w + x] / 36;
                    if (v < 0.05) continue;
                    let c;
                    if (v < 0.3) c = ramp[Math.floor(v / 0.3 * ramp.length)];
                    else if (v < 0.85) c = W[wrap(x, 6)];
                    else c = v > 0.95 ? "@" : "#";
                    let col = v > 0.96 ? "#ffe" : hsl(v * 60 - 5, 100, Math.min(65, v * 90));
                    G.set(x, y, c, col);
                }
            }
        },
    },
    {
        name: "donut.c",
        init() {},
        frame(t) {
            let A = t * 1.1, B = t * 0.6;
            let cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
            let wpx = G.cols * G.cw, hpx = G.rows * G.lh;
            let R1 = 1, R2 = 2, K2 = 5;
            let K1 = Math.min(wpx, hpx) * K2 * 3 / (8 * (R1 + R2)) * 0.9;
            let z = new Float32Array(G.cols * G.rows);
            const lum = ".,-~:;=!*#$@";
            for (let th = 0; th < 6.283; th += 0.05) {
                let ct = Math.cos(th), st = Math.sin(th);
                for (let ph = 0; ph < 6.283; ph += 0.015) {
                    let cp = Math.cos(ph), sp = Math.sin(ph);
                    let cx = R2 + R1 * ct, cy = R1 * st;
                    let x = cx * (cB * cp + sA * sB * sp) - cy * cA * sB;
                    let y = cx * (sB * cp - sA * cB * sp) + cy * cA * cB;
                    let zz = K2 + cA * cx * sp + cy * sA;
                    let ooz = 1 / zz;
                    let xp = Math.floor((wpx / 2 + K1 * ooz * x) / G.cw);
                    let yp = Math.floor((hpx / 2 - K1 * ooz * y) / G.lh);
                    if (xp < 0 || yp < 0 || xp >= G.cols || yp >= G.rows) continue;
                    let L = cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp);
                    let i = yp * G.cols + xp;
                    if (ooz > z[i]) {
                        z[i] = ooz;
                        let li = Math.max(0, Math.floor(L * 8));
                        G.ch[i] = L > 1.2 ? W[wrap(xp, 6)] : lum[Math.min(11, li)];
                        G.co[i] = hsl(t * 30 + th * 57, 90, 25 + Math.max(0, L) * 30);
                    }
                }
            }
        },
    },
    {
        name: "sphere.js",
        init() {
            let n = Math.min(1400, Math.floor(G.cols * G.rows / 6));
            this.pts = [];
            let ga = Math.PI * (3 - Math.sqrt(5));
            for (let i = 0; i < n; i++) {
                let y = 1 - (i / (n - 1)) * 2;
                let r = Math.sqrt(1 - y * y);
                this.pts.push([Math.cos(ga * i) * r, y, Math.sin(ga * i) * r]);
            }
        },
        frame(t) {
            let a = t * 0.7, b = Math.sin(t * 0.3) * 0.6;
            let ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
            let R = Math.min(G.cols * G.cw, G.rows * G.lh) * 0.42 * (1 + Math.sin(t * 1.5) * 0.06);
            let cx = G.cols * G.cw / 2, cy = G.rows * G.lh / 2;
            let z = new Float32Array(G.cols * G.rows).fill(-9);
            this.pts.forEach(([x, y, zz], i) => {
                let x1 = x * ca - zz * sa, z1 = x * sa + zz * ca;
                let y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
                let p = 3 / (3 - z2);
                let sx = Math.floor((cx + x1 * R * p) / G.cw), sy = Math.floor((cy + y1 * R * p) / G.lh);
                if (sx < 0 || sy < 0 || sx >= G.cols || sy >= G.rows) return;
                let k = sy * G.cols + sx;
                if (z2 <= z[k]) return;
                z[k] = z2;
                let c = W[i % 6];
                G.ch[k] = z2 > 0.5 ? c.toUpperCase() : c;
                G.co[k] = hsl(t * 25 + i * 0.4, 90, 22 + (z2 + 1) * 22);
            });
        },
    },
    {
        name: "stars.sys",
        init() {
            this.stars = [];
            for (let i = 0; i < 400; i++) this.stars.push(this.star(rnd(0.05, 1)));
        },
        star(z) {
            return { x: rnd(-1, 1), y: rnd(-1, 1), z, word: Math.random() < 0.12, col: pick(ANSI) };
        },
        frame(t) {
            let cx = G.cols / 2, cy = G.rows / 2;
            let sc = G.cols * 0.5;
            for (let i = 0; i < this.stars.length; i++) {
                let s = this.stars[i];
                s.z -= 0.012;
                let sx = cx + s.x / s.z * sc * 0.5, sy = cy + s.y / s.z * sc * 0.5 * G.cw / G.lh;
                if (s.z <= 0.02 || sx < -6 || sy < 0 || sx > G.cols || sy > G.rows) {
                    this.stars[i] = this.star(1);
                    continue;
                }
                let l = 90 - s.z * 70;
                if (s.word) G.text(Math.round(sx - 3), Math.round(sy), s.z < 0.4 ? W.toUpperCase() : W, s.z < 0.6 ? s.col : hsl(0, 0, l));
                else G.set(sx, sy, s.z < 0.25 ? "@" : s.z < 0.5 ? "*" : s.z < 0.75 ? "+" : ".", hsl(200, 30, l));
            }
        },
    },
    {
        name: "life.out",
        init() {
            this.w = G.cols;
            this.h = G.rows;
            this.seed();
        },
        seed() {
            this.cells = new Uint8Array(this.w * this.h).map(() => Math.random() < 0.28 ? 1 : 0);
            this.age = new Uint16Array(this.w * this.h);
            this.gen = 0;
        },
        frame(t, n) {
            let { w, h, cells, age } = this;
            if (n % 2 === 0) {
                let next = new Uint8Array(w * h), pop = 0;
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let c = 0;
                        for (let dy = -1; dy <= 1; dy++)
                            for (let dx = -1; dx <= 1; dx++)
                                if (dx || dy) c += cells[wrap(y + dy, h) * w + wrap(x + dx, w)];
                        let i = y * w + x;
                        let alive = cells[i] ? (c === 2 || c === 3) : c === 3;
                        next[i] = alive ? 1 : 0;
                        age[i] = alive ? Math.min(age[i] + 1, 999) : 0;
                        pop += next[i];
                    }
                }
                this.cells = next;
                this.gen++;
                if (pop < w * h * 0.03 || this.gen > 500) this.seed();
                if (Math.random() < 0.2) {
                    // drop a glider somewhere
                    let gx = rint(0, w - 3), gy = rint(0, h - 3);
                    [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]].forEach(([x, y]) => this.cells[(gy + y) * w + gx + x] = 1);
                }
            }
            for (let i = 0; i < this.cells.length; i++) {
                if (!this.cells[i]) continue;
                let x = i % w, y = (i / w) | 0;
                G.set(x, y, W[x % 6], hsl(100 + this.age[i] * 12, 90, this.age[i] < 2 ? 80 : 55));
            }
        },
    },
    {
        name: "banner.txt",
        init() {
            this.px = bannerPixels(W);
            this.sx = Math.max(1, Math.floor(G.cols / 40));
            this.sy = Math.max(1, Math.floor(G.rows / 16));
        },
        frame(t) {
            // background: rows of small words drifting
            for (let y = 0; y < G.rows; y += 2) {
                let dir = (y / 2) % 2 ? 1 : -1;
                let off = Math.floor(t * 8 * dir * (1 + (y % 3) * 0.3));
                for (let x = 0; x < G.cols; x++) {
                    let k = wrap(x + off, 7);
                    if (k < 6) G.set(x, y, W[k], hsl(y * 6 + t * 20, 30, 12));
                }
            }
            let bw = 36 * this.sx, bh = 7 * this.sy;
            let gap = bw + 8 * this.sx;
            let scroll = Math.floor(t * 14);
            let baseY = Math.floor((G.rows - bh) / 2) - 2;
            for (let copy = -1; copy <= Math.ceil(G.cols / gap) + 1; copy++) {
                let ox = copy * gap - wrap(scroll, gap);
                for (let [px, py] of this.px) {
                    for (let a = 0; a < this.sx; a++) {
                        let x = ox + px * this.sx + a;
                        if (x < 0 || x >= G.cols) continue;
                        let wave = Math.round(Math.sin(x * 0.08 + t * 3) * G.rows * 0.12);
                        for (let b = 0; b < this.sy; b++) {
                            let y = baseY + py * this.sy + b + wave;
                            G.set(x, y, W[wrap(x + y, 6)], hsl(x * 4 - t * 90, 100, 60));
                        }
                    }
                }
            }
        },
    },
    {
        name: "tunnel.asm",
        init() {},
        frame(t) {
            let cx = G.cols / 2 + Math.sin(t * 0.7) * G.cols * 0.12;
            let cy = G.rows / 2 + Math.cos(t * 0.9) * G.rows * 0.12;
            let maxd = Math.hypot(G.cols * G.cw, G.rows * G.lh) / 2;
            for (let y = 0; y < G.rows; y++) {
                for (let x = 0; x < G.cols; x++) {
                    let dx = (x - cx) * G.cw, dy = (y - cy) * G.lh;
                    let d = Math.hypot(dx, dy) + 1;
                    let a = Math.atan2(dy, dx) / (Math.PI * 2);
                    let v = 900 / d + t * 3;
                    let u = a * 24 + t * 0.8 + v * 0.15;
                    let chk = (Math.floor(u) + Math.floor(v)) & 1;
                    let l = Math.min(1, d / maxd * 1.6);
                    if (l < 0.08) continue;
                    let c = W[wrap(Math.floor(u * 3), 6)];
                    G.set(x, y, chk ? c.toUpperCase() : c, hsl(v * 25, 95, (chk ? 55 : 25) * l));
                }
            }
        },
    },
    {
        name: "worms.pl",
        init() {
            this.worms = [];
            let n = Math.max(8, Math.floor(G.cols * G.rows / 500));
            for (let i = 0; i < n; i++) {
                let x = rint(0, G.cols), y = rint(0, G.rows);
                let len = 6 * rint(2, 6);
                this.worms.push({
                    body: Array.from({ length: len }, () => [x, y]),
                    dir: rint(0, 4), hue: rint(0, 360),
                });
            }
        },
        frame(t) {
            const D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
            for (let w of this.worms) {
                if (Math.random() < 0.15) w.dir = wrap(w.dir + pick([-1, 1]), 4);
                let [hx, hy] = w.body[0];
                let [dx, dy] = D[w.dir];
                w.body.unshift([wrap(hx + dx, G.cols), wrap(hy + dy, G.rows)]);
                w.body.pop();
                let len = w.body.length;
                for (let i = len - 1; i >= 0; i--) {
                    let [x, y] = w.body[i];
                    let c = W[5 - (i % 6)];
                    G.set(x, y, i === 0 ? c.toUpperCase() : c, hsl(w.hue + i * 4 + t * 30, 95, 65 - (i / len) * 35));
                }
            }
        },
    },
    {
        name: "galaxy.f",
        init() {
            this.n = Math.min(2500, Math.floor(G.cols * G.rows / 3));
            this.dust = Array.from({ length: 150 }, () => [rint(0, G.cols), rint(0, G.rows)]);
        },
        frame(t) {
            for (let [x, y] of this.dust)
                G.set(x, y, Math.random() < 0.02 ? "*" : ".", hsl(220, 20, 30));
            let cx = G.cols / 2, cy = G.rows / 2;
            let R = Math.min(G.cols * G.cw, G.rows * G.lh * 1.6) * 0.5;
            let arms = 3;
            for (let i = 0; i < this.n; i++) {
                let f = i / this.n;
                let r = Math.pow(f, 0.8) * R;
                let arm = i % arms;
                let jitter = Math.sin(i * 12.9898) * 0.35;
                let ang = arm * Math.PI * 2 / arms + r / R * 5 + jitter - t * 0.5 * (1.2 - f);
                let x = cx + Math.cos(ang) * r / G.cw;
                let y = cy + Math.sin(ang) * r * 0.55 / G.lh;
                let c = f < 0.05 ? "@" : W[i % 6];
                G.set(x, y, c, hsl(40 + f * 220 + t * 10, 90, 80 - f * 45));
            }
        },
    },
    {
        name: "blobs.lua",
        init() {
            this.balls = Array.from({ length: 6 }, (_, i) => ({
                ax: rnd(0.3, 0.45), ay: rnd(0.3, 0.45), fx: rnd(0.3, 0.9), fy: rnd(0.3, 0.9),
                ph: rnd(0, 6), r: rnd(0.07, 0.13), hue: i * 60,
            }));
        },
        frame(t) {
            let wpx = G.cols * G.cw, hpx = G.rows * G.lh, m = Math.min(wpx, hpx);
            let bs = this.balls.map(b => ({
                x: wpx / 2 + Math.sin(t * b.fx + b.ph) * wpx * b.ax,
                y: hpx / 2 + Math.cos(t * b.fy + b.ph * 2) * hpx * b.ay,
                r2: (b.r * m) ** 2, hue: b.hue,
            }));
            for (let y = 0; y < G.rows; y++) {
                for (let x = 0; x < G.cols; x++) {
                    let px = x * G.cw, py = y * G.lh, f = 0, hx = 0, hy = 0;
                    for (let b of bs) {
                        let v = b.r2 / ((px - b.x) ** 2 + (py - b.y) ** 2 + 1);
                        f += v;
                        let a = b.hue * Math.PI / 180;
                        hx += Math.cos(a) * v;
                        hy += Math.sin(a) * v;
                    }
                    if (f < 0.55) continue;
                    let hue = Math.atan2(hy, hx) * 180 / Math.PI;
                    let c = f < 0.8 ? "." : f < 1 ? ":" : W[wrap(x, 6)];
                    if (f > 2.5) c = c.toUpperCase();
                    G.set(x, y, c, hsl(hue + t * 20, 95, Math.min(75, 20 + f * 22)));
                }
            }
        },
    },
    {
        name: "ocean.sh",
        init() {},
        frame(t) {
            for (let base = 0; base < G.rows + 3; base += 3) {
                for (let x = 0; x < G.cols; x++) {
                    let k = wrap(x + base * 2 - Math.floor(t * 6), 7);
                    if (k === 6) continue;
                    let wave = Math.sin(x * 0.12 + t * 2.2 + base * 0.25) * 1.6 + Math.sin(x * 0.05 - t * 1.3) * 1.2;
                    let y = base + Math.round(wave);
                    G.set(x, y, W[k], hsl(180 + wave * 30 + base * 3 + t * 15, 90, 45 + wave * 10));
                }
            }
        },
    },
    {
        name: "hack.log",
        init() {
            this.lines = [];
            this.addr = rint(0, 0xffff);
        },
        line() {
            let hex = n => n.toString(16).padStart(2, "0");
            let hexw = [...W].map(c => hex(c.charCodeAt(0))).join(" ");
            let gen = [
                () => [["[ ", "#aaa"], [" OK ", "#5f5"], [" ] ", "#aaa"], [pick(["mounting", "starting", "loading", "linking", "decrypting"]) + ` /dev/${W}${rint(0, 9)}`, "#ccc"]],
                () => [["[", "#aaa"], ["FAIL", "#f55"], ["] ", "#aaa"], [`${W}.service: core dumped (0x${rint(0, 0xffffff).toString(16)})`, "#f99"]],
                () => [[`0x${(this.addr += 16).toString(16).padStart(8, "0")}: `, "#55f"], [hexw + " " + Array.from({ length: 10 }, () => hex(rint(0, 256))).join(" "), "#aaa"], [`  |${W}..........|`, "#ff5"]],
                () => [[`${W}@crt`, "#5f5"], [":", "#fff"], ["~", "#55f"], ["$ ", "#fff"], [pick(["ls -la", `ping ${W}.t.me`, "make all", `ssh root@${W}`, "rm -rf /tmp/*", `./${W} --force`, "sudo !!", "cat /dev/urandom"]), "#fff"]],
                () => [[`>>> ${W} `, "#f5f"], ["▓".repeat(rint(4, 30)), pick(ANSI)], [` ${rint(1, 100)}%`, "#fff"]],
                () => [[`${W} `.repeat(rint(2, 14)), pick(ANSI)]],
            ];
            return pick(gen)();
        },
        frame(t, n) {
            let add = rint(0, 3);
            for (let i = 0; i < add; i++) this.lines.push(this.line());
            while (this.lines.length > G.rows - 1) this.lines.shift();
            this.lines.forEach((segs, y) => {
                let x = 1;
                for (let [s, col] of segs) {
                    G.text(x, y, s, col);
                    x += s.length;
                }
            });
            if (n % 16 < 8) G.set(1, this.lines.length, "█", "#5f5");
        },
    },
];

// ---------- main loop ----------

let current = null;
let currentIdx = -1;
let simT = 0, frameN = 0, glitch = 0, switchAt = 0;
const SWITCH_EVERY = 15;
const STEP = 1 / 30;

const prog = document.getElementById("prog");

function next() {
    let idx;
    do idx = rint(0, ANIMS.length); while (ANIMS.length > 1 && idx === currentIdx);
    currentIdx = idx;
    current = ANIMS[idx];
    current.init();
    simT = rnd(0, 100);
    glitch = 12;
    switchAt = performance.now() + SWITCH_EVERY * 1000;
    prog.textContent = `./${current.name}  [${idx + 1}/${ANIMS.length}]`;
    document.documentElement.style.setProperty("--accent", pick(ANSI.slice(0, 6)));
}

function applyGlitch() {
    let p = glitch / 12 * 0.5;
    for (let i = 0; i < G.ch.length; i++) {
        if (Math.random() < p) {
            G.ch[i] = Math.random() < 0.5 ? W[rint(0, 6)] : String.fromCharCode(rint(33, 126));
            G.co[i] = pick(ANSI);
        }
    }
    // horizontal tear: shift some rows
    for (let k = 0; k < 4; k++) {
        let y = rint(0, G.rows), s = rint(-8, 8);
        let row = G.ch.slice(y * G.cols, (y + 1) * G.cols);
        for (let x = 0; x < G.cols; x++) G.ch[y * G.cols + x] = row[wrap(x - s, G.cols)];
    }
    glitch--;
}

let last = 0, acc = 0;
function loop(now) {
    acc += Math.min(0.25, (now - last) / 1000 || 0);
    last = now;
    if (now > switchAt) next();
    if (acc >= STEP) {
        acc %= STEP;
        simT += STEP;
        frameN++;
        G.clear();
        current.frame(simT, frameN);
        if (glitch > 0) applyGlitch();
        render();
    }
    requestAnimationFrame(loop);
}

async function title() {
    let el = document.getElementById("title");
    let s = "";
    for (let i = 0; i < W.length; i++) {
        for (let j = 0; j < 10; j++) {
            el.textContent = s + String.fromCharCode(rint(33, 126));
            await sleep(40);
        }
        s += W[i];
        el.textContent = s;
    }
}

document.getElementById("screen").addEventListener("click", next);
window.addEventListener("keydown", e => {
    if (e.target.tagName === "A") return;
    if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
    }
});
window.addEventListener("resize", resize);

(document.fonts ? document.fonts.load("20px VT323").catch(() => {}) : Promise.resolve()).then(() => {
    resize();
    next();
    title();
    requestAnimationFrame(loop);
});
