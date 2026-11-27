# レスバトル

npm install
npm start

スマホ:   http://<host>:3000/
会場PC:   http://<host>:3000/stage.html?key=stage

合言葉の変更: STAGE_KEY=xxxx npm start

会場PCの操作
  クリック   開始（音が出るようになる）
  ↑ ↓        音量
  F          全画面
  投稿クリック  削除

音の差し替え: public/sounds/ に {ios|android|other}-{char|delete|enter}.wav（または .mp3）を置く
NGワード: server.js の NG_WORDS
