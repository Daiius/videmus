# Videmus 開発メモ


## 配信IDと視聴URLの管理方法検討

### 2024-10-31
デモ動作を行った際、OBSが（恐らくフレームレート低下のため）
切断・再接続を行い、視聴用URLがリセットされる現象が明らかになりました。

ホラー系を同一の視聴用URLで使いまわして配信した際、
誤視聴（？）したユーザが心臓発作を起こさないか心配です。

そこで毎回視聴用URLをリセットするのでなく、
Videmus側に配信チャンネルの概念を設けて視聴用URLを管理するのが良さそう。

ただし、OBSに異なるURLやBearerトークンを渡してチャンネルを切り替えるか、
Videmusの配信画面からチャンネルを操作するのか選択肢が有りそう

前者の方が普通そうではあるが...
1人の配信者が同時に1配信しか出来ないという仮定をしてしまえば、
（それほど理不尽な仮定ではなさそう？）
現在配信しているのはどのチャンネル向けか？という設定さえすればよくなる。

これは現在の実装なら比較的簡単に実現できるかも...
```typescript
resourcesDict: { [broadcastId: string]: {
  router: Router;
  streamId: string;
  broadcasterResource: BroadcasterResource;
  streamerResources: StreamerResources[];
}}
```
といった感じなので、配信中だったとしてもstreamIdを変更してチャンネル切り替えが出来る。
その場合、既に視聴していたクライアントは基本的に視聴を継続できる！
もしかしたら便利かも。
（streamIdはmediasoup <-> mediasoup-client間の接続確立のためのIDに過ぎないので）

ただし、クライアント側で再接続する処理を実装する際には
変更後のチャンネルが分からないと流石に接続できない。

この仕組みを実現するには、
- 配信ID毎にチャンネルの情報をデータベースに記録
- 配信用画面でチャンネルの追加・編集・削除と選択が出来る様にする

...ことが必要になる。できそう。


### 最初の検討
毎回異なる配信URLをOBSに設定するのは、
セキュリティの観点からはよさそうだが面倒な気がする。

配信者毎に決まったIDを（基本的に）固定で割り当てておきたい。

OAuthを使った管理をすれば利用者を増やしてもいけるが、
身内だけで使うならID発行→有効化する際に最初の何文字か教えてもらって
手動で有効化、という方法が楽そう。


## 配信フロー検討
```mermaid
%%{init: {"sequence": { "rightAngles": true } } }%%
sequenceDiagram
    actor broadcaster as 配信者
    participant obs as 配信者OBS
    box rgba(128,128,128,0.1) Videmus Next.js
        participant broadcaster_page as 配信画面
        participant streamer_page as 視聴画面
    end
    participant server as Videmus<br/>WebRTCサーバ 
    participant database as Videmus<br/>データベース
    actor streamer as 視聴者
    actor administrator as 管理者

    Note over broadcaster,administrator: 配信準備

    broadcaster ->> broadcaster_page : /broadcastにアクセス<br/>ID発行ボタンを押す
    broadcaster_page ->> database : 新規ID発行
    broadcaster_page ->> broadcaster_page : /broadcast/{id} にリダイレクト<br/>自分の配信設定画面が出る
    broadcaster_page -->> broadcaster : IDや使用可能かを表示
    broadcaster ->> obs : OBS起動<br/>配信IDを含む<br/>URLを設定

    Note over broadcaster,administrator : 配信ID有効化

    broadcaster ->> administrator : 配信IDを有効化してほしい旨連絡
    administrator -->> database : 配信IDを有効化

    Note over broadcaster,administrator : 配信開始
    
    broadcaster ->> broadcaster_page : 視聴ID（チャンネル）作成ボタン
    broadcaster_page ->> database : 配信ID毎に視聴ID（チャンネル）を記録
    broadcaster ->> broadcaster_page : 視聴ID（チャンネル）を選択
    broadcaster_page ->> server : 配信IDと視聴ID（チャンネル）を関連付け
    server ->> database : 最新の視聴ID<br/>（チャンネル）<br/>指定を保存
    broadcaster ->> obs : 配信ボタンを押す
    obs ->> server : WHIP形式 WebRTC接続
    server ->> database : IDの有効/無効を確認
    database -->> server : 配信ID OK
    server ->>+ server : 配信IDをキーとしてリソース生成
    server -->> obs : 配信IDを含めた<br/>メディア制御URLを返却
    obs ->> server : WebRTC通信
    broadcaster_page ->> server : 状態をポーリング
    server -->> broadcaster_page : 配信状況など更新
    broadcaster_page -->> broadcaster : 視聴用URLを通知
    
    Note over broadcaster,administrator : 視聴

    broadcaster ->> streamer : 視聴用URLを共有
    streamer ->> streamer_page : 視聴用URLにアクセス
    streamer_page ->> server : WebRTC接続
    server ->> server : 視聴用URLから配信IDを特定<br/>どのproducerを関連付けるか決定
    server ->> streamer_page : WebRTC通信
    streamer_page ->> streamer : 動画スタート

    Note over broadcaster,administrator : 配信停止

    broadcaster ->> obs : 配信停止ボタン押す
    obs ->> server : メディア制御URLを用いて<br/>配信停止
    server ->>-server : リソース破棄
    server ->> streamer_page : 状態変化を検出？
    streamer_page ->> streamer : 配信停止を通知
    broadcaster_page ->> server : 状態をポーリング
    server -->> broadcaster_page : 配信状況など更新
```

