/**
 * 定義関数を定義するモジュール。
 *
 * 定義関数はコンパイル時にメタプログラミングで置き換えるため、型と実装が異なる。
 * import による呼び出し側では Rollup で import 文を data-uri で置き換え、
 * ReferenceObject に変換する。そのため呼び出し側では ReferenceObject として扱える。
 * 一方で定義関数の引数は schemas になどに自動挿入する必要があるので、実行時に取得できるよう
 * 引数をそのまま返す。
 */

import type { TypedName, TypedReferenceObject } from "./types.js";

export function define<T>(object: T): unknown {
  return object as any;
}

export function referable<T>(object: T): TypedReferenceObject<T> {
  return object as any;
}

export function nameReferable<T>(object: T): TypedName<T> {
  return object as any;
}
