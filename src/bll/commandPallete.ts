import * as vscode from 'vscode';
import { ExtensionContext } from 'vscode';

export function addArtifactPallete(context: vscode.ExtensionContext): (...args: any[]) => any {
    return () => {
        const options: { [key: string]: (context: ExtensionContext) => Promise<void> } = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "Add artifact by ID": addByID,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "Add artifacts by filter condition": addByFilterCondition
        };

        const quickPick = vscode.window.createQuickPick();
        quickPick.items = Object.keys(options).map(label => ({ label }));
        quickPick.onDidChangeSelection(selection => {
            if (selection[0]) {
                options[selection[0].label](context)
                    .catch(console.error);
            }
        });
        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();

    };
}

export async function addByID() {
    const result = await vscode.window.showInputBox({
        value: '',
        placeHolder: 'Artifact ID',
    });
    if (result) {
        vscode.commands.executeCommand('kasten.addArtifactByID', result);
    }

}

export async function addByFilterCondition() {
    const key = await vscode.window.showInputBox({
        value: 'manifest-policy',
        placeHolder: 'Filter Name',
    });
    if (key) {
        const value = await vscode.window.showInputBox({
            value: '',
            placeHolder: 'Value',
        });
        if (value) {
            vscode.commands.executeCommand('kasten.addArtifactsByFilter', { key, value });
        }
    }

}