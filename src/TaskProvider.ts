import * as vscode from "vscode";
import { base, get_today, get_current_user } from "./utils";

export class TaskProvider implements vscode.TreeDataProvider<TaskItemNode> {
  public static readonly viewType = "task-list-view";
  private token: string = "";

  constructor(private workspaceRoot: string) {
    this.setToken();
  }

  public setToken() {
    const config = vscode.workspace.getConfiguration("work-diary");
    if (config && config.token) {
      this.token = config.token;
    }
  }

  getTreeItem(element: TaskItemNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TaskItemNode): Thenable<TaskItemNode[]> {
    return Promise.resolve(this.getTaskList());
  }

  /**
   * Given the path to package.json, read all its dependencies
   */
  private async getTaskList(): Promise<TaskItemNode[]> {
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
    return issues;
  }
}

class TaskItemNode extends vscode.TreeItem {
  constructor(public readonly label: string, public url: string) {
    super(label);
    this.url = this.url;

    this.command = {
      title: this.label, // 标题
      command: "work-diary.task.view", // 命令 ID
      arguments: [
        // 向 registerCommand 传递的参数。
        this.url, // 目前这里我们只传递一个 label
      ],
    };
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
  const commits: TaskItemNode[] = [];
  data.forEach((item) => {
    const matchs = item.title.match(/#(\d+(#note_\d+)*)/);
    const matchsName = item.title.match(/(?=docs_)\w+/);
    if (matchs && matchsName) {
      const issuesUrl = `${base}/cheftin/${matchsName[0]}/-/issues/${matchs[1]}`;
      const commit = new TaskItemNode(
        `${matchsName[0]}#${matchs[1]}`,
        issuesUrl
      );
      commits.push(commit);
    }
  });
  return commits;
}
