import { spawn } from "node:child_process";

const getOpenCommand = (): { cmd: string; args: string[] } => {
  if (process.platform === "darwin") {
    return { cmd: "open", args: [] };
  }
  if (process.platform === "win32") {
    return { cmd: "cmd", args: ["/c", "start", ""] };
  }
  return { cmd: "xdg-open", args: [] };
};

export const openUrl = async (url: string): Promise<void> => {
  const { cmd, args } = getOpenCommand();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, [...args, url], {
      detached: true,
      stdio: "ignore",
    });

    child.once("error", (error) => {
      reject(error);
    });

    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
};
