#!/usr/bin/env node

import chalk from "chalk";
import "zx/globals";
import { compile } from "./compiler.js";
import { importDocument } from "./importer.js";
import { createServer } from "./server.js";
import { error, ok } from "./terminal.js";

(async () => {
  const check = "check" in argv;

  switch (argv._[0]) {
    case "build": {
      await compile({ check });
      ok("Successfully compiled.");
      break;
    }

    case "watch": {
      let notifier: (() => void) | undefined;
      const registerNotifier = (n: () => void) => {
        notifier = n;
      };
      const onUpdate = () => notifier?.();

      const port = Number(process.env.PORT || 3000);
      createServer({ port, registerNotifier }).serve();
      ok(
        "Server started.",
        `You can now view ${chalk.underline(
          `http://localhost:${port}/`
        )} in the browser.`
      );

      await compile({ mode: "watch", check, onUpdate });

      break;
    }

    case "import": {
      if (argv._.length !== 2) throw new Error(`Specify a file to import.`);
      await importDocument(argv._[1]);
      break;
    }

    default:
      throw new Error(`Unknown command: ${argv._[0]}`);
  }
})().catch((err) => {
  error("Failed.", err);
  process.exit(1);
});
