import * as vscode from "vscode";
import { base, get_today, get_current_user } from "./utils";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "work-diary-sidebar";

  public webview: vscode.WebviewView | null = null;

  private _view?: vscode.WebviewView;

  private token: string = "";

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    this.setToken();
    if (!this.token) {
      vscode.window.showErrorMessage("请先设置token");
    }

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    // 监听web端传来的消息
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "WebSendMesToVsCode":
          {
            if (message.key === "spent") {
              const token = await vscode.window.showInputBox({
                ignoreFocusOut: true, // 当焦点移动到编辑器的另一部分或另一个窗口时, 保持输入框打开
                password: false, // 为 true 就表示是密码类型
                prompt: "Enter personal access tokens", // 文本输入提示
                value: "", // 默认值, 默认全部选中
              });

              vscode.window.showInformationMessage("spent");

              // webviewView.webview.postMessage({
              //   command: "vscodeSendMesToWeb",
              //   key: "username",
              //   data: "test",
              // });
            } else if (message.key === "showLogs") {
              vscode.window.showInformationMessage("showlogs");
            } else if (message.key === "submit") {
              vscode.window.showInformationMessage("submit");
            }
          }
          return;
      }
    }, undefined);

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    this.show(webviewView);
  }

  private async show(webviewView) {
    const user = await get_current_user(this.token);
    console.log("user", user);

    const projectIds = await get_project_ids(this.token, user.id);
    console.log("projectIds", projectIds);
    const promises = projectIds.map((item) => {
      return get_project_commits(this.token, item, user.username);
    });

    let commits = await Promise.all(promises);

    let issues = [];
    commits.forEach((item) => {
      issues.push(...item);
    });

    issues = buildIssueUrl(issues);

    webviewView.webview.postMessage({
      command: "vscodeSendMesToWeb",
      key: "issues",
      data: issues,
    });
  }

  public setToken() {
    const config = vscode.workspace.getConfiguration("work-diary");
    if (config && config.token) {
      this.token = config.token;
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out/webview/assets", "index.js")
    );

    // Do the same for the stylesheet.
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out/webview/assets", "index.css")
    );

    return `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">

					<link href="${styleMainUri}" rel="stylesheet">

					<title>Base View Extension</title>
				</head>
				<body>
					<script>
            const tsvscode = acquireVsCodeApi();
					</script>
					<div id="app"></div>
          <script type="module" src="${scriptUri}"></script>
				</body>
			</html>`;
  }
}

async function get_project_ids(token, id) {
  const response = await fetch(
    `${base}/api/v4/users/${id}/contributed_projects`,
    {
      headers: {
        Accept: "application/json, application/xml, text/plain, text/html, *.*",
        "Content-Type": "application/json; charset=utf-8",
        "PRIVATE-TOKEN": token,
      },
      credentials: "include",
    }
  );

  let res = await response.json();
  console.log("projectssssss", res);

  return res
    .filter((item) => {
      return new Date(item.updated_at) > new Date(get_today());
    })
    .map((item) => item.id);
}

async function get_project_commits(token, id, username) {
  const response = await fetch(
    `${base}/api/v4/projects/${id}/repository/commits?since=${get_today()}&author=${username}`,
    {
      headers: {
        Accept: "application/json, application/xml, text/plain, text/html, *.*",
        "Content-Type": "application/json; charset=utf-8",
        "PRIVATE-TOKEN": token,
      },
      credentials: "include",
    }
  );
  if (response.status !== 200) {
    throw new Error("Get Current User Failed");
  }
  let res = await response.json();
  console.log("commits", res);

  return res;
}

function buildIssueUrl(data) {
  const commits = [];
  data.forEach((item) => {
    const matchs = item.title.match(/#(\d+(#note_\d+)*)/);
    const matchsName = item.title.match(/(?=docs_)\w+/);
    if (matchs && matchsName) {
      const issuesUrl = `${base}/cheftin/${matchsName[0]}/-/issues/${matchs[1]}`;
      commits.push({
        name: `${matchsName[0]}#${matchs[1]}`,
        url: issuesUrl,
      });
    }
  });
  return commits;
}
