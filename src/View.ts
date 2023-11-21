import * as vscode from "vscode";
const fs = require("fs");
const path = require("path");

import { base, get_today, get_current_user } from "./utils";

import { gql } from "@urql/core";
import { Client, cacheExchange, fetchExchange } from "@urql/core";

interface User {
  id: number;
  username: string;
}

class Summary {
  totalSpentTime = 0;
  issues: Array<Issue> = [];
  token: string;

  constructor(token: string) {
    this.token = token;
  }

  async fetchIssue(client: Client): Promise<void> {
    console.log(get_today());

    const user = await get_current_user(this.token);
    console.log("useruseruseruser", user);

    const response = await client.query(
      gql`
        query get_timelogs($name: String!, $startAt: Time!) {
          timelogs(username: $name, startDate: $startAt) {
            count
            totalSpentTime
            nodes {
              timeSpent
              spentAt
              issue {
                webUrl
                title
                state
                labels {
                  nodes {
                    title
                  }
                }
              }
              project {
                name
              }
            }
          }
        }
      `,
      {
        name: user.username,
        startAt: `${get_today()}+8:00`,
      }
    );
    console.log("responseresponseresponse", response);

    const issues = response.data.timelogs.nodes.map((node: any) => {
      let status = "Doing";
      if (
        node.state == "closed" ||
        node.issue.labels.nodes.some((label: { title: string }) => {
          console.log(label.title);
          return (
            label.title.toLowerCase() == "to test" ||
            label.title.toLowerCase() == "Fixed" ||
            label.title.toLowerCase().includes("tested")
          );
        })
      ) {
        status = "Done";
      }
      return new Issue(
        node.project.name,
        node.issue.title,
        node.issue.webUrl,
        status,
        node.spentAt
      );
    });
    this.totalSpentTime = response.data.timelogs.totalSpentTime;
    console.log(this.totalSpentTime);
    this.issues.push(...issues);
  }
}

class Issue {
  project: string;
  title: string;
  webUrl: string;
  status: string;
  cost: number;

  constructor(
    project: string,
    title: string,
    webUrl: string,
    status: string,
    cost: number
  ) {
    this.project = project;
    this.title = title;
    this.webUrl = webUrl;
    this.status = status;
    this.cost = cost;
  }
}

export class BaseView {
  private token: string = "";

  constructor() {
    this.setToken();
  }

  public setToken() {
    const config = vscode.workspace.getConfiguration("work-diary");
    if (config && config.token) {
      this.token = config.token;
    }
  }

  public async show() {
    const summary = new Summary(this.token);
    const apolloClient = await this.getClient();
    await summary.fetchIssue(apolloClient);

    const has_exist: any = [];
    console.log("isssssssssss", summary.issues);

    const texts = summary.issues.map((issue) => {
      if (has_exist.indexOf(issue.webUrl) < 0) {
        has_exist.push(issue.webUrl);
        const rDocNameExp = /cheftin\/docs_(?<name>\w+)\//;
        const docNameMatch = rDocNameExp.exec(issue.webUrl);
        const docName = docNameMatch ? docNameMatch.groups?.["name"] : null;
        if (docName) {
          return [
            `##### ${docName.charAt(0).toUpperCase() + docName.slice(1)}  [${
              issue.title
            }](${issue.webUrl})`,
            `- ${get_today()} | 100% | ${get_today()}`,
            `- ${issue.status}`,
          ].join("\n");
        }
      } else {
        return "";
      }
    });
    console.log("-------------", texts);

    const tempContent = texts.filter((item) => item !== "").join("\n\n");

    const vscodeInstallDir = path.dirname(vscode.env.appRoot);
    const diaryPath = path.join(vscodeInstallDir, "work-diary.md");
    fs.writeFile(diaryPath, tempContent, function (err) {
      if (err) {
        vscode.window.showErrorMessage("Failed to create work diary file.");
      } else {
        vscode.workspace.openTextDocument(diaryPath).then((document) => {
          vscode.window.showTextDocument(document);
        });
        const statusBarItem = vscode.window.createStatusBarItem(
          vscode.StatusBarAlignment.Right,
          999999
        );
        statusBarItem.text = `总工时：${summary.totalSpentTime / 3600}h`;
        vscode.window.onDidChangeActiveTextEditor((editor) => {
          if (editor && editor.document.fileName.endsWith("work-diary.md")) {
            statusBarItem.show();
          } else {
            statusBarItem.hide();
          }
        });
      }
    });
  }

  public async submit(): Promise<void> {
    const apolloClient = await this.getClient();
    const journal_url = await this.getJournalUrl(apolloClient);
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document;
      const content = document.getText();

      const response = await fetch(journal_url, {
        method: "POST",
        body: JSON.stringify({ body: content }),
        headers: {
          Accept:
            "application/json, application/xml, text/plain, text/html, *.*",
          "Content-Type": "application/json; charset=utf-8",
          "PRIVATE-TOKEN": this.token,
        },
        credentials: "include",
      });

      if (Math.floor(response.status / 200) === 1) {
        vscode.window.showInformationMessage("日志已提交");
      } else {
        vscode.window.showErrorMessage(`Fetch Error :-S ${response.text}`);
      }
    }
  }

  private async getJournalUrl(client: Client): Promise<string> {
    const user = await get_current_user(this.token);
    const response = await client.query(
      gql`
        query get_play_journal($name: String!) {
          project(fullPath: "cheftin/play_journal") {
            issue(authorUsername: $name) {
              iid
            }
          }
        }
      `,
      {
        name: user.username,
      }
    );
    return `${base}/api/v4/projects/cheftin%2Fplay_journal/issues/${response.data.project.issue.iid}/notes`;
  }

  private async getClient(): Promise<Client> {
    const client = new Client({
      url: `${base}/api/graphql`,
      exchanges: [cacheExchange, fetchExchange],
      fetchOptions: () => {
        return {
          headers: { "PRIVATE-TOKEN": this.token },
        };
      },
    });
    return client;
  }

  dispose() {
    return void 0;
  }
}
