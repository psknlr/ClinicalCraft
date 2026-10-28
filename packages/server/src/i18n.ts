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
  "error.invalidCase": "Case \"{id}\" is invalid — {message}",
  "error.badQuery": "Invalid query: {message}",
  "error.unknownProvider": "{message}",
  "error.providerNotConfigured": "Provider \"{provider}\" has no API key on the server (set {env}).",
  "error.proxyLoop": "The proxy cannot forward to another proxy (\"{provider}\").",
  "error.assetMissing": "Local asset not installed — run `clinicalcraft import-v4` (see docs/ASSETS.md).",
  "error.noWebBuild": "The web build was not found. Run `npm run build` (or pass --static <dir>).",
  "error.badSessionId": "Invalid session id.",
  "error.transcriptQuota": "Transcript storage limit reached on the server; this upload was not stored.",
  "error.world.unknownSession": "No live session \"{id}\": it was never registered, or it has ended. Open the web world and enable external control.",
  "error.world.expired": "Live session \"{id}\" expired: its browser stopped sending heartbeats.",
  "error.world.closed": "Live session \"{id}\" ended: the learner disconnected external control.",
  "error.world.forbiddenChannel": "The channel secret of this live session is missing or wrong.",
  "error.world.forbiddenAttachKey": "The attach key for live session \"{id}\" is missing or wrong: use the key shown in the learner's “External agent” badge.",
  "error.world.forbiddenAttachKeyList": "The attach key is malformed: use the key shown in the learner's “External agent” badge.",
  "error.world.attachAuth": "Attach clients send the server's access token as Authorization: Bearer <token> (the cookie and ?token= are not accepted here).",
  "error.world.argsTooLarge": "The call's arguments exceed {limit} bytes.",
  "error.world.tooManySessions": "Too many live sessions are registered (at most {max}).",
  "error.world.tooManyClientSessions": "This client has too many live sessions registered (at most {max}).",
  "error.world.tooManyCalls": "Too many calls are waiting for live session \"{id}\" (at most {max}).",
  "error.world.tooManyStreams": "Live session \"{id}\" reopened its command channel too often; try again in {seconds} s.",
  "error.world.toolNotAvailable": "Live session \"{id}\" does not accept {tool} (it accepts: {tools}).",
  "error.world.conflict": "Correlation id \"{correlationId}\" was already used for a different call.",
  "error.world.timeout": "The live session did not finish {tool} within {seconds} s (an approval may still have been waiting for the learner). A cancel was sent, but the browser had already received the call, so it may still run (or have run) there — check the session's state before trying again.",
  "error.world.timeoutUnacked": "The live session did not pick up {tool} within {seconds} s; the call was cancelled.",
  "error.world.notConnected": "The browser of live session \"{id}\" is not connected (no command channel for {seconds} s).",
  "error.world.cancelled": "{tool} was cancelled before the live session finished it.",
  "error.world.serverClosing": "The server is shutting down.",
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
  "error.invalidCase": "病例“{id}”无效——{message}",
  "error.badQuery": "查询参数无效：{message}",
  "error.unknownProvider": "{message}",
  "error.providerNotConfigured": "服务器上的提供方“{provider}”没有 API 密钥（请设置 {env}）。",
  "error.proxyLoop": "代理不能转发到另一个代理（“{provider}”）。",
  "error.assetMissing": "本地资源未安装——请运行 `clinicalcraft import-v4`（见 docs/ASSETS.md）。",
  "error.noWebBuild": "未找到网页构建产物。请运行 `npm run build`（或传入 --static <目录>）。",
  "error.badSessionId": "会话 id 无效。",
  "error.transcriptQuota": "服务器上的会话记录已达存储上限，本次上传未保存。",
  "error.world.unknownSession": "没有实时会话“{id}”：它从未注册，或已经结束。请打开网页世界并开启外部控制。",
  "error.world.expired": "实时会话“{id}”已过期：其浏览器已停止发送心跳。",
  "error.world.closed": "实时会话“{id}”已结束：学员断开了外部控制。",
  "error.world.forbiddenChannel": "缺少该实时会话的通道密钥，或密钥错误。",
  "error.world.forbiddenAttachKey": "实时会话“{id}”的连接密钥缺失或错误：请使用学员“外部智能体”徽标中显示的密钥。",
  "error.world.forbiddenAttachKeyList": "连接密钥格式不正确：请使用学员“外部智能体”徽标中显示的密钥。",
  "error.world.attachAuth": "连接客户端须以 Authorization: Bearer <令牌> 发送服务的访问令牌（此处不接受 Cookie 和 ?token=）。",
  "error.world.argsTooLarge": "调用参数超过 {limit} 字节。",
  "error.world.tooManySessions": "已注册的实时会话过多（最多 {max} 个）。",
  "error.world.tooManyClientSessions": "此客户端注册的实时会话过多（最多 {max} 个）。",
  "error.world.tooManyCalls": "等待实时会话“{id}”处理的调用过多（最多 {max} 个）。",
  "error.world.tooManyStreams": "实时会话“{id}”重新打开命令通道过于频繁；请在 {seconds} 秒后重试。",
  "error.world.toolNotAvailable": "实时会话“{id}”不接受 {tool}（可用：{tools}）。",
  "error.world.conflict": "关联 ID“{correlationId}”已用于另一个不同的调用。",
  "error.world.timeout": "实时会话未在 {seconds} 秒内完成 {tool}（可能仍在等待学员审批）。已发送取消指令，但浏览器此前已收到该调用，因此它仍可能执行（或已经执行）——请先确认会话状态再重试。",
  "error.world.timeoutUnacked": "实时会话未在 {seconds} 秒内接收 {tool}；该调用已取消。",
  "error.world.notConnected": "实时会话“{id}”的浏览器未连接（已 {seconds} 秒没有命令通道）。",
  "error.world.cancelled": "{tool} 在实时会话完成之前已被取消。",
  "error.world.serverClosing": "服务器正在关闭。",
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
