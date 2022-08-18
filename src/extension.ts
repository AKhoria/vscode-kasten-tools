// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';
import { K10Client } from './api/restclient';
import { ArtefactManager } from './bll/artefactManager';
import { Node } from './bll/node';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	const kubectl = await k8s.extension.kubectl.v1;

	if (kubectl.available) {
		vscode.window.registerTreeDataProvider('kasten.view', new TreeProvider(new ArtefactManager(new K10Client(kubectl.api))));
	}

	let disposable = vscode.commands.registerCommand('kasten.open', async (content: any[]) => {

		let doc = vscode.workspace.openTextDocument({
			language: "json",
			content: JSON.stringify(content, undefined, 4)
		});
		doc.then(x => vscode.window.showTextDocument(x));
	});

	context.subscriptions.push(disposable);
}

class TreeProvider implements vscode.TreeDataProvider<Node> {
	onDidChangeTreeData?: vscode.Event<Node | null | undefined> | undefined;

	constructor(private rootManager: ArtefactManager) {

	}

	getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
		// Porbably need to add UI logic here
		return element;
	}
	getChildren(element?: Node | undefined): vscode.ProviderResult<Node[]> {
		if (element === undefined) {
			return this.rootManager.getRootItems();
		}
		if (!element) {
			return [];
		}
		return element.getChildren();
	}
}





// this method is called when your extension is deactivated
export function deactivate() { }
