/*
 * common.js — 全ページ共通（ヘッダー、p5 パネルの生成、表示範囲外での停止）
 */
(function (global) {
  'use strict';
  const SV = (global.SV = global.SV || {});
  const body = document.body;
  SV.root = body.dataset.root || './';
  SV.SITE_NAME = '博士論文 実験刺激例';

  /* ---------- ヘッダーとフッター ---------- */
  function renderChrome() {
    const head = document.querySelector('[data-site-head]');
    if (head) {
      const page = body.dataset.page || '';
      const link = (href, text, key) =>
        '<a href="' + SV.root + href + '"' + (page === key ? ' aria-current="page"' : '') + '>' + text + '</a>';
      head.className = 'site-head';
      head.innerHTML =
        '<a class="site-name" href="' + SV.root + 'index.html"><span class="mark" aria-hidden="true"></span>Thesis Stimulus Examples</a>' +
        '<nav class="site-nav" aria-label="サイト内">' +
        link('index.html', '実験一覧', 'home') +
        link('playground/index.html', 'パラメータ自由調整', 'playground') +
        link('image-generator/index.html', '刺激画像の書き出し', 'imagegen') +
        '</nav>';
    }
    const foot = document.querySelector('[data-site-foot]');
    if (foot) {
      foot.className = 'site-foot';
      foot.innerHTML = '刺激は元の実験プログラム（p5.js）と同じ計算式で描いています。表示には p5.js 1.11.13 を使用。' +
        'サイズは px 単位のため、画面の大きさや解像度によって見かけの大きさが変わります。';
    }
  }
  renderChrome();

  /* ---------- 表示範囲外のキャンバスは描画を止める ---------- */
  const io = 'IntersectionObserver' in global
    ? new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const inst = en.target.__p5;
        if (!inst) return;
        if (en.isIntersecting) inst.loop(); else inst.noLoop();
      });
    }, { rootMargin: '120px' })
    : null;

  /*
   * 刺激パネルを作る
   *   holder : キャンバスを入れる要素
   *   W, H   : キャンバスの大きさ（px）
   *   density: 画素密度（一覧は 1、原寸表示は端末に合わせる）
   *   onSetup(p), onDraw(p)
   */
  SV.createPanel = function (holder, { W, H, density, onSetup, onDraw, observe = true }) {
    const inst = new p5((p) => {
      p.setup = () => {
        if (density) p.pixelDensity(density);
        p.createCanvas(W, H);
        p.frameRate(60);
        if (onSetup) onSetup(p);
      };
      p.draw = () => onDraw(p);
    }, holder);
    holder.__p5 = inst;
    if (observe && io) io.observe(holder);
    return inst;
  };
  SV.unobserve = function (holder) { if (io) io.unobserve(holder); };

  SV.newSeed = function () { return 1 + Math.floor(Math.random() * 99999); };

  SV.escape = function (s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };

  /* URL のクエリを書き換える（GitHub Pages 用。使えない環境では何もしない） */
  SV.setQuery = function (obj) {
    try {
      const u = new URL(global.location.href);
      Object.keys(obj).forEach((k) => {
        if (obj[k] == null || obj[k] === '') u.searchParams.delete(k); else u.searchParams.set(k, obj[k]);
      });
      global.history.replaceState(null, '', u.toString());
    } catch (e) { /* 何もしない */ }
  };
  SV.getQuery = function () {
    try { return new URLSearchParams(global.location.search); } catch (e) { return new URLSearchParams(''); }
  };

  SV.copyText = function (text, button) {
    const done = () => {
      if (!button) return;
      const t = button.textContent;
      button.textContent = 'コピーしました';
      setTimeout(() => { button.textContent = t; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => { global.prompt && global.prompt('このリンクをコピーしてください', text); });
    } else if (global.prompt) {
      global.prompt('このリンクをコピーしてください', text);
    }
  };
})(window);
