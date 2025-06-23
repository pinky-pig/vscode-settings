#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prompts from "prompts";
import { blue, green, red, yellow, gray, bold } from "kolorist";

async function main() {
  const packageRoot = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = process.cwd();

  const filesToSync = [];

  // 🔧 1. 准备 .editorconfig
  const editorConfigSourcePath = path.join(packageRoot, "src/.editorconfig");
  try {
    await fs.access(editorConfigSourcePath);
    filesToSync.push({
      sourcePath: editorConfigSourcePath,
      destPath: path.join(projectRoot, ".editorconfig"),
      displayName: ".editorconfig",
    });
  } catch {
    // 包里没有 .editorconfig，忽略
  }

  // 🧩 2. 准备 .vscode/ 下的文件
  const sourceVscodeDir = path.resolve(packageRoot, "src/.vscode");
  const destVscodeDir = path.join(projectRoot, ".vscode");
  try {
    await fs.mkdir(destVscodeDir, { recursive: true });
    const templateFiles = await fs.readdir(sourceVscodeDir);
    for (const file of templateFiles) {
      filesToSync.push({
        sourcePath: path.join(sourceVscodeDir, file),
        destPath: path.join(destVscodeDir, file),
        displayName: `.vscode/${file}`,
      });
    }
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }

  if (filesToSync.length === 0) {
    console.log(yellow("⚠️ 没有找到需要同步的配置文件。"));
    return;
  }

  console.log(
    blue(bold("\n📦 正在同步配置文件来自 @arvinn/vscode-settings...\n"))
  );

  // 📁 3. 处理文件
  for (const file of filesToSync) {
    let shouldWrite = true;

    try {
      await fs.access(file.destPath);
      const { overwrite } = await prompts({
        type: "confirm",
        name: "overwrite",
        message: `${yellow("⚠️ 配置文件已存在：")} ${
          file.displayName
        }\n   是否覆盖?`,
        initial: false,
      });

      if (!overwrite) shouldWrite = false;
    } catch {
      // 目标文件不存在
    }

    if (shouldWrite) {
      try {
        await fs.copyFile(file.sourcePath, file.destPath);
        console.log(`${green("✔")} ${gray("已创建：")} ${file.displayName}`);
      } catch (e) {
        console.error(
          `${red("✖")} ${gray("创建失败：")} ${file.displayName} (${e.message})`
        );
      }
    } else {
      console.log(`${yellow("⏩")} ${gray("已跳过：")} ${file.displayName}`);
    }
  }

  console.log(green(bold("\n✨ 配置同步完成！享受编码的快乐吧！\n")));
}

main().catch((e) => {
  console.error(red(`❌ 发生意外错误: ${e.message}`));
  process.exit(1);
});
