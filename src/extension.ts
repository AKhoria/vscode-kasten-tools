/* eslint-disable @typescript-eslint/naming-convention */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as k8s from "vscode-kubernetes-tools-api";
import { addArtifactPallete } from "./bll/artifactCommandPallete";
import { K10Client } from "./clients/k10RestClient";
import { ArtifactManager } from "./bll/artifactManager";
import { serviceForwardPallete } from "./bll/serviceForwardCommandPallete";
import { TreeProvider } from "./bll/treeProvider";
import { KubctlClient } from "./clients/kubctlClient";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

let deactivateActions: (() => Promise<void>)[] = [];

export async function activate(context: vscode.ExtensionContext) {
  const kubectl = await k8s.extension.kubectl.v1;
  const kubectlConfig = await k8s.extension.configuration.v1;

  if (kubectl.available && kubectlConfig.available) {
    let kubectlClient = new KubctlClient(kubectl.api);
    let restClient = new K10Client(kubectlClient);
    let kubectlPath = kubectlConfig.api.getKubeconfigPath();
    let am = new ArtifactManager(restClient, kubectlClient);
    let tree = new TreeProvider(am);


    let commands: { [id: string]: (...args: any[]) => any; } = {
      "kasten.open": async (content: any[]) => {
        let language = content.length > 1 ? content[1] : "json";
        let fileContent = language === "json" ? JSON.stringify(content[0], undefined, 4) : content[0] as string;
        let doc = vscode.workspace.openTextDocument({ language: language, content: fileContent });
        doc.then((x) => vscode.window.showTextDocument(x));
      },
      "kasten.addOpenArtifactWindow": addArtifactPallete(context),
      "kasten.portForwardServiceStart":
        serviceForwardPallete(
          kubectlPath.pathType === "host" ? kubectlPath.hostPath : kubectlPath.wslPath,
          kubectlClient,
          d => { deactivateActions.push(d); }),
      "kasten.portForwardServiceStop":
        () => {
          deactivateActions.forEach(async action => await action());
        },
      "kasten.addArtifactsByFilter":
        async ({ key, value }) => {
          am.addFilter(key, value);
          tree.refresh();
        },
      "kasten.refreshEntry": () => tree.refresh(),
      "kasten.addEntry": addArtifactPallete(context),
      "kasten.resetTree": () => {
        am.reset();
        tree.refresh();
      },
      "kasten.resetJob": async (job: any) => {
        try {
          await restClient.resetJob(job.obj.id);
        } catch {
          vscode.window.showErrorMessage("Failed reseting job");
        }
      },
      "kasten.decryptKey": async (key: any) => {
        try {
          await restClient.decryptKey(key?.artifact?.meta?.encryptionKey?.cipherText);
        } catch {
          vscode.window.showErrorMessage("Failed decrypting key");
        }
      },
      "kasten.addArtifactByID": (id: string) => {
        am.addRootItems(id);
        tree.refresh();
      }
    };

    Object.keys(commands).forEach(commandName => {
      let disposable = vscode.commands.registerCommand(commandName, commands[commandName]);
      context.subscriptions.push(disposable);
    });
    context.subscriptions.push(vscode.window.registerTreeDataProvider("kasten.view", tree));
  }
}

// this method is called when your extension is deactivated
export function deactivate() {
  deactivateActions.forEach(async action => {
    await action();
  });
}