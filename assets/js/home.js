/*
 * home.js — トップページ（実験の選択画面）
 * 各カードには、その実験の代表的な条件をループ再生する。
 */
(function () {
  'use strict';
  const SV = window.SV;
  const esc = SV.escape;
  const grid = document.getElementById('exp-grid');
  const clock0 = performance.now();

  grid.innerHTML = SV.EXPERIMENTS.map((exp) => {
    const [W, H] = exp.canvas;
    const n = exp.sections.reduce((a, s) => a + s.conditions.length, 0);
    const secNote = exp.sections.length > 1 ? '（' + exp.sections.map((s) => s.conditions.length).join(' + ') + '）' : '';
    return '<a class="exp-card" href="' + exp.id + '/index.html">' +
      '<div class="stage" style="aspect-ratio:' + W + ' / ' + H + '" data-thumb="' + exp.id + '"></div>' +
      '<div class="exp-card-body">' +
      '<span class="exp-num">EXP ' + String(exp.num).padStart(2, '0') + '</span>' +
      '<h3>' + esc(exp.title) + '</h3>' +
      '<p>' + esc(exp.summary) + '</p>' +
      '<span class="exp-meta">' + n + '条件' + secNote + ' · ' + W + '×' + H + ' px</span>' +
      '</div></a>';
  }).join('');

  grid.querySelectorAll('[data-thumb]').forEach((holder) => {
    const exp = SV.findExperiment(holder.dataset.thumb);
    const [W, H] = exp.canvas;
    const sec = exp.sections.find((s) => s.key === exp.thumb[0]);
    const cond = sec.conditions[exp.thumb[1]];
    let stim = null;
    SV.createPanel(holder, {
      W, H, density: 1,
      onSetup: (p) => {
        p.randomSeed(1);
        stim = SV.createStimulus(cond.type, cond.opts, () => p.random());
      },
      onDraw: (p) => {
        p.background(128);
        stim.draw(p, performance.now() - clock0, W, H);
      }
    });
    holder.setAttribute('role', 'img');
    holder.setAttribute('aria-label', 'Exp' + exp.num + ' の刺激（' + cond.label + '）');
  });
})();
