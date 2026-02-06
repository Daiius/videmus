import { NextResponse } from "next/server";

/**
 * セッション Cookie 名
 */
const SESSION_COOKIE_NAME = "better-auth.session_token";

/**
 * ログアウトクリーンアップハンドラー
 *
 * 処理:
 * 1. BetterAuth のサインアウト API を呼び出してサーバー側のセッションを削除
 * 2. Cookie を明示的に削除（発行時と同じ属性で）
 * 3. ホームページへリダイレクト
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  // 1) BetterAuth のサインアウト API を呼び出してサーバー側のセッションを削除
  try {
    await fetch(new URL("/api/auth/sign-out", url.origin), {
      method: "POST",
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
    });
  } catch (error) {
    console.error("[CLEANUP] Failed to call sign-out API:", error);
    // エラーでも続行（Cookie 削除は行う）
  }

  // 2) ホームページへリダイレクト
  const res = NextResponse.redirect(new URL("/", url.origin));

  // 3) セッション Cookie を削除
  // 重要: 発行時と同じ属性で削除する必要がある
  const cookieOptions: {
    name: string;
    value: string;
    expires: Date;
    path: string;
    httpOnly: boolean;
    sameSite: "lax" | "strict" | "none";
    secure: boolean;
    domain?: string;
  } = {
    name: SESSION_COOKIE_NAME,
    value: "",
    expires: new Date(0), // 即座に期限切れ
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };

  // AUTH_COOKIE_DOMAIN が設定されている場合は domain も指定
  // 注: NEXT_PUBLIC_AUTH_COOKIE_DOMAIN として環境変数を設定する必要がある
  if (process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
  }

  res.cookies.set(cookieOptions);

  return res;
}
