/*
 * stimuli.js — 実験刺激の計算と描画（p5.js 1.x 用）
 *
 * 元の実験プログラム（Exp1.js〜Exp10.js、Exp6〜8 の p5-canvas4.js）の計算式を
 * そのまま移植している。式・乱数を引く順序・描画の順序は元コードと同じ。
 *
 * 使い方
 *   const stim = SV.createStimulus(type, opts, rand);
 *   stim.draw(g, t, W, H);
 *     rand : 0 以上 1 未満の乱数を返す関数（例：() => p.random()）
 *     g    : p5 インスタンスまたは p5.Graphics
 *     t    : 経過時間 ms（元コードの nw に相当）
 *     W, H : キャンバスの幅と高さ（px）
 *
 * 背景（灰色 128）は呼び出し側で塗る。
 */
(function (global) {
  'use strict';

  const SV = (global.SV = global.SV || {});
  const PI = Math.PI;
  const TWO_PI = Math.PI * 2;

  /* ------------------------------------------------------------------
   * 1. 単一の波（Exp1〜4 の p5ex / p5ex1、Exp6〜8 の p5-canvas4.js）
   *    opts.noise    位置ノイズの幅 positionsync（px）
   *    opts.xSpacing 点の間隔（px）            既定 32
   *    opts.long     波の長さ（px）            既定 350
   *    opts.period   波長（px）                既定 250
   *    opts.lines    'none' | 'over'           'over' は点の上に線（Exp6〜8）
   * ------------------------------------------------------------------ */
  function createWave(opts, rand) {
    const amplitude = 32;
    const xSpacing = opts.xSpacing != null ? opts.xSpacing : 32;
    const long = opts.long != null ? opts.long : 350;
    const period = opts.period != null ? opts.period : 250;
    const positionsync = opts.noise || 0;
    const lines = opts.lines || 'none';

    const w = long;
    const yvalues = new Array(Math.floor(w / xSpacing));
    // calcRand()
    const ydev = new Array(Math.floor(w / xSpacing));
    for (let x = 0; x < ydev.length; x++) {
      ydev[x] = rand() * positionsync - positionsync / 2;
    }

    return {
      dotCount: yvalues.length,
      draw(g, t, W, H, variant) {
        // calcWave()
        const theta = PI * t / 1000 * 2;
        let x = theta;
        for (let i = 0; i < yvalues.length; i++) {
          yvalues[i] = Math.sin(x) * amplitude + ydev[i];
          x += (TWO_PI / period) * xSpacing;
        }
        const showLines = variant === 'line' ? true : variant === 'dots' ? false : lines === 'over';
        // renderWave()
        g.noStroke();
        g.fill(0);
        const xoffset = (W - xSpacing * (yvalues.length - 1)) / 2;
        for (let i = 0; i < yvalues.length; i++) {
          g.ellipse(i * xSpacing + xoffset, H / 2 + yvalues[i], 16, 16);
        }
        // renderLineWave()（Exp6〜8：点の上に線）
        if (showLines) {
          g.fill(0);
          g.stroke(0);
          g.strokeWeight(2);
          for (let i = 0; i < yvalues.length - 1; i++) {
            g.line(i * xSpacing + xoffset, H / 2 + yvalues[i],
              (i + 1) * xSpacing + xoffset, H / 2 + yvalues[i + 1]);
          }
        }
      }
    };
  }

  /* ------------------------------------------------------------------
   * 2. 検出課題の刺激（Exp3 の p5ex2、Exp4 の p5ex2、Exp5 の p5ex1）
   *    opts.layout 'updown'（Exp3：上下2か所）| 'center'（Exp4・5：中央）
   *    opts.target 'up' | 'down'（updown）、'present' | 'absent'（center）
   *    opts.speed  妨害ノイズの速度係数 randomSpeed（周波数は speed / 2 Hz）
   *    opts.zeroPhase true で標的の初期位相 randomOffset を 0 にする（画像書き出し用）
   * ------------------------------------------------------------------ */
  function createDetection(opts, rand) {
    const amplitude = 32;
    const positionsync = 0;
    const xSpacing = 32;
    const long = 350;
    const period = 250;
    const w = long;
    const layout = opts.layout;
    const speed = opts.speed;
    // stimulatePosition：0 = 標的が上（updown）／あり（center）、1 = 下／なし
    const stimulatePosition = (opts.target === 'up' || opts.target === 'present') ? 0 : 1;

    const yvalues = new Array(Math.floor(w / xSpacing));
    const yValuesNotTarget = new Array(Math.floor(w / xSpacing));
    const yValuesRandom = new Array(1 + Math.floor(w / xSpacing));

    // calcRand()（positionsync = 0 なので値はすべて 0。乱数は元コードと同じ回数引く）
    const ydev = new Array(Math.floor(w / xSpacing));
    for (let x = 0; x < ydev.length; x++) {
      ydev[x] = rand() * positionsync - positionsync / 2;
    }
    // calcRandThetaNotTarget()
    const thetas2 = new Array(1 + Math.floor(w / xSpacing));
    for (let x = 0; x < thetas2.length; x++) {
      thetas2[x] = PI * rand() * 2;
    }
    // calcRandTheta()
    const thetas = new Array(1 + Math.floor(w / xSpacing));
    for (let x = 0; x < thetas.length; x++) {
      thetas[x] = PI * rand() * 2;
    }
    let randomOffset = rand() * 2 * PI;
    if (opts.zeroPhase) randomOffset = 0;

    return {
      dotCount: yvalues.length,
      draw(g, t, W, H) {
        const xoffset = (W - xSpacing * (yvalues.length - 1)) / 2;

        // calcWave()
        let theta = PI * t / 1000 * 2;
        let x = theta + randomOffset;
        for (let i = 0; i < yvalues.length; i++) {
          yvalues[i] = Math.sin(x) * amplitude + ydev[i];
          x += (TWO_PI / period) * xSpacing;
        }
        // renderWave()
        g.noStroke();
        g.fill(0);
        if (layout === 'updown') {
          const yBase = stimulatePosition === 0 ? H / 4 : H * 3 / 4;
          for (let i = 0; i < yvalues.length; i++) {
            g.ellipse(i * xSpacing + xoffset, yBase + yvalues[i], 16, 16);
          }
        } else if (stimulatePosition === 0) {
          for (let i = 0; i < yvalues.length; i++) {
            g.ellipse(i * xSpacing + xoffset, H / 2 + yvalues[i], 16, 16);
          }
        }

        // calcRandNotTarget()
        theta = PI * t / 1000 * 2;
        x = theta;
        for (let i = 0; i < yValuesNotTarget.length; i++) {
          yValuesNotTarget[i] = Math.sin(thetas2[i] + x) * amplitude + 0;
        }
        // renderNotTarget()
        // 元コードは thetas2.length（11）回ループするが、11番目の値は未定義で描かれない。
        // そのため実際に表示される 10 点だけを描く。
        g.noStroke();
        g.fill(0);
        if (layout === 'updown') {
          const yBase = stimulatePosition === 0 ? H * 3 / 4 : H / 4;
          for (let i = 0; i < yValuesNotTarget.length; i++) {
            g.ellipse(i * xSpacing + xoffset, yBase + yValuesNotTarget[i], 16, 16);
          }
        } else if (stimulatePosition === 1) {
          for (let i = 0; i < yValuesNotTarget.length; i++) {
            g.ellipse(i * xSpacing + xoffset, H / 2 + yValuesNotTarget[i], 16, 16);
          }
        }

        // calcRandWave()
        theta = PI * t / 1000 * speed;
        x = theta;
        for (let i = 0; i < yValuesRandom.length; i++) {
          yValuesRandom[i] = Math.sin(thetas[i] + x) * amplitude + 0;
        }
        // renderNoise()（Exp3 は上下の両方に同じノイズ点を描く）
        g.noStroke();
        g.fill(0);
        for (let i = 0; i < thetas.length; i++) {
          if (layout === 'updown') {
            g.ellipse(i * xSpacing + xoffset - 16, H / 4 + yValuesRandom[i], 16, 16);
            g.ellipse(i * xSpacing + xoffset - 16, H * 3 / 4 + yValuesRandom[i], 16, 16);
          } else {
            g.ellipse(i * xSpacing + xoffset - 16, H / 2 + yValuesRandom[i], 16, 16);
          }
        }
      }
    };
  }

  /* ------------------------------------------------------------------
   * 3. 線で結んだ波（Exp9・Exp10 の SingleWave クラス）
   * ------------------------------------------------------------------ */
  const NOISE_CODE_TO_PX = { 0: 0, 1: 48, 2: 96, 3: 144 };

  function SingleWave(noiseCondition, rand) {
    this.yvalues = new Array(Math.floor(350 / 32));
    this.ydev = new Array(this.yvalues.length);
    this.positionsync = NOISE_CODE_TO_PX[noiseCondition] || 0;
    for (let x = 0; x < this.ydev.length; x++) {
      this.ydev[x] = rand() * this.positionsync - this.positionsync / 2;
    }
  }
  SingleWave.prototype.update = function (baseTheta) {
    let x = baseTheta;
    for (let i = 0; i < this.yvalues.length; i++) {
      this.yvalues[i] = Math.sin(x) * 32 + this.ydev[i];
      x += (TWO_PI / 250) * 32;
    }
  };
  SingleWave.prototype.display = function (g, showLines) {
    const drawStartOffset = -((this.yvalues.length - 1) * 32) / 2;
    if (showLines) {
      g.stroke(0); g.strokeWeight(2); g.noFill();
      g.beginShape();
      for (let x = 0; x < this.yvalues.length; x++) {
        g.vertex(x * 32 + drawStartOffset, this.yvalues[x]);
      }
      g.endShape();
    }
    g.noStroke(); g.fill(0);
    for (let x = 0; x < this.yvalues.length; x++) {
      g.ellipse(x * 32 + drawStartOffset, this.yvalues[x], 16, 16);
    }
  };

  /* Exp9・10 本番：上下2本（Exp9 は両方、Exp10 は指示された側だけを表示）
   *    opts.noiseUp, opts.noiseDown  ノイズコード 0〜3
   *    opts.show   'both' | 'up' | 'down'
   *    t は試行開始（注視点の開始）からの ms */
  function createCuedPair(opts, rand) {
    const waveYOffset = 115;
    const upWave = new SingleWave(opts.noiseUp, rand);
    const downWave = new SingleWave(opts.noiseDown, rand);
    let phaseOffsetUp = rand() * TWO_PI;          // p.random(p.TWO_PI)
    if (opts.zeroPhase) phaseOffsetUp = 0;
    const phaseOffsetDown = phaseOffsetUp + PI;   // 逆位相
    const show = opts.show || 'both';
    return {
      dotCount: 10,
      draw(g, t, W, H, variant) {
        const showLines = variant !== 'dots';
        const baseTheta = PI * t / 1000 * 2;
        if (show === 'both' || show === 'up') {
          g.push();
          g.translate(W / 2, H / 2 - waveYOffset);
          upWave.update(baseTheta + phaseOffsetUp);
          upWave.display(g, showLines);
          g.pop();
        }
        if (show === 'both' || show === 'down') {
          g.push();
          g.translate(W / 2, H / 2 + waveYOffset);
          downWave.update(baseTheta + phaseOffsetDown);
          downWave.display(g, showLines);
          g.pop();
        }
      }
    };
  }

  /* Exp9・10 練習ステップ1：中央に1本 */
  function createCenterSingle(opts, rand) {
    const wave = new SingleWave(opts.noise, rand);
    let phaseOffset = rand() * TWO_PI;            // p.random(p.TWO_PI)
    if (opts.zeroPhase) phaseOffset = 0;
    return {
      dotCount: 10,
      draw(g, t, W, H, variant) {
        const baseTheta = PI * t / 1000 * 2;
        g.push();
        g.translate(W / 2, H / 2);
        wave.update(baseTheta + phaseOffset);
        wave.display(g, variant !== 'dots');
        g.pop();
      }
    };
  }

  /* ------------------------------------------------------------------
   * 4. 自由調整用の汎用刺激（パラメータ自由調整ページ）
   *    元の式を一般化したもの。周波数 1Hz・振幅 32px などの既定値で元の刺激と一致する。
   * ------------------------------------------------------------------ */
  function createGeneric(opts, rand) {
    // 点の数が変わっても同じ乱数列を使えるよう、多めに引いておく
    const POOL = 256;
    const rDev = [], rNT = [], rNoise = [];
    for (let i = 0; i < POOL; i++) rDev.push(rand());
    for (let i = 0; i < POOL; i++) rNT.push(PI * rand() * 2);
    for (let i = 0; i < POOL; i++) rNoise.push(PI * rand() * 2);

    return {
      draw(g, t, W, H, P) {
        const n = Math.max(1, Math.min(POOL - 1, Math.floor(P.long / P.xSpacing)));
        const xoffset = (W - P.xSpacing * (n - 1)) / 2;
        const ys = new Array(n);
        const showTarget = !P.detection || P.target;
        if (showTarget) {
          let x = PI * t / 1000 * (2 * P.freq);
          for (let i = 0; i < n; i++) {
            ys[i] = Math.sin(x) * P.amplitude + (rDev[i] * P.noise - P.noise / 2);
            x += (TWO_PI / P.period) * P.xSpacing;
          }
        } else {
          const x = PI * t / 1000 * (2 * P.freq);
          for (let i = 0; i < n; i++) ys[i] = Math.sin(rNT[i] + x) * P.amplitude;
        }
        const drawLines = (weight) => {
          for (let i = 0; i < n - 1; i++) {
            g.line(i * P.xSpacing + xoffset, H / 2 + ys[i], (i + 1) * P.xSpacing + xoffset, H / 2 + ys[i + 1]);
          }
        };
        if (P.style === 'under' && showTarget) {
          g.stroke(0); g.strokeWeight(P.lineWeight); g.noFill();
          drawLines();
        }
        g.noStroke(); g.fill(0);
        for (let i = 0; i < n; i++) g.ellipse(i * P.xSpacing + xoffset, H / 2 + ys[i], P.dot, P.dot);
        if (P.style === 'over' && showTarget) {
          g.stroke(0); g.strokeWeight(P.lineWeight);
          drawLines();
        }
        if (P.detection) {
          const x = PI * t / 1000 * (2 * P.noiseHz);
          g.noStroke(); g.fill(0);
          for (let i = 0; i < n + 1; i++) {
            g.ellipse(i * P.xSpacing + xoffset - P.xSpacing / 2, H / 2 + Math.sin(rNoise[i] + x) * P.amplitude, P.dot, P.dot);
          }
        }
      }
    };
  }

  const FACTORIES = {
    wave: createWave,
    detection: createDetection,
    cuedPair: createCuedPair,
    centerSingle: createCenterSingle,
    generic: createGeneric
  };

  SV.createStimulus = function (type, opts, rand) {
    const f = FACTORIES[type];
    if (!f) throw new Error('未知の刺激タイプ: ' + type);
    return f(opts || {}, rand);
  };

  SV.NOISE_CODE_TO_PX = NOISE_CODE_TO_PX;

  /* ------------------------------------------------------------------
   * 5. 注視点・手がかり・空白画面（「実験どおり」提示用）
   * ------------------------------------------------------------------ */
  const C = (global.p5 && global.p5.prototype) || {};
  SV.screens = {
    // Exp1〜3：jsPsych の別画面（白い背景に青い「+」、font-size 35px）
    htmlBluePlus(g, W, H) {
      g.background(255);
      g.noStroke();
      g.fill(0, 0, 255);
      g.textStyle(C.NORMAL);
      g.textSize(35);
      g.textAlign(C.CENTER, C.CENTER);
      g.text('+', W / 2, H / 2);
    },
    // Exp4・5：p5 のキャンバス内（灰色背景、青い「+」、textSize 32、文字揃えは既定のまま）
    p5BluePlus(g, W, H) {
      g.background(128);
      g.noStroke();
      g.textStyle(C.NORMAL);
      g.textSize(32);
      g.textAlign(C.LEFT, C.BASELINE);
      g.fill(0, 0, 255);
      g.text('+', W / 2, H / 2);
    },
    // Exp9・10：黒い十字（線の長さ ±15px、太さ 2px）
    blackCross(g, W, H) {
      g.background(128);
      g.stroke(0);
      g.strokeWeight(2);
      const cx = W / 2, cy = H / 2, len = 15;
      g.line(cx - len, cy, cx + len, cy);
      g.line(cx, cy - len, cx, cy + len);
    },
    // Exp9：矢印の手がかり（textSize 60、太字）
    arrowCue(g, W, H, side) {
      g.background(128);
      g.noStroke();
      g.fill(0);
      g.textSize(60);
      g.textStyle(C.BOLD);
      g.textAlign(C.CENTER, C.CENTER);
      g.text(side === 'down' ? '↓' : '↑', W / 2, H / 2);
      g.textStyle(C.NORMAL);
    },
    // 刺激の後は回答画面に切り替わる（Exp1〜8 は白、Exp9・10 は灰色のページ）
    blankWhite(g) { g.background(255); },
    blankGray(g) { g.background(128); }
  };

  SV.SCREEN_LABELS = {
    htmlBluePlus: '注視点（青い＋）',
    p5BluePlus: '注視点（青い＋）',
    blackCross: '注視点（黒い十字）',
    arrowCue: '矢印の手がかり'
  };
})(typeof window !== 'undefined' ? window : this);
