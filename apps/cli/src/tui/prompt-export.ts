import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ProfileShow } from "../../../../packages/shared/src/generated/graphql.js";
import {
  buildListeningAtlasPrompt,
  LISTENING_ATLAS_FILE_NAME,
} from "../../../../packages/shared/src/listening-atlas/prompt.js";

export async function writeListeningAtlasPromptToDesktop(
  shows: ProfileShow[]
): Promise<string> {
  const target = join(homedir(), "Desktop", LISTENING_ATLAS_FILE_NAME);
  const prompt = buildListeningAtlasPrompt(shows);
  await writeFile(target, prompt, "utf8");
  return target;
}
