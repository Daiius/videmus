import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_URL || "http://localhost:4000";

/**
 * プロキシハンドラー - すべての /api/auth/* リクエストをAPIサーバに転送
 *
 * Next.js と Hono サーバーが別サーバーの場合、Cookie の転送問題を解決するため、
 * Next.js の API Route を経由して認証リクエストを転送します。
 */
async function proxyHandler(req: NextRequest) {
  try {
    // リクエストパスを取得（例: /api/auth/session → /api/auth/session）
    const pathname = req.nextUrl.pathname;
    const search = req.nextUrl.search;
    const targetUrl = `${API_BASE_URL}${pathname}${search}`;

    // リクエストヘッダーをコピー（重要: Cookie含む）
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      // host ヘッダーは転送先のものに書き換える必要がある
      if (key.toLowerCase() === "host") {
        const targetHost = new URL(API_BASE_URL).host;
        headers.set(key, targetHost);
      } else {
        headers.set(key, value);
      }
    });

    // リクエストボディを取得（POSTなどの場合）
    let body: BodyInit | null = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await req.arrayBuffer();
    }

    // APIサーバにリクエストを転送
    const apiResponse = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      // リダイレクトを自動で追従しない（手動で処理するため）
      redirect: "manual",
    });

    // レスポンスヘッダーをコピー
    const responseHeaders = new Headers();
    apiResponse.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    // リダイレクトの場合
    if (apiResponse.status >= 300 && apiResponse.status < 400) {
      const location = apiResponse.headers.get("location");
      if (location) {
        // Set-Cookieヘッダーも含めてリダイレクト
        const response = NextResponse.redirect(
          new URL(location, req.nextUrl.origin),
          apiResponse.status,
        );

        // Set-Cookieヘッダーを転送
        const setCookies = apiResponse.headers.getSetCookie();
        setCookies.forEach((cookie) => {
          response.headers.append("Set-Cookie", cookie);
        });

        return response;
      }
    }

    // 通常のレスポンスの場合
    const responseBody = await apiResponse.arrayBuffer();
    const response = new NextResponse(responseBody, {
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      headers: responseHeaders,
    });

    return response;
  } catch (error) {
    console.error("[Auth Proxy Error]", error);
    return NextResponse.json(
      { error: "Failed to proxy authentication request" },
      { status: 500 },
    );
  }
}

// すべてのHTTPメソッドに対応
export const GET = proxyHandler;
export const POST = proxyHandler;
export const PUT = proxyHandler;
export const DELETE = proxyHandler;
export const PATCH = proxyHandler;
export const OPTIONS = proxyHandler;
