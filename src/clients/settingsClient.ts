
import * as vscode from "vscode";

export class SettingsClient {
    config: vscode.WorkspaceConfiguration;
    constructor() {
        this.config = vscode.workspace.getConfiguration('kasten');
    }

    getSetting<T>(key: string): T | undefined {
        return this.config.get<T>(key);
    }
}