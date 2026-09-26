/*
 * image-generator.js — 刺激画像の書き出し
 *
 * 元の「実験刺激画像作成プログラム」（Exp1・Exp6 用：位相 0 に固定し、
 * 同じノイズで線あり／点のみの PNG を保存）を全実験に広げたもの。
 * 刺激の描画は stimuli.js を使うので、ビューアと同じ式・同じ乱数列になる。
 */
(function () {
  'use strict';
  const SV = window.SV;
  const esc = SV.escape;
  const LINE_TYPES = { wave: true, cuedPair: true, centerSingle: true };
  const GAP = 8; // コマ送り画像のコマ間（px）

  /* ---------- 画面 ---------- */
  const app = document.getElementById('app');
  app.innerHTML =
    '<header class="exp-head">' +
    '<div class="eyebrow">Export</div>' +
    '<h1 class="page-title">刺激画像の書き出し</h1>' +
    '<p class="lead">論文の図などに使う静止画を PNG で書き出します。元の画像作成プログラム（Exp1・Exp6 用）を全実験に広げたもので、既定では位相を 0 に固定した1コマを、実験と同じキャンバスの大きさで書き出します。</p>' +
    '</header>' +
    '<div class="tool-layout">' +
    '<form class="controls" id="controls" autocomplete="off">' +
    '<fieldset><legend>実験</legend><select id="exp" aria-label="実験">' +
    SV.EXPERIMENTS.map((e) => '<option value="' + e.id + '">Exp' + e.num + '：' + esc(e.title) + '</option>').join('') +
    '<option value="all">すべての実験</option></select></fieldset>' +
    '<fieldset><legend>条件</legend><div class="cond-list" id="cond-list"></div></fieldset>' +
    '<fieldset><legend>描き方</legend>' +
    '<select id="variant" aria-label="描き方">' +
    '<option value="orig">実験と同じ描き方</option>' +
    '<option value="dots">点のみ</option>' +
    '<option value="line">点＋線</option>' +
    '<option value="both">点のみ と 点＋線 の両方</option></select>' +
    '<p class="note">検出課題の刺激（Exp3〜5 の後半）は、実験と同じ描き方だけで書き出します。</p></fieldset>' +
    '<fieldset><legend>時間</legend>' +
    '<div class="field"><div class="field-row"><label for="time">書き出す時刻</label><span class="orig">ms</span></div><input type="number" id="time" min="0" max="10000" step="10" value="0"></div>' +
    '<label class="check"><input type="checkbox" id="zeroPhase" checked> ランダムな初期位相を 0 にする</label>' +
    '<div class="field"><div class="field-row"><label for="output">形式</label></div>' +
    '<select id="output"><option value="single">1コマ</option><option value="strip">コマ送り（縦に並べた1枚）</option></select></div>' +
    '<div class="field" id="strip-opts"><div class="field-row"><label for="frames">コマ数・間隔</label><span class="orig">枚 ・ ms</span></div>' +
    '<div class="btn-row" style="flex-wrap:nowrap"><input type="number" id="frames" min="2" max="20" step="1" value="5" aria-label="コマ数"><input type="number" id="interval" min="10" max="2000" step="10" value="100" aria-label="間隔（ms）"></div></div>' +
    '</fieldset>' +
    '<fieldset><legend>画像</legend>' +
    '<div class="field"><div class="field-row"><label for="seed">乱数のシード</label><span class="orig">全条件で共通</span></div><input type="number" id="seed" min="1" step="1" value="1"></div>' +
    '<div class="field"><div class="field-row"><label for="scale">解像度</label></div>' +
    '<select id="scale"><option value="1">1倍（実験と同じ画素数）</option><option value="2">2倍</option><option value="3">3倍</option></select></div>' +
    '<label class="check"><input type="checkbox" id="screens"> 注視点・矢印の画面も書き出す</label>' +
    '</fieldset>' +
    '</form>' +
    '<section aria-labelledby="results-title">' +
    '<div class="results-head"><h2 class="section-title" id="results-title">書き出す画像 <span class="note mono" id="count"></span></h2>' +
    '<button type="button" class="btn primary" id="zip">ZIP でまとめて保存</button></div>' +
    '<div class="results-grid" id="results"></div>' +
    '</section></div>';

  const $ = (id) => document.getElementById(id);

  /* ---------- 条件リスト ---------- */
  function selectedExps() {
    const v = $('exp').value;
    return v === 'all' ? SV.EXPERIMENTS : [SV.findExperiment(v)];
  }
  function renderCondList() {
    const exps = selectedExps();
    $('cond-list').innerHTML = exps.map((exp) => exp.sections.map((sec) => {
      const gid = exp.id + '-' + sec.key;
      return '<div class="cond-group" data-group="' + gid + '">' +
        '<div class="cond-group-title"><span>' + (exps.length > 1 ? 'Exp' + exp.num + '・' : '') + esc(sec.title) + '</span>' +
        '<button type="button" data-toggle="' + gid + '">すべて選択／解除</button></div>' +
        sec.conditions.map((c, i) => '<label class="check"><input type="checkbox" checked data-exp="' + exp.id + '" data-sec="' + sec.key + '" data-i="' + i + '"> ' + esc(c.label) + '</label>').join('') +
        '</div>';
    }).join('')).join('');
    $('cond-list').querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
      const boxes = $('cond-list').querySelectorAll('[data-group="' + b.dataset.toggle + '"] input');
      const allOn = Array.from(boxes).every((x) => x.checked);
      boxes.forEach((x) => { x.checked = !allOn; });
      schedule();
    }));
  }

  /* ---------- 描画 ---------- */
  let gen = null;
  new p5((p) => { p.setup = () => { p.noCanvas(); gen = p; schedule(); }; }, document.createElement('div'));

  const pad = (n, k) => String(n).padStart(k, '0');

  function readSettings() {
    return {
      variant: $('variant').value,
      time: Math.max(0, parseFloat($('time').value) || 0),
      zeroPhase: $('zeroPhase').checked,
      output: $('output').value,
      frames: Math.min(20, Math.max(2, parseInt($('frames').value, 10) || 5)),
      interval: Math.max(1, parseFloat($('interval').value) || 100),
      seed: Math.max(1, parseInt($('seed').value, 10) || 1),
      scale: parseInt($('scale').value, 10) || 1,
      screens: $('screens').checked
    };
  }

  function buildJobs(S) {
    const jobs = [];
    const exps = selectedExps();
    $('cond-list').querySelectorAll('input[type="checkbox"]:checked').forEach((box) => {
      const exp = SV.findExperiment(box.dataset.exp);
      const sec = exp.sections.find((s) => s.key === box.dataset.sec);
      const cond = sec.conditions[+box.dataset.i];
      let variants = [S.variant === 'orig' ? null : S.variant];
      if (!LINE_TYPES[cond.type]) variants = [null];
      else if (S.variant === 'both') variants = ['dots', 'line'];
      variants.forEach((v) => {
        let name = exp.id + (exp.sections.length > 1 ? '_' + sec.key : '') + '_' + cond.id + (v ? '_' + v : '');
        name += S.output === 'strip' ? '_strip' + S.frames + 'x' + S.interval + 'ms' : '_t' + pad(S.time, 4) + 'ms';
        if (S.scale > 1) name += '@' + S.scale + 'x';
        jobs.push({ kind: 'stim', exp, sec, cond, variant: v, name: name + '.png', label: 'Exp' + exp.num + '・' + cond.label + (v === 'dots' ? '（点のみ）' : v === 'line' ? '（点＋線）' : '') });
      });
    });
    if (S.screens) {
      const seen = {};
      exps.forEach((exp) => exp.sections.forEach((sec) => sec.trial.steps.forEach((st) => {
        if (st.stim) return;
        const sides = st.screen === 'arrowCue' ? ['up', 'down'] : [null];
        sides.forEach((side) => {
          const key = exp.id + st.screen + side;
          if (seen[key]) return;
          seen[key] = true;
          jobs.push({ kind: 'screen', exp, screen: st.screen, side, name: exp.id + '_screen_' + st.screen + (side ? '_' + side : '') + (S.scale > 1 ? '@' + S.scale + 'x' : '') + '.png', label: 'Exp' + exp.num + '・' + SV.SCREEN_LABELS[st.screen] + (side ? (side === 'up' ? ' ↑' : ' ↓') : '') });
        });
      })));
    }
    return jobs;
  }

  function toBlob(canvas) {
    return new Promise((res) => canvas.toBlob(res, 'image/png'));
  }

  // 描画用のバッファは大きさ・解像度ごとに1つ作って使い回す
  const buffers = {};
  function buffer(W, H, scale) {
    const key = W + 'x' + H + '@' + scale;
    if (!buffers[key]) {
      const g = gen.createGraphics(W, H);
      g.pixelDensity(scale);
      buffers[key] = g;
    }
    return buffers[key];
  }

  async function render(job, S) {
    const [W, H] = job.exp.canvas;
    const g = buffer(W, H, S.scale);
    let blob;
    if (job.kind === 'screen') {
      SV.screens[job.screen](g, W, H, job.side);
      blob = await toBlob(g.elt);
    } else {
      gen.randomSeed(S.seed);
      const opts = Object.assign({}, job.cond.opts, { zeroPhase: S.zeroPhase });
      const stim = SV.createStimulus(job.cond.type, opts, () => gen.random());
      const v = job.variant || undefined;
      if (S.output === 'strip') {
        const c = document.createElement('canvas');
        c.width = W * S.scale;
        c.height = (H * S.frames + GAP * (S.frames - 1)) * S.scale;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        for (let k = 0; k < S.frames; k++) {
          g.background(128);
          stim.draw(g, S.time + k * S.interval, W, H, v);
          ctx.drawImage(g.elt, 0, k * (H + GAP) * S.scale, W * S.scale, H * S.scale);
        }
        blob = await toBlob(c);
      } else {
        g.background(128);
        stim.draw(g, S.time, W, H, v);
        blob = await toBlob(g.elt);
      }
    }
    return blob;
  }

  let results = [];
  let runId = 0;
  async function generate() {
    const id = ++runId;
    const S = readSettings();
    $('strip-opts').hidden = S.output !== 'strip';
    const jobs = buildJobs(S);
    results.forEach((r) => URL.revokeObjectURL(r.url));
    results = [];
    const box = $('results');
    box.innerHTML = '';
    $('zip').disabled = true;
    if (!jobs.length) {
      box.innerHTML = '<p class="empty">条件を1つ以上選んでください。</p>';
      $('count').textContent = '';
      return;
    }
    for (let k = 0; k < jobs.length; k++) {
      if (id !== runId) return; // 設定が変わったら中断
      $('count').textContent = '作成中 ' + (k + 1) + ' / ' + jobs.length;
      const job = jobs[k];
      const blob = await render(job, S);
      if (id !== runId) return;
      const url = URL.createObjectURL(blob);
      const r = { name: job.name, folder: job.exp.id, blob, url };
      results.push(r);
      const [W, H] = job.exp.canvas;
      const h = S.output === 'strip' && job.kind === 'stim' ? H * S.frames + GAP * (S.frames - 1) : H;
      const tile = document.createElement('div');
      tile.className = 'result';
      tile.innerHTML = '<img alt="' + esc(job.label) + '" src="' + url + '">' +
        '<span class="fname">' + esc(job.name) + '</span>' +
        '<div class="meta"><span class="mono">' + W * S.scale + '×' + h * S.scale + ' px・' + Math.max(1, Math.round(blob.size / 1024)) + ' KB</span>' +
        '<button type="button" class="btn">保存</button></div>';
      tile.querySelector('button').addEventListener('click', () => download(blob, job.name));
      box.appendChild(tile);
    }
    $('count').textContent = results.length + ' 枚';
    $('zip').disabled = false;
  }

  let timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => { if (gen) generate(); }, 200);
  }

  /* ---------- 保存 ---------- */
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  // ZIP（無圧縮）を作る。PNG はすでに圧縮済みなので無圧縮で十分。
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  async function makeZip(files) {
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    const d = new Date();
    const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const f of files) {
      const data = new Uint8Array(await f.blob.arrayBuffer());
      const name = enc.encode(f.path);
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, dosTime, true);
      ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true);
      ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true);
      ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((a, c) => a + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(4, 0, true); end.setUint16(6, 0, true);
    end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true); end.setUint16(20, 0, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
  }
  SV.makeZip = makeZip; // 動作確認用

  $('zip').addEventListener('click', async () => {
    if (!results.length) return;
    const btn = $('zip');
    btn.disabled = true;
    const zip = await makeZip(results.map((r) => ({ path: r.folder + '/' + r.name, blob: r.blob })));
    const exp = $('exp').value;
    download(zip, (exp === 'all' ? 'all' : exp) + '_stimulus-images.zip');
    btn.disabled = false;
  });

  /* ---------- イベント ---------- */
  $('exp').addEventListener('change', () => { renderCondList(); schedule(); });
  $('cond-list').addEventListener('change', schedule);
  ['variant', 'time', 'zeroPhase', 'output', 'frames', 'interval', 'seed', 'scale', 'screens'].forEach((id) => {
    $(id).addEventListener('change', schedule);
    $(id).addEventListener('input', schedule);
  });
  $('controls').addEventListener('submit', (e) => e.preventDefault());

  renderCondList();
  $('strip-opts').hidden = true;
})();
