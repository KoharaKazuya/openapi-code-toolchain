import chalk from "chalk";

export const info = withLevel(
  console.info,
  chalk.bgWhite.black(" INFO "),
  chalk.dim
);
export const ok = withLevel(console.log, chalk.bgGreen.black("  OK  "), chalk);
export const warn = withLevel(
  console.warn,
  chalk.bgYellow.black(" WARN "),
  chalk.yellow
);
export const error = withLevel(
  console.warn,
  chalk.bgRed.black(" ERROR "),
  chalk.red
);

type Output = (...args: unknown[]) => void;
type Color = (...message: unknown[]) => string;

function log(
  out: Output,
  tag: unknown,
  detailsColor: Color,
  message: unknown,
  ...details: unknown[]
): void {
  let content = `${tag} ${chalk.bold(message)}\n`;
  for (const d of details) {
    content += `\n${detailsColor(String(d).replace(/^/gm, "  "))}\n`;
  }
  out(content);
}

type TupleExceptFirst<T> = T extends [first: any, ...rest: infer R] ? R : never;
type LeveledArgs = TupleExceptFirst<
  TupleExceptFirst<TupleExceptFirst<Parameters<typeof log>>>
>;

function withLevel(
  out: Output,
  tag: unknown,
  detailsColor: Color
): (...args: LeveledArgs) => void {
  return (...args) => log(out, tag, detailsColor, ...args);
}
