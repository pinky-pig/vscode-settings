#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prompts from "prompts";
import { blue, green, red, yellow } from "kolorist";

async function main() {
  const packageRoot = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = process.cwd();

  const filesToSync = [];

  // 1. 准备 .editorconfig
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

  // 2. 准备 .vscode/ 目录下的文件
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
    if (e.code !== "ENOENT") throw e; // 如果不是"目录不存在"的错误，就抛出
  }

  if (filesToSync.length === 0) {
    console.log(yellow("没有找到需要同步的配置文件。"));
    return;
  }

  console.log(
    blue(`正在从 @arvinn/vscode-settings 同步配置文件...`)
  );

  // 3. 遍历并处理所有待同步文件
  for (const file of filesToSync) {
    let shouldWrite = true;

    try {
      await fs.access(file.destPath);
      const { overwrite } = await prompts({
        type: "confirm",
        name: "overwrite",
        message: `配置文件 '${yellow(
          file.displayName
        )}' 已经存在. 是否覆盖?`,
        initial: false,
      });

      if (!overwrite) shouldWrite = false;
    } catch {
      // 目标文件不存在，可以直接写入
    }

    if (shouldWrite) {
      try {
        await fs.copyFile(file.sourcePath, file.destPath);
        console.log(green(`✓ 创建 ${file.displayName}`));
      } catch (e) {
        console.error(
          red(`✗ 创建 ${file.displayName} 失败: ${e.message}`)
        );
      }
    } else {
      console.log(yellow(`- 跳过 ${file.displayName}`));
    }
  }

  console.log(blue("\n✨ 设置完成."));
}

main().catch((e) => {
  console.error(red(`发生意外错误: ${e.message}`));
  process.exit(1);
});
