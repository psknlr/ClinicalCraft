/**
 * The command tree (names, aliases, flags, help text) — no handlers' logic here.
 */
import type { FlagSpec, Localized, ParsedArgs } from "./argv.js";
import { casesIndex, casesList, casesNew, casesSchema, casesShow, casesValidate, casesVerify } from "./cases.js";
import { configGet, configPath, configSet } from "./config.js";
import type { CliContext } from "./context.js";
import { runEval } from "./eval.js";
import { runExec } from "./exec.js";
import { assetsInspect } from "./assets.js";
import { benchDemo, benchList, benchRun } from "./bench.js";
import { facilitiesCompile, facilitiesList, facilitiesValidate } from "./facilities.js";
import { EXEC_FLAGS, JSON_FLAG, RESUME_FLAGS, SESSION_FLAGS } from "./flags.js";
import { runImportV4 } from "./import-v4.js";
import { providersList, providersModels, providersTest } from "./providers.js";
import { runPlay } from "./repl.js";
import { runMcp, runServe } from "./serve.js";
import { sessionsList, sessionsShow } from "./sessions.js";
import { runTrust } from "./trust.js";

export type CommandRun = (ctx: CliContext, args: ParsedArgs) => Promise<number>;

export interface CommandSpec {
  name: string;
  aliases?: string[];
  /** Arguments shown after the command path in help, e.g. "[case]". */
  usage?: string;
  summary: Localized;
  flags?: FlagSpec[];
  subcommands?: CommandSpec[];
  /** Subcommand used when none is given. */
  defaultSubcommand?: string;
  run?: CommandRun;
  examples?: string[];
}

const ALL: FlagSpec = { name: "all", type: "boolean", description: { en: "Every item in the content directories", zh: "内容目录中的全部条目" } };
const QUIET: FlagSpec = { name: "quiet", short: "q", type: "boolean", description: { en: "Hide warnings", zh: "不显示警告" } };
const TIMEOUT: FlagSpec = { name: "timeout", type: "number", valueName: "<sec>", description: { en: "Request timeout in seconds", zh: "请求超时（秒）" } };
const BASE_URL: FlagSpec = { name: "base-url", type: "string", valueName: "<url>", description: { en: "Override the provider's base URL", zh: "覆盖服务商的 Base URL" } };
const MODEL: FlagSpec = { name: "model", type: "string", valueName: "<id>", description: { en: "Model id", zh: "模型 ID" } };

export const PLAY: CommandSpec = {
  name: "play",
  usage: "[case]",
  summary: { en: "Play a case in the terminal REPL (default command)", zh: "在终端交互式接诊（默认命令）" },
  flags: [...SESSION_FLAGS, ...RESUME_FLAGS],
  run: runPlay,
  examples: ["clinicalcraft play smzl-lung-adeno --lang en", "clinicalcraft --continue"],
};

export const EXEC: CommandSpec = {
  name: "exec",
  usage: "<prompt>",
  summary: { en: "Run headless: one prompt (or --autopilot) → text / JSON / JSONL", zh: "无界面运行：一条提示（或 --autopilot）→ 文本 / JSON / JSONL" },
  flags: [...EXEC_FLAGS, ...SESSION_FLAGS, ...RESUME_FLAGS],
  run: runExec,
  examples: [
    'clinicalcraft -p "Where does it hurt?" --case smzl-lung-adeno',
    "clinicalcraft exec --case smzl-lung-adeno --autopilot --approval bypass --output-format json",
    "echo '{\"type\":\"slash_command\",\"name\":\"vitals\",\"args\":\"\"}' | clinicalcraft exec --case dka-adult --input-format stream-json --output-format stream-json",
  ],
};

const SUITE: FlagSpec = { name: "suite", type: "string", valueName: "<id>", description: { en: "Scenario suite (default embodied-v1)", zh: "场景测试集（默认 embodied-v1）" } };

