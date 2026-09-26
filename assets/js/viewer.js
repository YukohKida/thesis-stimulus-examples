/*
 * viewer.js — 実験ページ（全条件の一覧、原寸表示、ループ／実験どおりの切り替え）
 */
(function () {
  'use strict';
  const SV = window.SV;
  const exp = SV.findExperiment(document.body.dataset.exp);
  const app = document.getElementById('app');
  const esc = SV.escape;
  const [W, H] = exp.canvas;
  const q = SV.getQuery();

  const state = {
    mode: q.get('mode') === 'trial' ? 'trial' : 'loop',
    seed: parseInt(q.get('seed'), 10) || 1,
    cue: q.get('cue') === 'down' ? 'down' : 'up',
    clock0: performance.now(),
    trial0: performance.now(),
    repeat: false
  };

  const allConds = [];
  exp.sections.forEach((sec) => sec.conditions.forEach((cond, i) => allConds.push({ sec, cond, i })));
  const continuous = exp.sections.every((s) => s.trial.steps.some((st) => st.stim && st.ms == null));
  const trialTotal = Math.max.apply(null, exp.sections.map((s) =>
    s.trial.steps.reduce((a, st) => a + (st.ms == null ? 0 : st.ms), 0)));

  /* ---------- ページの組み立て ---------- */
  function timelineHTML(sec) {
    const parts = SV.describeTrial(sec.trial).map((txt, k) => {
      const isStim = sec.trial.steps[k].stim;
      return '<span class="step' + (isStim ? ' stim' : '') + '">' + esc(txt) + '</span>';
    });
    if (sec.trial.after) parts.push('<span class="step">回答画面</span>');
    return '<span class="timeline" title="「実験どおり」で再現する時間構成"><span>実験どおり：</span>' +
      parts.join('<span class="arrow" aria-hidden="true">→</span>') + '</span>';
  }

  function panelHTML(sec, cond, i, withCaption) {
    let params = cond.params.map((pp) => pp[0] + ' ' + pp[1]).join('・');
    if (params === cond.label) params = '';
    return '<button type="button" class="panel" data-sec="' + sec.key + '" data-i="' + i + '" aria-label="' + esc(cond.label) + '（原寸で表示）" title="' + esc(cond.label) + '">' +
      '<div class="stage" style="aspect-ratio:' + W + ' / ' + H + '"></div>' +
      (withCaption ? '<div class="panel-cap"><span class="label">' + esc(cond.label) + '</span>' + (params ? '<span class="params">' + esc(params) + '</span>' : '') + '</div>' : '') +
      '</button>';
  }

  function sectionHTML(sec) {
    let inner;
    if (sec.matrix) {
      const m = sec.matrix;
      const minCell = W > 850 ? 190 : 150;
      let cells = '<div class="corner">' + esc(m.colTitle) + ' →<br>' + esc(m.rowTitle) + ' ↓</div>';
      m.cols.forEach((c) => { cells += '<div class="col-h">' + esc(c) + '</div>'; });
      m.rows.forEach((r, ri) => {
        cells += '<div class="row-h">' + esc(r) + '</div>';
        m.cols.forEach((c, ci) => {
          const i = sec.conditions.findIndex((cd) => cd.row === ri && cd.col === ci);
          cells += panelHTML(sec, sec.conditions[i], i, false);
        });
      });
      const minW = 110 + m.cols.length * (minCell + 10);
      inner = '<div class="matrix-scroll"><div class="matrix" style="min-width:' + minW + 'px;grid-template-columns:auto repeat(' + m.cols.length + ', minmax(0, 1fr))">' + cells + '</div></div>';
    } else {
      inner = '<div class="panel-grid">' + sec.conditions.map((c, i) => panelHTML(sec, c, i, true)).join('') + '</div>';
    }
    return '<section class="exp-section" id="sec-' + sec.key + '">' +
      '<div class="sec-head"><h2 class="section-title">' + esc(sec.title) + '</h2>' + timelineHTML(sec) + '</div>' +
      inner + '</section>';
  }

  const idx = SV.EXPERIMENTS.indexOf(exp);
  const prevExp = SV.EXPERIMENTS[idx - 1];
  const nextExp = SV.EXPERIMENTS[idx + 1];
  const expLink = (e, dir) => e
    ? '<a class="btn" href="../' + e.id + '/index.html">' + (dir < 0 ? '← ' : '') + 'Exp' + e.num + '：' + esc(e.title) + (dir > 0 ? ' →' : '') + '</a>'
    : '<span></span>';

  document.title = 'Exp' + exp.num + '：' + exp.title + ' | ' + SV.SITE_NAME;

  app.innerHTML =
    '<a class="back" href="../index.html">← 実験一覧</a>' +
    '<header class="exp-head">' +
    '<div class="eyebrow">Exp ' + String(exp.num).padStart(2, '0') + ' / 10</div>' +
    '<h1 class="page-title">' + esc(exp.title) + '</h1>' +
    '<p class="lead">' + esc(exp.summary) + '</p>' +
    '<dl class="facts">' +
    '<dt>課題</dt><dd>' + esc(exp.task) + '</dd>' +
    '<dt>試行数</dt><dd>' + esc(exp.design) + '</dd>' +
    '<dt>キャンバス</dt><dd><span class="mono">' + W + ' × ' + H + ' px</span>・背景 <span class="mono">RGB(128, 128, 128)</span></dd>' +
    '</dl></header>' +
    '<div class="toolbar" role="toolbar" aria-label="表示の設定">' +
    '<div class="seg" role="group" aria-label="提示モード">' +
    '<button type="button" data-mode="loop">ループ</button>' +
    '<button type="button" data-mode="trial">実験どおり</button></div>' +
    '<button type="button" class="btn primary" id="replay">▶ もう一度提示</button>' +
    '<label class="check" id="repeat-wrap"><input type="checkbox" id="repeat"> くり返す</label>' +
    (exp.cue ? '<div class="seg" role="group" aria-label="矢印の向き" id="cue-seg">' +
      '<button type="button" data-cue="up">矢印 ↑</button><button type="button" data-cue="down">矢印 ↓</button></div>' : '') +
    '<span class="status" id="status" aria-live="polite"></span>' +
    '<span class="spacer"></span>' +
    '<button type="button" class="btn" id="reseed">乱数を引き直す</button>' +
    '<span class="seed">シード <span id="seed-val"></span></span>' +
    '</div>' +
    '<p class="note" style="margin:-16px 0 24px">位置ノイズや初期位相は元の実験でも試行ごとの乱数です。ここでは全条件に同じ乱数列を使うので、条件の違いだけを見比べられます。刺激をクリックすると原寸で表示します。</p>' +
    exp.sections.map(sectionHTML).join('') +
    '<nav class="btn-row" style="justify-content:space-between;margin-top:48px" aria-label="ほかの実験">' +
    expLink(prevExp, -1) + expLink(nextExp, 1) + '</nav>';

  /* ---------- 描画 ---------- */
  function buildStim(p, cond) {
    p.randomSeed(state.seed);
    return SV.createStimulus(cond.type, cond.opts, () => p.random());
  }

  function drawFrame(p, sec, ref) {
    const now = performance.now();
    if (state.mode === 'loop') {
      p.background(128);
      ref.stim.draw(p, now - state.clock0, W, H);
      return;
    }
    const e = now - state.trial0;
    let acc = 0;
    for (const st of sec.trial.steps) {
      const dur = st.ms == null ? Infinity : st.ms;
      if (e < acc + dur) {
        if (st.stim) {
          p.background(128);
          ref.stim.draw(p, e - acc + st.tOffset, W, H);
        } else {
          SV.screens[st.screen](p, W, H, state.cue);
        }
        return;
      }
      acc += dur;
    }
    if (sec.trial.after) SV.screens[sec.trial.after](p, W, H);
  }

  const panels = [];
  app.querySelectorAll('.panel').forEach((btn) => {
    const sec = exp.sections.find((s) => s.key === btn.dataset.sec);
    const cond = sec.conditions[+btn.dataset.i];
    const holder = btn.querySelector('.stage');
    const ref = { stim: null };
    const inst = SV.createPanel(holder, {
      W, H, density: 1,
      onSetup: (p) => { ref.stim = buildStim(p, cond); },
      onDraw: (p) => drawFrame(p, sec, ref)
    });
    panels.push({ inst, cond, ref });
    btn.addEventListener('click', () => openDialog(sec, +btn.dataset.i));
  });

  /* ---------- 操作 ---------- */
  const $ = (sel) => app.querySelector(sel);
  const replayBtn = $('#replay');
  const repeatWrap = $('#repeat-wrap');
  const statusEl = $('#status');
  const cueSeg = $('#cue-seg');

  function syncUI() {
    app.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
    const trial = state.mode === 'trial';
    replayBtn.hidden = !trial;
    repeatWrap.hidden = !trial || continuous;
    if (cueSeg) {
      cueSeg.hidden = !trial;
      cueSeg.querySelectorAll('[data-cue]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cue === state.cue)));
    }
    $('#seed-val').textContent = state.seed;
    if (dlg) dlgSync();
  }

  function restartTrial() { state.trial0 = performance.now(); }

  app.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    state.mode = b.dataset.mode;
    if (state.mode === 'trial') restartTrial();
    SV.setQuery({ mode: state.mode === 'trial' ? 'trial' : null });
    syncUI();
  }));
  replayBtn.addEventListener('click', restartTrial);
  $('#repeat').addEventListener('change', (e) => { state.repeat = e.target.checked; });
  if (cueSeg) {
    cueSeg.querySelectorAll('[data-cue]').forEach((b) => b.addEventListener('click', () => {
      state.cue = b.dataset.cue;
      SV.setQuery({ cue: state.cue === 'down' ? 'down' : null });
      restartTrial();
      syncUI();
    }));
  }
  $('#reseed').addEventListener('click', () => {
    state.seed = SV.newSeed();
    panels.forEach((pn) => { pn.ref.stim = buildStim(pn.inst, pn.cond); pn.inst.redraw(); });
    if (dlgInst && dlgCur) { dlgRef.stim = buildStim(dlgInst, dlgCur.cond); }
    if (state.mode === 'trial') restartTrial();
    SV.setQuery({ seed: state.seed });
    syncUI();
  });

  // 状態表示と「くり返す」
  function tick() {
    const now = performance.now();
    if (state.mode === 'trial') {
      if (continuous) {
        statusEl.textContent = '回答するまで表示が続く実験です';
      } else {
        const e = now - state.trial0;
        if (e < trialTotal) {
          statusEl.textContent = '提示中 ' + (e / 1000).toFixed(1) + ' 秒';
        } else {
          statusEl.textContent = '提示が終わりました';
          if (state.repeat && e > trialTotal + 1200) restartTrial();
        }
      }
    } else {
      statusEl.textContent = '';
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ---------- 原寸表示 ---------- */
  let dlg = null, dlgInst = null, dlgCur = null;
  const dlgRef = { stim: null };
  let dlgEls = {};

  function ensureDialog() {
    if (dlg) return;
    dlg = document.createElement('dialog');
    dlg.className = 'viewer';
    dlg.setAttribute('aria-labelledby', 'dlg-title');
    dlg.innerHTML =
      '<div class="dlg-inner">' +
      '<div class="dlg-head"><div><div class="eyebrow" id="dlg-eyebrow"></div><h2 id="dlg-title"></h2><p class="dlg-params" id="dlg-params"></p></div>' +
      '<button type="button" class="btn" id="dlg-close">閉じる</button></div>' +
      '<div class="dlg-stage-wrap" id="dlg-wrap"><div class="dlg-stage" id="dlg-stage"></div></div>' +
      '<div class="dlg-foot"><span class="scale" id="dlg-scale"></span>' +
      '<div class="dlg-actions">' +
      '<div class="seg" role="group" aria-label="提示モード"><button type="button" data-dmode="loop">ループ</button><button type="button" data-dmode="trial">実験どおり</button></div>' +
      '<button type="button" class="btn primary" id="dlg-replay">▶ もう一度提示</button>' +
      '<button type="button" class="btn" id="dlg-prev">← 前の条件</button>' +
      '<button type="button" class="btn" id="dlg-next">次の条件 →</button>' +
      '<button type="button" class="btn" id="dlg-link">この条件のリンクをコピー</button>' +
      '</div></div></div>';
    document.body.appendChild(dlg);
    dlgEls = {
      eyebrow: dlg.querySelector('#dlg-eyebrow'), title: dlg.querySelector('#dlg-title'),
      params: dlg.querySelector('#dlg-params'), stage: dlg.querySelector('#dlg-stage'),
      wrap: dlg.querySelector('#dlg-wrap'), scale: dlg.querySelector('#dlg-scale'),
      replay: dlg.querySelector('#dlg-replay')
    };
    dlg.querySelector('#dlg-close').addEventListener('click', () => dlg.close());
    dlg.querySelector('#dlg-prev').addEventListener('click', () => step(-1));
    dlg.querySelector('#dlg-next').addEventListener('click', () => step(1));
    dlgEls.replay.addEventListener('click', restartTrial);
    dlg.querySelectorAll('[data-dmode]').forEach((b) => b.addEventListener('click', () => {
      state.mode = b.dataset.dmode;
      if (state.mode === 'trial') restartTrial();
      SV.setQuery({ mode: state.mode === 'trial' ? 'trial' : null });
      syncUI();
    }));
    dlg.querySelector('#dlg-link').addEventListener('click', (e) => SV.copyText(window.location.href, e.currentTarget));
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => {
      if (dlgInst) { dlgInst.remove(); dlgInst = null; }
      dlgCur = null;
      SV.setQuery({ cond: null });
    });
    window.addEventListener('resize', fit);
  }

  function dlgSync() {
    dlg.querySelectorAll('[data-dmode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dmode === state.mode)));
    dlgEls.replay.hidden = state.mode !== 'trial';
  }

  function fit() {
    if (!dlgInst || !dlg.open) return;
    const canvas = dlgEls.stage.querySelector('canvas');
    if (!canvas) return;
    const availW = dlgEls.wrap.clientWidth - 24;
    const availH = window.innerHeight - 250;
    const s = Math.min(1, availW / W, Math.max(0.2, availH / H));
    canvas.style.width = Math.round(W * s) + 'px';
    canvas.style.height = Math.round(H * s) + 'px';
    dlgEls.scale.textContent = s >= 0.999
      ? '原寸 ' + W + ' × ' + H + ' px'
      : '画面に合わせて ' + Math.round(s * 100) + '% に縮小中（原寸 ' + W + ' × ' + H + ' px）';
  }

  function openDialog(sec, i) {
    ensureDialog();
    const cond = sec.conditions[i];
    dlgCur = { sec, i, cond };
    dlgEls.eyebrow.textContent = 'Exp ' + String(exp.num).padStart(2, '0') + '・' + sec.title;
    dlgEls.title.textContent = cond.label;
    dlgEls.params.textContent = cond.params.map((pp) => pp[0] + ' ' + pp[1]).join('　') + '　（元コードの条件番号 ' + cond.code + '）';
    if (dlgInst) dlgInst.remove();
    dlgEls.stage.innerHTML = '';
    if (state.mode === 'trial') restartTrial();
    if (!dlg.open) dlg.showModal();
    dlgInst = SV.createPanel(dlgEls.stage, {
      W, H, observe: false,
      onSetup: (p) => { dlgRef.stim = buildStim(p, cond); },
      onDraw: (p) => drawFrame(p, sec, dlgRef)
    });
    dlgSync();
    requestAnimationFrame(fit);
    SV.setQuery({ cond: sec.key + '-' + cond.code });
  }

  function step(d) {
    if (!dlgCur) return;
    const k = allConds.findIndex((a) => a.sec === dlgCur.sec && a.i === dlgCur.i);
    const n = allConds[(k + d + allConds.length) % allConds.length];
    openDialog(n.sec, n.i);
  }

  syncUI();

  // ?cond=セクション-条件番号 で原寸表示を開く
  const condQ = q.get('cond');
  if (condQ) {
    const [key, code] = condQ.split('-');
    const sec = exp.sections.find((s) => s.key === key);
    if (sec) {
      const i = sec.conditions.findIndex((c) => String(c.code) === code);
      if (i >= 0) setTimeout(() => openDialog(sec, i), 50);
    }
  }
})();
