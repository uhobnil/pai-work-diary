import * as vscode from "vscode";

export class StatusBarItem {
  private readonly statusBarItem: vscode.StatusBarItem;

  constructor() {
    const statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      0
    );
    statusBarItem.text = "PAI work diary";
    statusBarItem.tooltip = "View work diary";
    statusBarItem.command = "work-diary.view";
    this.statusBarItem = statusBarItem;
    this.statusBarItem.show();
  }

  show() {
    this.statusBarItem.show();
  }
  hide() {
    this.statusBarItem.hide();
  }
  dispose() {
    this.statusBarItem.dispose();
  }
}
