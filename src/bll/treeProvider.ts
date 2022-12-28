
import * as vscode from "vscode";
import { Node } from "../models/node";
import { ArtifactManager } from "./artifactManager";

export class TreeProvider implements vscode.TreeDataProvider<Node> {
    private _onDidChangeTreeData: vscode.EventEmitter<Node | undefined> =
        new vscode.EventEmitter<Node | undefined>();

    readonly onDidChangeTreeData: vscode.Event<Node | undefined> =
        this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }
    constructor(private rootManager: ArtifactManager) { }

    getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
        // const treeItem = new vscode.TreeItem(element.getLabel(), element.collapsibleState);
        element.label = element.getLabel();
        element.iconPath = element.getIcon();
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