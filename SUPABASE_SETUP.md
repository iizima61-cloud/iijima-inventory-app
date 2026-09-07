# Supabase セットアップ手順

対象プロジェクト: `fjcmmpmzswblvocrhprt` (このアプリ専用のSupabaseプロジェクト)

## 1. スキーマの適用

1. Supabaseダッシュボード → 左メニュー「SQL Editor」→「New query」
2. `supabase/schema.sql` の中身を全てコピーして貼り付け、実行(Run)
3. エラーなく完了すればOK。「Table Editor」で `profiles` / `manufacturers` / `sites` /
   `products` / `photos` / `checkout_history` / `inventory_log` の7テーブルが
   作成されていることを確認
4. 「Storage」に `product-photos` バケット(非公開)が作成されていることを確認

## 2. Email/Password認証の確認

1. 左メニュー「Authentication」→「Providers」で「Email」が有効になっていることを確認
2. このアプリは社内利用(自己サインアップなし)を想定しているため、
   ユーザーは「Authentication」→「Users」から手動で作成することを推奨
   (「Add user」→ メールアドレス・パスワードを入力 → 作成するとログインできるようになる)
3. 手動作成時、ユーザーの表示名を設定したい場合は作成後に
   `profiles` テーブルの該当行の `name` を直接編集する

## 3. 環境変数

`.env` に以下が設定済みです(Project Settings → API から取得したもの):

```
VITE_SUPABASE_URL=https://fjcmmpmzswblvocrhprt.supabase.co
VITE_SUPABASE_ANON_KEY=(anon / publishable key)
```

**Service Role Key はこのアプリ(フロントエンドのみのSPA)には一切使用しません。**
ブラウザに露出するとデータベースの全権限が漏洩するため、`.env` にも含めていません。

## 4. 起動確認

```
npm install
npm run dev
```

`http://localhost:5173` を開き、手順2で作成したユーザーでログインできることを確認してください。
