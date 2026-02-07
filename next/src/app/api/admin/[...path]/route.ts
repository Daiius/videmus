import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_URL || "http://localhost:4000";

/**
 * 管理者 API プロキシハンドラー
 *
 * /api/admin/* リクエストを Hono サーバーの /admin/* に転送します。
 */
async function proxyHandler(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname.replace('/api/admin', '/admin');
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

    const responseBody = await apiResponse.arrayBuffer();
    const response = new NextResponse(responseBody, {
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      headers: responseHeaders,
    });

    return response;
  } catch (error) {
    console.error("[Admin Proxy Error]", error);
    return NextResponse.json(
      { error: "Failed to proxy admin request" },
      { status: 500 },
    );
  }
}

export const GET = proxyHandler;
export const POST = proxyHandler;
export const PATCH = proxyHandler;
