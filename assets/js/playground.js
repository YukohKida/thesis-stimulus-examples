/*
 * playground.js — パラメータ自由調整
 * 元の式を一般化した刺激（SV.createStimulus('generic')）をスライダーで動かす。
 */
(function () {
  'use strict';
  const SV = window.SV;
  const esc = SV.escape;
  const W = 800, H = 400;

  // 基準刺激（Exp1 の位置ノイズ 0px と同じ）
  const BASE = {
    style: 'dots', noise: 0, xSpacing: 32, long: 350, period: 250, amplitude: 32,
    freq: 1, dot: 16, lineWeight: 2, detection: false, target: true, noiseHz: 0
  };
  const SLIDERS = [
    { key: 'noise', label: '位置ノイズ', unit: 'px', min: 0, max: 300, step: 1, orig: '0〜288' },
    { key: 'xSpacing', label: '点の間隔', unit: 'px', min: 8, max: 80, step: 1, orig: '16・32・48' },
    { key: 'long', label: '波の長さ', unit: 'px', min: 64, max: 720, step: 1, orig: '223・350・448' },
    { key: 'period', label: '波長', unit: 'px', min: 60, max: 600, step: 1, orig: '180・250・320' },
    { key: 'amplitude', label: '振幅', unit: 'px', min: 0, max: 120, step: 1, orig: '32' },
    { key: 'freq', label: '波の周波数', unit: 'Hz', min: 0, max: 3, step: 0.05, orig: '1' },
    { key: 'dot', label: '点の直径', unit: 'px', min: 4, max: 40, step: 1, orig: '16' },
    { key: 'lineWeight', label: '線の太さ', unit: 'px', min: 1, max: 8, step: 1, orig: '2' },
    { key: 'noiseHz', label: '妨害ノイズの周波数', unit: 'Hz', min: 0, max: 2, step: 0.05, orig: '0〜1.0' }
  ];

  const q = SV.getQuery();
  const P = Object.assign({}, BASE);
  Object.keys(BASE).forEach((k) => {
    if (!q.has(k)) return;
    const v = q.get(k);
    if (typeof BASE[k] === 'boolean') P[k] = v === '1';
    else if (typeof BASE[k] === 'number') { const n = parseFloat(v); if (!isNaN(n)) P[k] = n; }
    else P[k] = v;
  });
  let seed = parseInt(q.get('seed'), 10) || 1;

  /* ---------- プリセット（実験の条件から） ---------- */
  const presets = [];
  SV.EXPERIMENTS.forEach((exp) => {
    const items = [];
    exp.sections.forEach((sec) => sec.conditions.forEach((c) => {
      let pr = null;
      if (c.type === 'wave') {
        pr = { style: c.opts.lines === 'over' ? 'over' : 'dots', noise: c.opts.noise || 0, xSpacing: c.opts.xSpacing || 32, long: c.opts.long || 350, period: c.opts.period || 250, detection: false };
      } else if (c.type === 'centerSingle') {
        pr = { style: 'under', noise: SV.NOISE_CODE_TO_PX[c.opts.noise], detection: false };
      } else if (c.type === 'detection' && c.opts.layout === 'center') {
        pr = { style: 'dots', noise: 0, detection: true, target: c.opts.target === 'present', noiseHz: c.opts.speed / 2 };
      }
      if (pr) items.push({ label: (exp.sections.length > 1 ? sec.title.split('：')[0] + '・' : '') + c.label, values: Object.assign({}, BASE, pr) });
    }));
    if (items.length) presets.push({ group: 'Exp' + exp.num + '：' + exp.title, items });
  });

  /* ---------- 画面 ---------- */
  const app = document.getElementById('app');
  app.innerHTML =
    '<header class="exp-head">' +
    '<div class="eyebrow">Playground</div>' +
    '<h1 class="page-title">パラメータ自由調整</h1>' +
    '<p class="lead">元の実験プログラムの式はそのままに、値だけを自由に変えられます。既定値は Exp1 の位置ノイズ 0 px（ノイズのない基準刺激）です。各スライダーの右に、実験で使った値を示しています。</p>' +
    '</header>' +
    '<div class="tool-layout">' +
    '<form class="controls" id="controls" autocomplete="off">' +
    '<fieldset><legend>実験の条件から読み込む</legend>' +
    '<select id="preset" aria-label="実験の条件から読み込む"><option value="">選んでください</option>' +
    presets.map((g, gi) => '<optgroup label="' + esc(g.group) + '">' +
      g.items.map((it, ii) => '<option value="' + gi + ':' + ii + '">' + esc(it.label) + '</option>').join('') + '</optgroup>').join('') +
    '</select></fieldset>' +
    '<fieldset><legend>描き方</legend>' +
    '<select id="style" aria-label="描き方">' +
    '<option value="dots">点のみ（Exp1〜5）</option>' +
    '<option value="over">点＋線、線が上（Exp6〜8）</option>' +
    '<option value="under">点＋線、線が下（Exp9・10）</option></select></fieldset>' +
    '<fieldset><legend>波</legend>' + SLIDERS.filter((s) => s.key !== 'noiseHz').map(sliderHTML).join('') + '</fieldset>' +
    '<fieldset><legend>検出課題の要素（Exp3〜5）</legend>' +
    '<label class="check"><input type="checkbox" id="detection"> 妨害ノイズの点を重ねる</label>' +
    '<label class="check"><input type="checkbox" id="target"> 標的の波を出す（外すと位相ばらばらの点列）</label>' +
    sliderHTML(SLIDERS.find((s) => s.key === 'noiseHz')) + '</fieldset>' +
    '<div class="btn-row">' +
    '<button type="button" class="btn" id="reseed">乱数を引き直す</button>' +
    '<button type="button" class="btn" id="reset">基準刺激に戻す</button>' +
    '<button type="button" class="btn" id="copy">この設定のリンクをコピー</button>' +
    '</div>' +
    '</form>' +
    '<div class="stage-card">' +
    '<div class="stage" id="stage" style="aspect-ratio:' + W + ' / ' + H + ';max-width:' + W + 'px"></div>' +
    '<p class="stage-note" id="scale-note"></p>' +
    '<dl class="readout" id="readout"></dl>' +
    '</div></div>';

  function sliderHTML(s) {
    return '<div class="field">' +
      '<div class="field-row"><label for="' + s.key + '">' + esc(s.label) + '</label>' +
      '<span><output id="' + s.key + '-out" for="' + s.key + '"></output> <span class="orig">実験 ' + esc(s.orig) + '</span></span></div>' +
      '<input type="range" id="' + s.key + '" min="' + s.min + '" max="' + s.max + '" step="' + s.step + '">' +
      '</div>';
  }

  const $ = (id) => document.getElementById(id);

  function fmt(s, v) {
    return (s.step < 1 ? Number(v).toFixed(2) : String(Math.round(v))) + ' ' + s.unit;
  }

  function writeControls() {
    SLIDERS.forEach((s) => { $(s.key).value = P[s.key]; $(s.key + '-out').textContent = fmt(s, P[s.key]); });
    $('style').value = P.style;
    $('detection').checked = P.detection;
    $('target').checked = P.target;
    $('target').disabled = !P.detection;
    $('noiseHz').disabled = !P.detection;
    $('lineWeight').disabled = P.style === 'dots';
    updateReadout();
  }

  function updateReadout() {
    const n = Math.floor(P.long / P.xSpacing);
    const phase = 360 * P.xSpacing / P.period;
    const rows = [
      ['点の数', n + ' 個'],
      ['隣の点との位相差', phase.toFixed(1) + '°'],
      ['波が進む速さ', (P.period * P.freq).toFixed(0) + ' px/秒（左向き）'],
      ['1周期', P.freq > 0 ? (1000 / P.freq).toFixed(0) + ' ms' : '止まっています'],
      ['乱数のシード', String(seed)]
    ];
    $('readout').innerHTML = rows.map((r) => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('');
  }

  let urlTimer = null;
  function saveURL() {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(() => {
      const o = { seed: seed === 1 ? null : seed };
      Object.keys(BASE).forEach((k) => {
        const v = P[k];
        o[k] = v === BASE[k] ? null : (typeof v === 'boolean' ? (v ? '1' : '0') : v);
      });
      SV.setQuery(o);
    }, 250);
  }

  SLIDERS.forEach((s) => $(s.key).addEventListener('input', (e) => {
    P[s.key] = parseFloat(e.target.value);
    $(s.key + '-out').textContent = fmt(s, P[s.key]);
    $('preset').value = '';
    updateReadout(); saveURL();
  }));
  $('style').addEventListener('change', (e) => { P.style = e.target.value; $('preset').value = ''; writeControls(); saveURL(); });
  $('detection').addEventListener('change', (e) => { P.detection = e.target.checked; if (!P.detection) P.target = true; $('preset').value = ''; writeControls(); saveURL(); });
  $('target').addEventListener('change', (e) => { P.target = e.target.checked; $('preset').value = ''; writeControls(); saveURL(); });
  $('preset').addEventListener('change', (e) => {
    if (!e.target.value) return;
    const [gi, ii] = e.target.value.split(':').map(Number);
    Object.assign(P, presets[gi].items[ii].values);
    writeControls(); saveURL();
  });
  $('reset').addEventListener('click', () => { Object.assign(P, BASE); $('preset').value = ''; writeControls(); saveURL(); });
  $('reseed').addEventListener('click', () => { seed = SV.newSeed(); rebuild(); updateReadout(); saveURL(); });
  $('copy').addEventListener('click', (e) => SV.copyText(window.location.href, e.currentTarget));
  $('controls').addEventListener('submit', (e) => e.preventDefault());

  /* ---------- 描画 ---------- */
  let stim = null, inst = null;
  const clock0 = performance.now();
  function rebuild() {
    inst.randomSeed(seed);
    stim = SV.createStimulus('generic', {}, () => inst.random());
  }
  inst = SV.createPanel($('stage'), {
    W, H, observe: false,
    onSetup: (p) => { inst = p; rebuild(); },
    onDraw: (p) => {
      p.background(128);
      stim.draw(p, performance.now() - clock0, W, H, P);
    }
  });

  function updateScale() {
    const w = $('stage').clientWidth;
    const s = w / W;
    $('scale-note').textContent = s >= 0.995
      ? 'キャンバス ' + W + ' × ' + H + ' px（原寸）'
      : 'キャンバス ' + W + ' × ' + H + ' px を ' + Math.round(s * 100) + '% に縮小して表示しています。原寸で見るには画面を広げてください。';
  }
  window.addEventListener('resize', updateScale);

  writeControls();
  updateScale();
})();
