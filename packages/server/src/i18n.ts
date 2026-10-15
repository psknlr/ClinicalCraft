/**
 * Runtime strings of the HTTP server (zh-CN + en). API errors carry a stable
 * `code` plus a localised `message`; the locale comes from `Accept-Language`
 * (falling back to the server settings' locale).
 */
import { normalizeLocale } from "@clinicalcraft/core";

const EN = {
  "error.notFound": "Not found.",
  "error.methodNotAllowed": "Method {method} is not allowed here.",
  "error.unauthorized": "A valid access token is required (Authorization: Bearer <token> or ?token=).",
  "error.forbiddenOrigin": "Cross-origin requests from {origin} are not allowed.",
  "error.forbiddenHost": "Host {host} is not allowed for a loopback-only server.",
  "error.bodyTooLarge": "Request body exceeds {limit} bytes.",
  "error.badJson": "Request body is not valid JSON: {message}",
  "error.badRequest": "Invalid request: {message}",
  "error.unsupportedMedia": "Content-Type must be {type}.",
  "error.internal": "Internal server error.",
  "error.unknownCase": "Unknown case \"{id}\".",
  "error.unknownFacility": "Unknown facility \"{id}\".",
  "error.unknownCatalog": "Unknown equipment catalog \"{id}\".",
  "error.unknownProvider": "{message}",
  "error.providerNotConfigured": "Provider \"{provider}\" has no API key on the server (set {env}).",
  "error.proxyLoop": "The proxy cannot forward to another proxy (\"{provider}\").",
  "error.assetMissing": "Local asset not installed — run `clinicalcraft import-v4` (see docs/ASSETS.md).",
  "error.noWebBuild": "The web build was not found. Run `npm run build` (or pass --static <dir>).",
  "error.badSessionId": "Invalid session id.",
} as const;

export type ServerMessageKey = keyof typeof EN;

const ZH: Record<ServerMessageKey, string> = {
  "error.notFound": "未找到。",
  "error.methodNotAllowed": "此处不允许 {method} 方法。",
  "error.unauthorized": "需要有效的访问令牌（Authorization: Bearer <token> 或 ?token=）。",
  "error.forbiddenOrigin": "不允许来自 {origin} 的跨源请求。",
  "error.forbiddenHost": "仅回环地址的服务器不接受主机名 {host}。",
  "error.bodyTooLarge": "请求体超过 {limit} 字节。",
  "error.badJson": "请求体不是有效的 JSON：{message}",
  "error.badRequest": "请求无效：{message}",
  "error.unsupportedMedia": "Content-Type 必须为 {type}。",
  "error.internal": "服务器内部错误。",
  "error.unknownCase": "未知病例“{id}”。",
  "error.unknownFacility": "未知场所“{id}”。",
  "error.unknownCatalog": "未知设备目录“{id}”。",
  "error.unknownProvider": "{message}",
  "error.providerNotConfigured": "服务器上的提供方“{provider}”没有 API 密钥（请设置 {env}）。",
  "error.proxyLoop": "代理不能转发到另一个代理（“{provider}”）。",
  "error.assetMissing": "本地资源未安装——请运行 `clinicalcraft import-v4`（见 docs/ASSETS.md）。",
  "error.noWebBuild": "未找到网页构建产物。请运行 `npm run build`（或传入 --static <目录>）。",
  "error.badSessionId": "会话 id 无效。",
};

/** Localised server message with `{name}` placeholders filled in. */
export function sm(locale: string, key: ServerMessageKey, params: Record<string, string | number> = {}): string {
  const table = normalizeLocale(locale) === "zh-CN" ? ZH : EN;
  return table[key].replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

/** Pick zh-CN or en from an `Accept-Language` header (first matching tag wins). */
export function localeFromAcceptLanguage(header: string | undefined, fallback: string): string {
  if (!header) return normalizeLocale(fallback);
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]!.trim().toLowerCase();
    if (tag.startsWith("zh")) return "zh-CN";
    if (tag.startsWith("en")) return "en";
  }
  return normalizeLocale(fallback);
}