/** `bench`: the embodied agent benchmark (docs/EMBODIED.md §13). */
export const BENCH: CommandSpec = {
  name: "bench",
  summary: { en: "Embodied agent benchmark: scenario suites, reference / scripted / live agents, reports, demonstration", zh: "具身智能体基准测试：场景测试集、参考/脚本/真实模型智能体、报告与演示" },
  defaultSubcommand: "list",
  subcommands: [
    { name: "list", aliases: ["ls"], summary: { en: "List the scenarios of a suite", zh: "列出测试集中的场景" }, flags: [SUITE, JSON_FLAG], run: benchList },
    {
      name: "run",
      summary: { en: "Run a suite → bench-report.json + bench-report.md (Wilson 95 % intervals)", zh: "运行测试集 → bench-report.json 与 bench-report.md（Wilson 95% 置信区间）" },
      flags: [
        SUITE,
        { name: "agent", type: "string", valueName: "<kind>", choices: ["reference", "scripted-llm", "llm"], description: { en: "reference | scripted-llm (infrastructure validation) | llm (a real model; needs --live)", zh: "reference | scripted-llm（验证基础设施）| llm（真实模型；需 --live）" } },
        { name: "seeds", type: "string", valueName: "<list>", description: { en: "Run seeds, e.g. 1-5 or 1,2,7 (default 1-3)", zh: "运行种子，如 1-5 或 1,2,7（默认 1-3）" } },
        { name: "scenario", type: "list", valueName: "<ids>", description: { en: "Only these scenarios", zh: "只运行这些场景" } },
        { name: "category", type: "list", valueName: "<names>", description: { en: "Only these categories", zh: "只运行这些类别" } },
        { name: "out", type: "string", valueName: "<dir>", description: { en: "Report directory (default bench-results)", zh: "报告目录（默认 bench-results）" } },
        { name: "traces", type: "boolean", description: { en: "Also write every run's episode trace (traces/*.jsonl)", zh: "同时写出每次运行的轨迹（traces/*.jsonl）" } },
        { name: "require", type: "number", valueName: "<percent>", description: { en: "Minimum task success rate (default 100 for reference / scripted-llm)", zh: "最低任务成功率（reference / scripted-llm 默认 100）" } },
        { name: "live", type: "boolean", description: { en: "Allow the llm agent to call a real model (costs money; never in CI)", zh: "允许 llm 智能体调用真实模型（会产生费用；CI 中禁止）" } },
        { name: "max-tokens", type: "number", valueName: "<n>", description: { en: "Spending cap: total tokens over the whole run (llm)", zh: "费用上限：整次运行的总 token 数（llm）" } },
        { name: "max-usd", type: "number", valueName: "<usd>", description: { en: "Spending cap in USD (only for models with a catalogue price)", zh: "以美元计的费用上限（仅限有目录价格的模型）" } },
        ...SESSION_FLAGS.filter((f) => ["provider", "model", "base-url"].includes(f.name)),
      ],
      run: benchRun,
      examples: [
        "clinicalcraft bench run --suite embodied-v1 --agent reference",
        "clinicalcraft bench run --agent scripted-llm --seeds 1-5 --out bench-results/scripted",
        "clinicalcraft bench run --agent llm --provider anthropic --model claude-opus-5-5 --live --max-tokens 2000000 --seeds 1-3",
      ],
    },
    {
      name: "demo",
      summary: { en: "Reference demonstration: the embodied encounter headless → trace.jsonl + demo.md", zh: "参考演示：无界面具身接诊 → trace.jsonl 与 demo.md" },
      flags: [
        { name: "case", type: "string", valueName: "<id>", description: { en: "Case id (default stemi-inferior-rv)", zh: "病例 ID（默认 stemi-inferior-rv）" } },
        { name: "facility", type: "string", valueName: "<id>", description: { en: "Facility (default: the case's own)", zh: "场馆（默认病例自己的场馆）" } },
        { name: "out", type: "string", valueName: "<dir>", description: { en: "Output directory (default bench-demo)", zh: "输出目录（默认 bench-demo）" } },
      ],
      run: benchDemo,
      examples: ["clinicalcraft bench demo --case stemi-inferior-rv --lang en --out bench-demo"],
    },
  ],
};

