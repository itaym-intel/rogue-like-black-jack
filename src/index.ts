import { runCliGame } from "./cli/game-loop.js";

interface ParsedArgs {
  seed?: number | string;
  startingBankroll?: number;
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--seed" && argv[index + 1]) {
      parsed.seed = parseSeed(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith("--seed=")) {
      const value = arg.slice("--seed=".length);
      parsed.seed = parseSeed(value);
      continue;
    }

    if (arg === "--bankroll" && argv[index + 1]) {
      parsed.startingBankroll = parseBankroll(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith("--bankroll=")) {
      const value = arg.slice("--bankroll=".length);
      parsed.startingBankroll = parseBankroll(value);
      continue;
    }
  }

  return parsed;
}

function parseSeed(value: string): number | string {
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && value.trim().length > 0) {
    return asNumber;
  }
  return value;
}

function parseBankroll(value: string): number {
  const bankroll = Number(value);
  if (!Number.isFinite(bankroll) || bankroll <= 0) {
    throw new Error("Bankroll must be a positive number.");
  }
  return bankroll;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await runCliGame(options);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
