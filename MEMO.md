# Videmus 開発メモ

## 配信IDと視聴URLの管理方法検討
毎回異なる配信URLをOBSに設定するのは、
セキュリティの観点からはよさそうだが面倒な気がする。

配信者毎に決まったIDを（基本的に）固定で割り当てておきたい。

OAuthを使った管理をすれば利用者を増やしてもいけるが、
身内だけで使うならID発行→有効化する際に最初の何文字か教えてもらって
手動で有効化、という方法が楽そう。


```mermaid
%%{init: {"sequence": { "rightAngles": true } } }%%
sequenceDiagram
    actor broadcaster as 配信者
    participant obs as 配信者OBS
    participant broadcaster_page as Videmus<br/>配信画面
    participant server as Videmus<br/>WebRTCサーバ 
    participant database as Videmus<br/>データベース
    participant streamer_page as Videmus<br/>視聴画面
    actor streamer as 視聴者

    Note right of broadcaster : 配信準備
    broadcaster ->> broadcaster_page : 配信画面にアクセス<br/>配信ID取得のためログイン
    broadcaster_page ->> database : Google OAuth等を元に<br/>配信用IDの取得
    database -->> broadcaster_page : 配信用IDの返却
    broadcaster_page -->> broadcaster : 配信ID＆視聴用URLを返す
    broadcaster ->> obs : OBS起動<br/>配信IDを含むURLを設定

    Note right of broadcaster : 配信開始
    
    broadcaster ->> obs : 配信ボタンを押す
    obs ->> server : WHIP形式 WebRTC接続
    server ->> database : IDの有効/無効を確認
    database -->> server : 配信ID OK
    server ->>+ server : 配信IDをキーとしてリソース生成
    server -->> obs : 配信IDを含めた<br/>メディア制御URLを返却
    obs ->> server : WebRTC通信
    broadcaster_page ->> server : 状態をポーリング
    server -->> broadcaster_page : 配信状況など更新
    Note right of broadcaster : 視聴の流れ
    broadcaster ->> streamer : 視聴用URLを共有
    streamer ->> streamer_page : 視聴用URLにアクセス
    streamer_page ->> server : WebRTC接続
    server ->> streamer_page : WebRTC通信
    streamer_page ->> streamer : 動画スタート
    Note right of broadcaster : 配信停止
    broadcaster ->> obs : 配信停止ボタン押す
    obs ->> server : メディア制御URLを用いて<br/>配信停止
    server ->>-server : リソース破棄
    server ->> streamer_page : 状態変化を検出？
    streamer_page ->> streamer : 配信停止を通知
    broadcaster_page ->> server : 状態をポーリング
    server -->> broadcaster_page : 配信状況など更新
```
