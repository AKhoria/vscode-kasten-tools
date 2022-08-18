// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';
import { addArtifactPallete } from './bll/commandPallete';
import { K10Client } from './api/restclient';
import { ArtefactManager } from './bll/artefactManager';
import { Node } from './bll/node';
import * as path from 'path';
import { ExtensionContext, Uri } from "vscode";

let EXTENSION_CONTEXT: ExtensionContext | null = null;

export function setAssetContext(context: ExtensionContext) {
    EXTENSION_CONTEXT = context;
}

export function assetPath(relativePath: string): string {
    if (EXTENSION_CONTEXT) {  // which it always should be
        return EXTENSION_CONTEXT.asAbsolutePath(relativePath);
    }
    const absolutePath = path.join(__dirname, '..', relativePath);
    return absolutePath;
}

export function assetUri(relativePath: string): Uri {
    return Uri.file(assetPath(relativePath));
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	const kubectl = await k8s.extension.kubectl.v1;
	if (kubectl.available) {
		let client = new K10Client(kubectl.api);
		let am = new ArtefactManager(client);
		let tree = new TreeProvider(am);
		vscode.window.registerTreeDataProvider('kasten.view', tree);


		let disposable = vscode.commands.registerCommand('kasten.open', async (content: any[]) => {

			let doc = vscode.workspace.openTextDocument({
				language: "json",
				content: JSON.stringify(content, undefined, 4)
			});
			doc.then(x => vscode.window.showTextDocument(x));
		});
		vscode.commands.registerCommand('kasten.addOpenArtifactWindow', addArtifactPallete(context));
		vscode.commands.registerCommand('kasten.addArtifactByID', (id: string) => {
			am.addRootItem(id);
			tree.refresh();

		});

		//TODO implement to make not dirty file explorer
		//vscode.workspace.registerFileSystemProvider(K10S_RESOURCE_SCHEME, resourceDocProvider, { }),


		context.subscriptions.push(disposable);
	}
}

class TreeProvider implements vscode.TreeDataProvider<Node> {

	private _onDidChangeTreeData: vscode.EventEmitter<
		Node | undefined
	> = new vscode.EventEmitter<Node | undefined>();

	readonly onDidChangeTreeData: vscode.Event<Node | undefined> = this
		._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}
	constructor(private rootManager: ArtefactManager) {

	}

	// getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
	// 	// Porbably need to add UI logic here
	// 	return element;
	// }
	    getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem>  {
			const treeItem = new vscode.TreeItem(element.getLabel(), vscode.TreeItemCollapsibleState.Collapsed);
			treeItem.contextValue = 'kasten.view';
			
			switch (element.getType()) {
				case "Snapshot":
					treeItem.iconPath = {
						light: assetUri("images/snapshot.svg"),
						dark: assetUri("images/snapshot.svg"),
					};
					break;
				case "Spec":
					treeItem.iconPath = {
						light: assetUri("images/spec.svg"),
						dark: assetUri("images/spec-w.svg"),
					};
					break;
				case "Kanister":
					treeItem.iconPath = {
						light: assetUri("images/logo-kanister.svg"),
						dark: assetUri("images/logo-kanister-color.svg"),
					};
					break;
				case "Volume":
					treeItem.iconPath = {
						light: assetUri("images/volume.svg"),
						dark: assetUri("images/volume.svg"),
					};
					break;
				case "Manifest":
					treeItem.iconPath = {
						light: assetUri("images/manifest.svg"),
						dark: assetUri("images/manifest-w.svg"),
					};
					break;
			}
			
			
        return treeItem;
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
