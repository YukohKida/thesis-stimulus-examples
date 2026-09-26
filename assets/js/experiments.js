/*
 * experiments.js — 実験ごとの条件表
 *
 * 見出し・説明文はここを書き換えれば全ページに反映される。
 * code は元の実験プログラムでの条件番号（shape / noise など）。
 */
(function (global) {
  'use strict';
  const SV = (global.SV = global.SV || {});

  const px = (v) => v + ' px';
  const hz = (speed) => (speed / 2).toFixed(1) + ' Hz';
  const pad3 = (v) => String(v).padStart(3, '0');

  /* ---------- 注視点などの時間構成 ---------- */
  const TRIAL = {
    html2000: { steps: [{ screen: 'htmlBluePlus', ms: 500 }, { stim: true, ms: 2000, tOffset: 0 }], after: 'blankWhite' },
    html1000: { steps: [{ screen: 'htmlBluePlus', ms: 500 }, { stim: true, ms: 1000, tOffset: 0 }], after: 'blankWhite' },
    p5_2000: { steps: [{ screen: 'p5BluePlus', ms: 500 }, { stim: true, ms: 2000, tOffset: 0 }], after: 'blankWhite' },
    p5_1000: { steps: [{ screen: 'p5BluePlus', ms: 500 }, { stim: true, ms: 1000, tOffset: 0 }], after: 'blankWhite' },
    continuous: { steps: [{ stim: true, ms: null, tOffset: 0 }], after: null },
    cueDual: { steps: [{ screen: 'blackCross', ms: 1000 }, { screen: 'arrowCue', ms: 1000 }, { stim: true, ms: 2000, tOffset: 2000 }], after: 'blankGray' },
    crossSingle: { steps: [{ screen: 'blackCross', ms: 1000 }, { stim: true, ms: 2000, tOffset: 1000 }], after: 'blankGray' }
  };

  /* ---------- 条件の組み立て ---------- */
  function noiseWaveConds(levels, opts) {
    return levels.map((n, i) => ({
      id: 'noise' + pad3(n) + 'px',
      code: i,
      label: '位置ノイズ ' + px(n),
      params: [['位置ノイズ', px(n)]],
      type: 'wave',
      opts: Object.assign({ noise: n }, opts || {})
    }));
  }

  // Exp3・4 後半：shape 0〜5 は 標的あり（上）、6〜11 は なし（下）
  // 速度係数は元コードと同じ式で計算する（0〜5：k/10*4、6〜11：k*4/10）
  function detection612(layout) {
    const rows = layout === 'updown' ? ['up', 'down'] : ['present', 'absent'];
    const rowName = layout === 'updown' ? { up: '標的：上', down: '標的：下' } : { present: '標的あり', absent: '標的なし' };
    const conds = [];
    rows.forEach((target, r) => {
      for (let k = 0; k < 6; k++) {
        const speed = r === 0 ? k / 10 * 4 : k * 4 / 10;
        conds.push({
          id: target + '_' + hz(speed).replace(' ', ''),
          code: r * 6 + k,
          row: r, col: k,
          label: rowName[target] + '・妨害ノイズ ' + hz(speed),
          params: [[layout === 'updown' ? '標的の位置' : '標的', rowName[target].replace('標的：', '').replace('標的', '')], ['妨害ノイズ', hz(speed)], ['速度係数', String(+speed.toFixed(2))]],
          type: 'detection',
          opts: { layout, target, speed }
        });
      }
    });
    return {
      conds,
      rows: rows.map((t) => rowName[t]),
      cols: [0, 1, 2, 3, 4, 5].map((k) => hz(k / 10 * 4))
    };
  }

  // Exp5：shape 0〜2 は標的あり、3〜5 は標的なし、速度係数 = 0・1・2
  function detection5() {
    const conds = [];
    ['present', 'absent'].forEach((target, r) => {
      for (let k = 0; k < 3; k++) {
        const speed = k;
        conds.push({
          id: target + '_' + hz(speed).replace(' ', ''),
          code: r * 3 + k,
          row: r, col: k,
          label: (r === 0 ? '標的あり' : '標的なし') + '・妨害ノイズ ' + hz(speed),
          params: [['標的', r === 0 ? 'あり' : 'なし'], ['妨害ノイズ', hz(speed)], ['速度係数', String(speed)]],
          type: 'detection',
          opts: { layout: 'center', target, speed }
        });
      }
    });
    return { conds, rows: ['標的あり', '標的なし'], cols: [0, 1, 2].map(hz) };
  }

  const NOISE4 = [0, 48, 96, 144];

  function exp9Matrix() {
    const conds = [];
    for (let u = 0; u < 4; u++) {
      for (let d = 0; d < 4; d++) {
        conds.push({
          id: 'up' + pad3(NOISE4[u]) + '_down' + pad3(NOISE4[d]),
          code: u * 4 + d,
          row: u, col: d,
          label: '上 ' + px(NOISE4[u]) + '・下 ' + px(NOISE4[d]),
          params: [['上の位置ノイズ', px(NOISE4[u])], ['下の位置ノイズ', px(NOISE4[d])]],
          type: 'cuedPair',
          opts: { noiseUp: u, noiseDown: d, show: 'both' }
        });
      }
    }
    return { conds, rows: NOISE4.map((n) => '上 ' + px(n)), cols: NOISE4.map((n) => '下 ' + px(n)) };
  }

  function exp10Matrix() {
    const conds = [];
    ['up', 'down'].forEach((side, r) => {
      for (let k = 0; k < 4; k++) {
        conds.push({
          id: side + '_noise' + pad3(NOISE4[k]) + 'px',
          code: r * 4 + k,
          row: r, col: k,
          label: (side === 'up' ? '上' : '下') + 'に表示・位置ノイズ ' + px(NOISE4[k]),
          params: [['表示位置', side === 'up' ? '上' : '下'], ['位置ノイズ', px(NOISE4[k])]],
          type: 'cuedPair',
          opts: { noiseUp: k, noiseDown: k, show: side }
        });
      }
    });
    return { conds, rows: ['上に表示', '下に表示'], cols: NOISE4.map(px) };
  }

  function centerSingleConds() {
    return NOISE4.map((n, k) => ({
      id: 'center_noise' + pad3(n) + 'px',
      code: k,
      label: '位置ノイズ ' + px(n),
      params: [['位置ノイズ', px(n)]],
      type: 'centerSingle',
      opts: { noise: k }
    }));
  }

  const exp2Conds = [
    { code: 0, id: 'baseline', label: '基準', params: [['点の間隔', '32 px'], ['長さ', '350 px'], ['波長', '250 px'], ['点の数', '10']], opts: {} },
    { code: 1, id: 'spacing16', label: '点の間隔 16 px', params: [['点の間隔', '16 px'], ['点の数', '21']], opts: { xSpacing: 16 } },
    { code: 2, id: 'spacing48', label: '点の間隔 48 px', params: [['点の間隔', '48 px'], ['点の数', '7']], opts: { xSpacing: 48 } },
    { code: 3, id: 'long223', label: '長さ 223 px', params: [['長さ', '223 px'], ['点の数', '6']], opts: { long: 223 } },
    { code: 4, id: 'long448', label: '長さ 448 px', params: [['長さ', '448 px'], ['点の数', '14']], opts: { long: 448 } },
    { code: 5, id: 'period180', label: '波長 180 px', params: [['波長', '180 px'], ['点の数', '10']], opts: { period: 180 } },
    { code: 6, id: 'period320', label: '波長 320 px', params: [['波長', '320 px'], ['点の数', '10']], opts: { period: 320 } }
  ].map((c) => Object.assign({ type: 'wave' }, c, { opts: Object.assign({ noise: 0 }, c.opts) }));

  const d3 = detection612('updown');
  const d4 = detection612('center');
  const d5 = detection5();
  const m9 = exp9Matrix();
  const m10 = exp10Matrix();

  const rating = (words) => words.map((w) => '「' + w + '」').join('・');

  SV.EXPERIMENTS = [
    {
      id: 'exp01', num: 1,
      title: '位置ノイズと3つの印象評定',
      summary: '10個の点がつくる波に、点ごとの上下のずれ（位置ノイズ）を 0〜288 px の7段階で加えた。',
      task: '刺激を2秒見た後に、' + rating(['バラバラに動いて見えた度合い', '生き物っぽさ', '不快さ']) + 'をブロックごとに 0〜100 で評定。',
      design: '7条件 × 4回 × 3ブロック = 84試行',
      canvas: [800, 400],
      thumb: ['main', 0],
      sections: [
        { key: 'main', title: '本番', trial: TRIAL.html2000, conditions: noiseWaveConds([0, 48, 96, 144, 192, 240, 288]) }
      ]
    },
    {
      id: 'exp02', num: 2,
      title: '波の形：点の間隔・長さ・波長',
      summary: '位置ノイズはなし。点の間隔、波全体の長さ、波長をそれぞれ2方向に変えた6条件と基準の7条件。',
      task: '刺激を2秒見た後に、' + rating(['生き物っぽさ', '不快さ']) + 'をブロックごとに評定。',
      design: '7条件 × 4回 × 2ブロック = 56試行',
      canvas: [800, 400],
      thumb: ['main', 0],
      sections: [
        { key: 'main', title: '本番', trial: TRIAL.html2000, conditions: exp2Conds }
      ]
    },
    {
      id: 'exp03', num: 3,
      title: '位置ノイズの評定と上下の検出',
      summary: '前半は Exp1 と同じ波を評定。後半は上下2か所に点列を出し、片方だけが波（標的）、もう片方は各点がばらばらの位相で上下する。両方に同じ妨害ノイズの点が重なる。',
      task: '前半は' + rating(['生き物っぽさ', '不快さ']) + 'を評定。後半は上下のどちらにヘビの様なパターンが見えたかを2択で回答。',
      design: '前半 3条件 × 4回 × 2ブロック、後半 12条件 × 2回 × 5セット = 120試行',
      canvas: [800, 400],
      thumb: ['detect', 1],
      sections: [
        { key: 'rating', title: '前半：印象評定', trial: TRIAL.html2000, conditions: noiseWaveConds([0, 144, 288]) },
        { key: 'detect', title: '後半：上下どちらにヘビがいたか', trial: TRIAL.html1000, conditions: d3.conds, matrix: { rows: d3.rows, cols: d3.cols, rowTitle: '標的の位置', colTitle: '妨害ノイズの周波数' } }
      ]
    },
    {
      id: 'exp04', num: 4,
      title: '位置ノイズの評定と有無の検出',
      summary: '前半は Exp3 と同じ刺激で、注視点を p5 のキャンバス内に描く。後半は中央1か所に、波（標的あり）か位相がばらばらの点列（標的なし）を出し、妨害ノイズの点を重ねた。',
      task: '前半は' + rating(['生き物っぽさ', '不快さ']) + 'を評定。後半はヘビの様なパターンが「見えた／見えなかった」で回答。',
      design: '前半 3条件 × 4回 × 2ブロック、後半 12条件 × 2回 × 5セット = 120試行',
      canvas: [800, 400],
      thumb: ['detect', 1],
      sections: [
        { key: 'rating', title: '前半：印象評定', trial: TRIAL.p5_2000, conditions: noiseWaveConds([0, 144, 288]) },
        { key: 'detect', title: '後半：ヘビが見えたか', trial: TRIAL.p5_1000, conditions: d4.conds, matrix: { rows: d4.rows, cols: d4.cols, rowTitle: '標的', colTitle: '妨害ノイズの周波数' } }
      ]
    },
    {
      id: 'exp05', num: 5,
      title: '妨害ノイズの速さと生き物の気配',
      summary: 'Exp4 後半と同じ種類の刺激で、妨害ノイズの周波数を 0・0.5・1.0 Hz の3段階にした。前半と後半で同じ刺激を使う。',
      task: '前半は' + rating(['生き物がいそうだと感じる程度', '不気味な雰囲気を感じる程度']) + 'を評定。後半は「見えた／見えなかった」で回答。',
      design: '前半 6条件 × 2回 × 2ブロック × 2項目 = 48試行、後半 6条件 × 2回 × 5セット = 60試行',
      canvas: [800, 400],
      thumb: ['main', 1],
      sections: [
        { key: 'main', title: '前半・後半共通', trial: TRIAL.p5_1000, conditions: d5.conds, matrix: { rows: d5.rows, cols: d5.cols, rowTitle: '標的', colTitle: '妨害ノイズの周波数' } }
      ]
    },
    {
      id: 'exp06', num: 6,
      title: '線で結んだ波の生き物らしさ',
      summary: '点と点を線で結んだ波に、位置ノイズを 0〜144 px の4段階で加えた。刺激は回答画面の上に表示され続ける。',
      task: '刺激を見ながら「どのくらい生き物らしいと感じるか」を 0〜100 で評定。',
      design: '4条件 × 9回 × 2セット = 72試行（練習4試行）',
      canvas: [800, 400],
      thumb: ['main', 0],
      sections: [
        { key: 'main', title: '本番・練習', trial: TRIAL.continuous, conditions: noiseWaveConds(NOISE4, { lines: 'over' }) }
      ]
    },
    {
      id: 'exp07', num: 7,
      title: '線で結んだ波の滑らかさ',
      summary: 'Exp6 と同じ刺激。評定する印象だけが異なる。',
      task: '刺激を見ながら「どのくらい滑らかに動いていると感じるか」を 0〜100 で評定。',
      design: '4条件 × 9回 × 2セット = 72試行（練習4試行）',
      canvas: [800, 400],
      thumb: ['main', 0],
      sections: [
        { key: 'main', title: '本番・練習', trial: TRIAL.continuous, conditions: noiseWaveConds(NOISE4, { lines: 'over' }) }
      ]
    },
    {
      id: 'exp08', num: 8,
      title: '線で結んだ波の美しさ',
      summary: 'Exp6 と同じ刺激。評定する印象だけが異なる。',
      task: '刺激を見ながら「どのくらい美しいと感じるか」を 0〜100 で評定。',
      design: '4条件 × 9回 × 2セット = 72試行（練習4試行）',
      canvas: [800, 400],
      thumb: ['main', 0],
      sections: [
        { key: 'main', title: '本番・練習', trial: TRIAL.continuous, conditions: noiseWaveConds(NOISE4, { lines: 'over' }) }
      ]
    },
    {
      id: 'exp09', num: 9,
      title: '矢印で注意を向けた上下2本の波',
      summary: '上下に2本の波を逆位相で同時に出し、直前の矢印で一方に注意を向けさせた。上下それぞれの位置ノイズ4段階を組み合わせた16通り。',
      task: '矢印で示された側の物体の「生き物らしさ」を評定。',
      design: '注目側2 × 上4 × 下4 = 32条件 × 2セット = 64試行（制約付きランダム化）、練習8試行',
      canvas: [900, 600],
      cue: true,
      thumb: ['main', 0],
      sections: [
        { key: 'main', title: '本番・練習ステップ2', trial: TRIAL.cueDual, conditions: m9.conds, matrix: { rows: m9.rows, cols: m9.cols, rowTitle: '上の波', colTitle: '下の波' } },
        { key: 'practice1', title: '練習ステップ1：中央に1本', trial: TRIAL.crossSingle, conditions: centerSingleConds() }
      ]
    },
    {
      id: 'exp10', num: 10,
      title: '注目側に1本だけ出す波',
      summary: 'Exp9 と同じ試行行列を使うが、画面には注目側の1本だけを出し、矢印は出さない。',
      task: '表示された物体の「生き物らしさ」を評定。',
      design: '32条件 × 2セット = 64試行、練習8試行',
      canvas: [900, 600],
      thumb: ['main', 0],
      sections: [
        { key: 'main', title: '本番・練習ステップ2', trial: TRIAL.crossSingle, conditions: m10.conds, matrix: { rows: m10.rows, cols: m10.cols, rowTitle: '表示位置', colTitle: '位置ノイズ' } },
        { key: 'practice1', title: '練習ステップ1：中央に1本', trial: TRIAL.crossSingle, conditions: centerSingleConds() }
      ]
    }
  ];

  SV.findExperiment = function (id) {
    return SV.EXPERIMENTS.find((e) => e.id === id);
  };

  /* 「実験どおり」の時間構成を文章にする（例：＋ 500 ms → 刺激 2000 ms） */
  SV.describeTrial = function (trial, cueSide) {
    return trial.steps.map((s) => {
      if (s.stim) return s.ms == null ? '刺激（回答するまで表示）' : '刺激 ' + s.ms + ' ms';
      const name = s.screen === 'arrowCue' ? '矢印' : (s.screen === 'blackCross' ? '十字' : '＋');
      return name + ' ' + s.ms + ' ms';
    });
  };
})(typeof window !== 'undefined' ? window : this);
