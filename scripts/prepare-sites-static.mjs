import { copyFile, writeFile } from "node:fs/promises";

await copyFile(".next/server/app/index.html", ".open-next/assets/index.html");
await copyFile(".next/server/app/_not-found.html", ".open-next/assets/404.html");

const worker = `
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      url.pathname = "/index.html";
    }

    const response = await env.ASSETS.fetch(new Request(url, request));
    if (response.status !== 404 || request.method !== "GET") {
      return response;
    }

    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (!acceptsHtml) {
      return response;
    }

    url.pathname = "/404.html";
    return new Response(await (await env.ASSETS.fetch(new Request(url, request))).arrayBuffer(), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
};
`;

await writeFile(".open-next/worker.js", worker.trimStart(), "utf8");
