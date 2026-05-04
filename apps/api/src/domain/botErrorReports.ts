import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const REPORT_PATH = resolve(process.cwd(), "../../docs/bot-error-reports.md");

function fencedJson(value: unknown) {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

export async function appendBotErrorReport(input: {
  botId: string;
  cityId: string;
  actionType: string;
  status: string;
  reason?: string;
  errorKind?: string;
  errorMessage?: string;
  payload?: unknown;
  stack?: string;
}) {
  const now = new Date().toISOString();
  const report = [
    "",
    "<!-- BOT_ERROR_REPORT_START -->",
    `## Bot Error - ${now}`,
    "",
    `- Bot ID: \`${input.botId}\``,
    `- City ID: \`${input.cityId}\``,
    `- Action: \`${input.actionType}\``,
    `- Status: \`${input.status}\``,
    `- Error kind: \`${input.errorKind ?? "unknown"}\``,
    `- Message: ${input.errorMessage ?? "No message"}`,
    `- Reason: ${input.reason ?? "No decision reason"}`,
    "",
    "### How To Recreate",
    "",
    "1. Use the same database state or restore a dump from around the timestamp above.",
    "2. Ensure `DB_PROVIDER=\"postgres\"` and the API is running with bots enabled.",
    `3. Inspect bot \`${input.botId}\` and city \`${input.cityId}\` in Postgres.`,
    `4. Re-run the bot decision for action \`${input.actionType}\` with the payload below.`,
    "5. If the same action fails through the HTTP route or shared action service, treat it as a gameplay/backend bug.",
    "",
    "### Payload",
    "",
    fencedJson(input.payload ?? {}),
    "",
    "### Stack",
    "",
    "```text",
    input.stack ?? "No stack available",
    "```",
    "<!-- BOT_ERROR_REPORT_END -->",
    "",
  ].join("\n");

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await appendFile(REPORT_PATH, report, "utf8");
}
