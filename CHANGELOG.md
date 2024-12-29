# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- オプショナルで Typia を使えるようにする
- CHANGELOG.md ファイルを追加する

### Changed

- import コマンドで引数が足りなかったときのエラーメッセージをわかりやすくする
- 依存パッケージのバージョンを更新する

### Removed

- 一般的なミス (required の指定忘れ) 防止のための optional プロパティ指定を強制する機能を削除 (代わりに Typia で TypeScript の型定義を使用してください)

### Fixed

- 依存する外部パッケージ (コマンド) の構造が変わってもエラーにならないようにする
- コード中に `console.log` などで標準出力に書き込むコードを含めたときにエラー問題を修正する

## [0.2.2] - 2023-12-12

### Fixed

- schema の参照が型エラーになる問題を修正する

## [0.2.1] - 2023-12-12

### Fixed

- openapi-code import 時に import 文が重複しないようにする

## [0.2.0] - 2023-12-10

### Added

- import コマンドを追加する

### Fixed

- import した Component が Reference Object ではなくインラインに展開される問題を修正する

## [0.1.4] - 2023-12-03

### Fixed

- プレビュー読み込み時のエラーを修正する

## [0.1.3] - 2023-12-03

### Fixed

- TypeScript のパスマッピングがビルドエラーになる問題を修正する

## [0.1.2] - 2023-12-03

### Fixed

- プレビューで TopBar を表示しないようにする

## [0.1.1] - 2023-12-03

### Fixed

- watch モードで新しいファイル (paths/ 以下など) を追加したときに正常にビルドできるように

## [0.1.0] - 2023-12-03

### Added

- 初期実装

[unreleased]: https://github.com/KoharaKazuya/openapi-code-toolchain/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/KoharaKazuya/openapi-code-toolchain/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/KoharaKazuya/openapi-code-toolchain/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/KoharaKazuya/openapi-code-toolchain/compare/v0.1.4...v0.2.0
[0.1.4]: https://github.com/KoharaKazuya/openapi-code-toolchain/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/KoharaKazuya/openapi-code-toolchain/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/KoharaKazuya/openapi-code-toolchain/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/KoharaKazuya/openapi-code-toolchain/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/KoharaKazuya/openapi-code-toolchain/compare/2cb03f3...v0.1.0
