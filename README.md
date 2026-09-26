# thesis-stimulus-examples

博士論文の10実験で使った「波打つ点列」の刺激を、ブラウザで条件ごとに再生できるサイトです。GitHub Pages でそのまま公開できます（ビルド不要）。

## ページ

| ページ | 内容 |
| --- | --- |
| `index.html` | 実験の選択画面。各カードで代表的な条件をループ再生 |
| `exp01/` 〜 `exp10/` | その実験の全条件を並べて同時再生。クリックで原寸表示。「ループ」と「実験どおり」（注視点・矢印・提示時間を再現）を切り替え |
| `playground/` | パラメータ自由調整。位置ノイズ・点の間隔・長さ・波長・振幅・周波数・妨害ノイズなどをスライダーで変更 |
| `image-generator/` | 刺激画像の書き出し。全実験・全条件の PNG（1コマ／コマ送り）を個別または ZIP で保存 |

実験ページの URL には表示状態を付けられます。

- `?mode=trial` … 「実験どおり」で開く
- `?seed=123` … 乱数のシードを指定
- `?cond=detect-7` … 原寸表示で開く条件（セクション名-元コードの条件番号）
- `?cue=down` … Exp9 の矢印を下向きにする

## フォルダ構成

```
index.html
.nojekyll
exp01/index.html 〜 exp10/index.html
playground/index.html
image-generator/index.html
assets/
  css/site.css
  js/stimuli.js          刺激の計算と描画（元コードから移植）
  js/experiments.js      実験ごとの説明文と条件表
  js/common.js           ヘッダー、p5 パネルの生成など
  js/viewer.js           実験ページ
  js/home.js             トップページ
  js/playground.js       パラメータ自由調整
  js/image-generator.js  刺激画像の書き出し
lib/p5/                  p5.js 1.11.13（固定版を同梱）
```

見出しや説明文を変えるときは `assets/js/experiments.js` の `title`・`summary`・`task`・`design` を書き換えてください。全ページに反映されます。

## GitHub Pages で公開する

1. GitHub で `thesis-stimulus-examples` という名前のリポジトリを作る（無料プランでは Public）。
2. このフォルダの中身をすべてリポジトリの直下に置いて push する（`.nojekyll` も含める）。
3. リポジトリの Settings → Pages → Build and deployment で、Source を「Deploy from a branch」、Branch を `main` と `/ (root)` にして保存する。
4. 数分後、`https://<ユーザー名>.github.io/thesis-stimulus-examples/` で開けます。

ファイル名の大文字・小文字は区別されるので、名前を変えるときは参照側もそろえてください。

## 手元で確認する

```
cd thesis-stimulus-examples
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開きます。ファイルを直接ダブルクリックしても動きますが、ブラウザによってはリンクのコピーなどが使えません。

## 刺激の再現について

- `assets/js/stimuli.js` は、元の実験プログラム（Exp1.js〜Exp10.js、Exp6〜8 の p5-canvas4.js）の式、乱数を引く順序、描画の順序をそのまま移植しています。
- 移植後、元のプログラムと移植版を同じ乱数・同じ時刻で描かせ、`ellipse`・`line`・`vertex` に渡される座標をすべて比較しました。全10実験・94条件で完全に一致しています。
- 元コードの細部も残しています。例えば、検出課題の非標的の点列は実際に表示される10点だけを描き、妨害ノイズの11点は点の間（16px 左）に置き、Exp3 では上下に同じノイズ点を描きます。
- 位置ノイズや初期位相は、元の実験では試行ごとの乱数です。このサイトでは全条件に同じ乱数列（シード）を使うので、条件の違いだけを見比べられます。「乱数を引き直す」で別の乱数にできます。
- 刺激の大きさは px で決まっています。画面の大きさ・解像度・ブラウザの拡大率によって見かけの大きさが変わるため、元の見え方に近づけるには拡大率を100%にしてください。

## 刺激画像の書き出し

`image-generator/` は、元の「実験刺激画像作成プログラム」（Exp1・Exp6 用）を全実験に広げたものです。

| 元のプログラム | このページでの設定 |
| --- | --- |
| 位相を 0 に固定（`theta = 0`） | 書き出す時刻 0 ms、「ランダムな初期位相を 0 にする」をオン |
| 同じノイズで線あり／点のみを保存 | 描き方「点のみ と 点＋線 の両方」（同じシードなので同じノイズ） |
| `pixelDensity(1)`、800×400 px | 解像度「1倍」（Exp9・10 は 900×600 px） |
| `wave_noise48_dots.png` | `exp01_noise048px_dots_t0000ms.png` |

このほか、コマ送り画像（動きの変化を縦に並べた1枚）、2倍・3倍の解像度、注視点・矢印の画面も書き出せます。ZIP 内は実験ごとのフォルダに分かれます。
