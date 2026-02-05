import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_URL || "http://localhost:4000";

/**
 * セットアップ API プロキシハンドラー
 *
 * /api/setup/* リクエストを Hono サーバーの /auth/* に転送します。
 * - /api/setup/check-setup → /auth/check-setup
 * - /api/setup/providers → /auth/providers
 * - /api/setup/verify → /auth/setup/verify
 */
async function proxyHandler(req: NextRequest) {
  try {
    // /api/setup/xxx → /auth/xxx に変換
    const path = req.nextUrl.pathname.replace('/api/setup', '/auth');
    const search = req.nextUrl.search;
    const targetUrl = `${API_BASE_URL}${path}${search}`;

    const headers = new Headers();
    req.headers.forEach((value, key) => {
      if (key.toLowerCase() === "host") {
        const targetHost = new URL(API_BASE_URL).host;
        headers.set(key, targetHost);
      } else {
        headers.set(key, value);
      }
    });

    let body: BodyInit | null = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await req.arrayBuffer();
    }

    const apiResponse = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    apiResponse.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    if (apiResponse.status >= 300 && apiResponse.status < 400) {
      const location = apiResponse.headers.get("location");
      if (location) {
        const response = NextResponse.redirect(
          new URL(location, req.nextUrl.origin),
          apiResponse.status,
        );

        const setCookies = apiResponse.headers.getSetCookie();
        setCookies.forEach((cookie) => {
          response.headers.append("Set-Cookie", cookie);
        });

        return response;
      }
    }

    const responseBody = await apiResponse.arrayBuffer();
    const response = new NextResponse(responseBody, {
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      headers: responseHeaders,
    });

    return response;
  } catch (error) {
    console.error("[Setup Proxy Error]", error);
    return NextResponse.json(
      { error: "Failed to proxy setup request" },
      { status: 500 },
    );
  }
}

export const GET = proxyHandler;
export const POST = proxyHandler;
