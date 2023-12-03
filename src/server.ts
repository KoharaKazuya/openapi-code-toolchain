import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);

export function createServer({
  port,
  registerNotifier,
}: {
  port: number;
  registerNotifier: (s: () => void) => void;
}) {
  const app = new Hono();

  // Serve `openapi.yaml`
  app.get("/openapi.yaml", async (c) => {
    const content = await fs.readFile("./openapi.yaml", { encoding: "utf-8" });
    c.header("Content-Type", "application/yaml");
    return c.body(content);
  });

  // Override Swagger settings
  app.get("/swagger-initializer.js", (c) => {
    c.header("Content-Type", "text/javascript");
    return c.body(`window.onload = function() {
  let hotReloadLoop;

  window.ui = SwaggerUIBundle({
    url: "/openapi.yaml",
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset,
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl,
      HotReload,
    ],
    layout: "StandaloneLayout"
  });

  function HotReload(system) {
    if (!hotReloadLoop)
      hotReloadLoop = loop(system);
    return {};
  }

  async function loop(system) {
    while (true) {
      try {
        await fetch('/_poll');
        const res = await fetch('/openapi.yaml');
        const spec = await res.text();
        system.specActions.updateSpec(spec);
      } catch (err) {
        console.warn(err);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  // Hide TopBar component
  const style = document.createElement('style');
  style.innerHTML = '.topbar { display: none !important; }';
  document.head.appendChild(style);
};
`);
  });

  // Serve Swagger UI
  const swaggerUiDistPath = require.resolve("swagger-ui-dist");
  const swaggerUiDistDir = path.dirname(swaggerUiDistPath);
  const root = path.relative(process.cwd(), swaggerUiDistDir);
  app.use("/*", serveStatic({ root }));

  // Serve pollee for Live Reload
  let pollingClients: Array<() => void> = [];
  app.get("/_poll", (c) =>
    new Promise<void>((r) => {
      pollingClients.push(r);
    }).then(() => c.text(""))
  );
  registerNotifier(() => {
    pollingClients.forEach((r) => r());
    pollingClients = [];
  });

  return {
    serve() {
      serve({ fetch: app.fetch, port });
    },
  };
}
