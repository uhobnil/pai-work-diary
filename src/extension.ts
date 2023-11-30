import * as vscode from "vscode";
// import { BaseView } from "./View";
import { BaseView } from "./View";
import { StatusBarItem } from "./StatusBarItem";
import { TaskProvider } from "./TaskProvider";

export function activate(context: vscode.ExtensionContext) {
  const baseView = new BaseView();
  const statusBarItem = new StatusBarItem();
  const taskProvider = new TaskProvider(vscode.workspace.rootPath);

  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(baseView);

  vscode.window.registerTreeDataProvider(TaskProvider.viewType, taskProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand("work-diary.refresh", (url) => {
      taskProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("work-diary.task.view", (url) => {
      vscode.env.openExternal(url);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("work-diary.config", async () => {
      const token = await vscode.window.showInputBox({
        ignoreFocusOut: true, // 当焦点移动到编辑器的另一部分或另一个窗口时, 保持输入框打开
        password: false, // 为 true 就表示是密码类型
        prompt: "Enter personal access tokens", // 文本输入提示
        value: "", // 默认值, 默认全部选中
      });

      const config = vscode.workspace.getConfiguration("work-diary");

      await config.update("token", token, true);
      baseView.setToken();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("work-diary.view", () => {
      baseView.show();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("work-diary.submit", () => {
      baseView.submit();
    })
  );
}