export const ROOT: CommandSpec = {
  name: "clinicalcraft",
  summary: { en: "LLM-driven virtual patients — terminal front-end", zh: "大模型驱动的虚拟病人 —— 终端前端" },
  defaultSubcommand: "play",
  subcommands: [
    PLAY,
    EXEC,
    {
      name: "cases",
      aliases: ["case"],
      summary: { en: "List, index, inspect, validate, verify and scaffold cases", zh: "列出、索引、查看、校验、验证和新建病例" },
      defaultSubcommand: "list",
      subcommands: [
        { name: "list", aliases: ["ls"], summary: { en: "List available cases", zh: "列出可用病例" }, flags: [JSON_FLAG], run: casesList },
        {
          name: "index",
          summary: { en: "Print the library index (metadata only, no validation; shared with serve and the web)", zh: "输出病例库索引（仅元数据、不做校验；与 serve 和网页共用）" },
          flags: [JSON_FLAG],
          run: casesIndex,
        },
        {
          name: "show",
          usage: "<id>",
          summary: { en: "Show a case (no spoilers)", zh: "查看病例（不剧透）" },
          flags: [JSON_FLAG, { name: "full", type: "boolean", description: { en: "With --json: include the reference solution", zh: "与 --json 同用：包含参考解法" } }],
          run: casesShow,
        },
        {
          name: "validate",
          usage: "[--all | path…]",
          summary: { en: "Schema + referential-integrity validation", zh: "结构与引用完整性校验" },
          flags: [ALL, JSON_FLAG, QUIET],
          run: casesValidate,
        },
        {
          name: "verify",
          usage: "<id… | --all>",
          summary: { en: "Replay the reference solution and the utterance corpus", zh: "重放参考解法并运行问句语料回归" },
          flags: [ALL, JSON_FLAG, QUIET],
          run: casesVerify,
        },
        {
          name: "new",
          usage: "<id>",
          summary: { en: "Scaffold a schema-valid bilingual template case + README", zh: "新建符合结构的双语模板病例及 README" },
          flags: [
            { name: "dir", type: "string", valueName: "<cases-dir>", description: { en: "Directory that receives <id>/ (default: packages/content/cases or ./cases)", zh: "存放 <id>/ 的目录（默认 packages/content/cases 或 ./cases）" } },
            { name: "force", type: "boolean", description: { en: "Overwrite an existing case.json", zh: "覆盖已有的 case.json" } },
          ],
          run: casesNew,
        },
        {
          name: "schema",
          usage: "[case|facility|catalog|template|skill]",
          summary: { en: "Print the JSON Schema path (or --content)", zh: "输出 JSON Schema 路径（或 --content 输出内容）" },
          flags: [{ name: "content", type: "boolean", description: { en: "Print the schema itself", zh: "输出 Schema 内容" } }],
          run: casesSchema,
        },
      ],
    },
    {
      name: "facilities",
      aliases: ["facility"],
      summary: { en: "List and validate facilities and equipment catalogs", zh: "列出并校验场馆与设备目录" },
      defaultSubcommand: "list",
      subcommands: [
        { name: "list", aliases: ["ls"], summary: { en: "List facilities", zh: "列出场馆" }, flags: [JSON_FLAG], run: facilitiesList },
        { name: "validate", usage: "[--all | path…]", summary: { en: "Validate facilities, room templates and catalogs", zh: "校验场馆、房间模板与设备目录" }, flags: [ALL, JSON_FLAG, QUIET], run: facilitiesValidate },
        {
          name: "compile",
          usage: "<id | file>",
          summary: { en: "Print the flat facility (room templates expanded)", zh: "输出展开房间模板后的扁平场馆" },
          flags: [{ name: "out", type: "string", valueName: "<file>", description: { en: "Write the JSON to a file", zh: "将 JSON 写入文件" } }],
          run: facilitiesCompile,
        },
      ],
    },
    {
      name: "assets",
      aliases: ["asset"],
      summary: { en: "Inspect 3D model files (GLB/glTF) for equipment", zh: "检查设备的三维模型文件（GLB/glTF）" },
      defaultSubcommand: "inspect",
      subcommands: [
        {
          name: "inspect",
          usage: "<file.glb>",
          summary: { en: "Header, counts, bounding box, extensions, sha256; with --type, check the catalog model reference", zh: "文件头、数量统计、包围盒、扩展与 sha256；配合 --type 核对设备目录中的模型引用" },
          flags: [
            { name: "type", type: "string", valueName: "<equipment-type>", description: { en: "Check against this equipment type's `model` reference and footprint", zh: "按该设备类型的 `model` 引用与占地尺寸核对" } },
            { name: "draco", type: "boolean", description: { en: "The renderer has a DRACO decoder configured", zh: "渲染器已配置 DRACO 解码器" } },
            JSON_FLAG,
          ],
          run: assetsInspect,
          examples: ["clinicalcraft assets inspect assets/local/models/icu-bed.glb --type icu-bed"],
        },
      ],
    },
    {
      name: "providers",
      aliases: ["provider"],
      summary: { en: "LLM providers: list, test a connection, list models", zh: "大模型服务商：列出、测试连接、列出模型" },
      defaultSubcommand: "list",
      subcommands: [
        { name: "list", aliases: ["ls"], summary: { en: "Provider catalogue (never shows keys)", zh: "服务商目录（不显示密钥）" }, flags: [JSON_FLAG], run: providersList },
        { name: "test", usage: "<id>", summary: { en: 'Send a tiny "Reply with OK" request', zh: "发送一个极小的“Reply with OK”请求" }, flags: [MODEL, BASE_URL, TIMEOUT], run: providersTest },
        { name: "models", usage: "<id>", summary: { en: "List models (GET /models when supported)", zh: "列出模型（支持时调用 GET /models）" }, flags: [JSON_FLAG, BASE_URL, TIMEOUT], run: providersModels },
      ],
    },
    {
      name: "config",
      summary: { en: "Read and write settings", zh: "读取和修改设置" },
      defaultSubcommand: "get",
      subcommands: [
        { name: "get", usage: "[key]", summary: { en: "Show resolved settings (or one key)", zh: "显示生效的设置（或某一项）" }, flags: [JSON_FLAG], run: configGet },
        {
          name: "set",
          usage: "<key> <value>",
          summary: { en: "Write a setting (default: user settings, mode 0600)", zh: "写入设置（默认写入用户设置，权限 0600）" },
          flags: [
            { name: "user", type: "boolean", description: { en: "~/.clinicalcraft/settings.json (default)", zh: "~/.clinicalcraft/settings.json（默认）" } },
            { name: "project", type: "boolean", description: { en: ".clinicalcraft/settings.json (shared; never secrets)", zh: ".clinicalcraft/settings.json（共享；不得写入密钥）" } },
            { name: "local", type: "boolean", description: { en: ".clinicalcraft/settings.local.json (personal, git-ignored)", zh: ".clinicalcraft/settings.local.json（个人，不纳入 git）" } },
          ],
          run: configSet,
        },
        { name: "path", summary: { en: "Show settings file locations", zh: "显示设置文件位置" }, run: (ctx) => configPath(ctx) },
      ],
    },
    {
      name: "trust",
      summary: {
        en: "Trust this project's .clinicalcraft settings (allows its command hooks and provider/server settings)",
        zh: "信任本项目的 .clinicalcraft 设置（允许其命令钩子与服务商/服务器设置）",
      },
      flags: [
        { name: "revoke", type: "boolean", description: { en: "Stop trusting this project", zh: "取消信任本项目" } },
        { name: "list", type: "boolean", description: { en: "List trusted projects", zh: "列出受信任的项目" } },
        JSON_FLAG,
      ],
      run: runTrust,
      examples: ["clinicalcraft trust", "clinicalcraft trust --revoke", "clinicalcraft trust --list"],
    },
    {
      name: "sessions",
      aliases: ["session"],
      summary: { en: "Recorded sessions (JSONL transcripts)", zh: "已记录的会话（JSONL 记录）" },
      defaultSubcommand: "list",
      subcommands: [
        {
          name: "list",
          aliases: ["ls"],
          summary: { en: "List recorded sessions", zh: "列出已记录的会话" },
          flags: [
            JSON_FLAG,
            { name: "limit", type: "number", valueName: "<n>", description: { en: "How many (default 20)", zh: "条数（默认 20）" } },
            { name: "web", type: "boolean", description: { en: "Also list transcripts uploaded by the web app (resume them by exact id)", zh: "同时列出网页端上传的会话记录（按完整 id 恢复）" } },
          ],
          run: sessionsList,
        },
        { name: "show", usage: "<id|latest>", summary: { en: "Show a session transcript", zh: "查看会话记录" }, flags: [JSON_FLAG], run: sessionsShow },
      ],
    },
    {
      name: "serve",
      summary: { en: "HTTP server: 3D web world, content API, LLM proxy", zh: "HTTP 服务：3D 网页世界、内容 API、大模型代理" },
      flags: [
        { name: "port", type: "number", valueName: "<n>", description: { en: "Port (default 5178)", zh: "端口（默认 5178）" } },
        { name: "host", type: "string", valueName: "<host>", description: { en: "Bind address (default 127.0.0.1; others need --token)", zh: "监听地址（默认 127.0.0.1；其他地址需要 --token）" } },
        {
          name: "token",
          type: "string",
          valueName: "<token>",
          description: { en: "Bearer token required by the API (≥ 16 chars; visible in the process list — prefer CLINICALCRAFT_SERVER_TOKEN or --token-file)", zh: "API 所需的 Bearer 令牌（至少 16 个字符；会出现在进程列表中——建议改用 CLINICALCRAFT_SERVER_TOKEN 或 --token-file）" },
        },
        { name: "token-file", type: "string", valueName: "<path>", description: { en: "Read the access token from this file", zh: "从该文件读取访问令牌" } },
        { name: "open", type: "boolean", description: { en: "Open the browser", zh: "打开浏览器" } },
        { name: "static", type: "string", valueName: "<dir>", description: { en: "Static web directory (default packages/web/dist)", zh: "静态网页目录（默认 packages/web/dist）" } },
      ],
      run: runServe,
    },
    {
      name: "mcp",
      summary: { en: "MCP server on stdio (let Claude Code / Codex / Grok play the clinician)", zh: "stdio MCP 服务（让 Claude Code / Codex / Grok 扮演医生）" },
      flags: [...SESSION_FLAGS],
      run: runMcp,
    },
    {
      name: "import-v4",
      usage: "<files…>",
      summary: { en: "Install the local-only V4 assets (figures, PDF, anatomy model) from the V4 html, its .part01/.part02 files or the two zips", zh: "从 V4 html、.part01/.part02 分卷或两个 zip 安装本地资源（病例图片、PDF、解剖模型）" },
      flags: [{ name: "dest", type: "string", valueName: "<dir>", description: { en: "Destination (default ~/.clinicalcraft/assets; assets/local in a repo checkout)", zh: "安装目录（默认 ~/.clinicalcraft/assets；仓库内可用 assets/local）" } }],
      run: runImportV4,
      examples: [
        'clinicalcraft import-v4 "Virtual_Patient_V4(1).html"',
        'clinicalcraft import-v4 "Virtual_Patient_V4(1).html.part01" "Virtual_Patient_V4(1).html.part02"',
        "clinicalcraft import-v4 Virtual_Patient_V4_Part1.zip Virtual_Patient_V4_Part2.zip --dest assets/local",
      ],
    },
    {
      name: "eval",
      summary: { en: "Autopilot benchmark over cases → Markdown + JSON report", zh: "对病例运行自动驾驶基准 → Markdown + JSON 报告" },
      flags: [
        { name: "cases", type: "list", valueName: "<ids|all>", description: { en: "Case ids (comma-separated) or all", zh: "病例 ID（逗号分隔）或 all" } },
        { name: "runs", type: "number", valueName: "<n>", description: { en: "Runs per case (default 1)", zh: "每个病例的运行次数（默认 1）" } },
        { name: "max-turns", type: "number", valueName: "<n>", description: { en: "Autopilot turns per run", zh: "每次运行的自动驾驶回合数" } },
        { name: "out", type: "string", valueName: "<report.md>", description: { en: "Write the Markdown report (+ .json beside it)", zh: "写入 Markdown 报告（并在旁边写 .json）" } },
        { name: "json", type: "string", valueName: "<file>", description: { en: "Write the JSON report here", zh: "JSON 报告路径" } },
        { name: "transcripts", type: "boolean", description: { en: "Record session transcripts (off by default)", zh: "记录会话（默认关闭）" } },
        ...SESSION_FLAGS.filter((f) => ["provider", "model", "base-url", "scope", "max-tool-rounds", "embodied"].includes(f.name)),
      ],
      run: runEval,
      examples: ["clinicalcraft eval --cases all --provider offline --out report.md"],
    },
    BENCH,
  ],
};

/** Find a child by name or alias. */
export function findChild(node: CommandSpec, token: string): CommandSpec | undefined {
  return node.subcommands?.find((c) => c.name === token || (c.aliases ?? []).includes(token));
}