## データベース構成検討
### 理想の場合
```mermaid
%%{init: {"er": { "rightAngles": true } } }%%
erDiagram
    BroadcastIds {
        varchar(36) broadcast_id PK "not null"
        tinyint(1) is_available "not null"
        varchar(21) current_channel FK "not null"
    }
    Channels {
        varchar(36) broadcast_id PK,FK "not null"
        varchar(21) channel_id PK "not null"
        varchar(256) name UK "not null"
        varchar(1024) description "not null"
    }

    BroadcastIds ||--|{ Channels : places
    
```
### MySQLで扱う場合の現実的なライン
deferred constraintが無いため、アプリケーション側で
braodcast\_id毎に "運用上では" nullでないcurrent\_channel\_idが
入る様にする
```mermaid
%%{init: {"er": { "rightAngles": true } } }%%
erDiagram
    BroadcastIds {
        varchar(36) broadcast_id PK "not null"
        tinyint(1) is_available "not null"
        varchar(21) current_channel FK "nullable"
    }
    Channels {
        varchar(36) broadcast_id PK,FK "not null"
        varchar(21) channel_id PK "not null"
        varchar(256) name UK "not null"
        varchar(1024) description "not null"
    }

    BroadcastIds ||--o{ Channels : places
    
```


## データベース操作検討
BroadcastIdsテーブルとChannelsテーブルはお互いに外部キーを持ち、
not null制約を課しています

これは新しいエントリを作成する場合に、両方を同時に行うことが
必要になる場合が有ります

新しいBroadcastIdsエントリを追加する際には、
これから追加するbroadcast\_idと関連付けられた最低1つの
Channelsエントリを同時に追加する必要があります

### 2つのテーブルが相互に外部参照する場合
データ挿入時にはdeferred constraintが必要になりそうです。
ですがこれはMySQLにはないため、他のデータベースを使う必要があります。

一旦データベース側の制約を緩め、代わりにアプリケーションで対応する方が
適切な場面かもしれません。

BroadcastIdsを一旦current\_channel=NULLでエントリを追加して、
次にChannelsエントリに新しいチャンネルを設定し、
最後にBroadcastIdsのcurren\_channelを先ほど作ったchannelのものにします

適宜BroadcastIdsのcurrent\_channelは使用する際にNULLかどうか
毎回チェックするようにし、その場合にはデフォルト値
（最初に登録されたチャンネル等）を入れるようにします。

チャンネルが消去される際に、あまりに厳密な外部参照を設定すると
処理方法がややこしくなりそうです...
やはりアプリケーション側で担保しようと思います

