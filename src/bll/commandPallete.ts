import * as vscode from 'vscode';
import { ExtensionContext } from 'vscode';

export function addArtifactPallete(context: vscode.ExtensionContext): (...args: any[]) => any {
    return () => {
        const options: { [key: string]: (context: ExtensionContext) => Promise<void>; } = {
            addByID,
            addByFilterCondition
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
    vscode.commands.executeCommand('kasten.addArtifactByID', result);
}

export async function addByFilterCondition() {
    const result = await vscode.window.showQuickPick(['Add artefact by ID', "Add filtered artefacts by key/value"], {
        placeHolder: 'How do you want to add an artefact?',
        onDidSelectItem: item => vscode.window.showInformationMessage(`Focus: ${item}`)
    });
}