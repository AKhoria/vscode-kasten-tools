
import { strict } from "assert";
import * as vscode from "vscode";
import { K10Client } from "../clients/k10RestClient";
import * as YAML from 'yaml';
import { KubctlClient } from "../clients/kubctlClient";
import { SettingsClient } from "../clients/settingsClient";

// TODO might be convert to class
export class KanisterManager {
    settings: SettingsClient;
    namespace: string | undefined;
    constructor(private client: KubctlClient) {
        this.settings = new SettingsClient();
        this.namespace = this.settings.getSetting<string>("kanNamespace");
    }
    async createBlueprint(name?: string) {
        if (name === null) {
            name = "kan-blueprint";
        }
        let kanisterTmpl =
            `apiVersion: cr.kanister.io/v1alpha1
kind: Blueprint
metadata:
  generateName: ${name}-
  namespace: ${this.namespace}
actions:`;
        await vscode.commands.executeCommand('kasten.open', [kanisterTmpl, "yaml", name]);
    }

    async createActionSet(name?: string) {
        if (name === null) {
            name = "kan-actionset";
        }
        let kanisterTmpl =
            `apiVersion: cr.kanister.io/v1alpha1
kind: ActionSet
metadata:
  generateName: ${name}-
  namespace: ${this.namespace}
spec:
  actions: 
`;
        await vscode.commands.executeCommand('kasten.open', [kanisterTmpl, "yaml", name]);
    }

    async validateBlueprint(blueprintJSON: string): Promise<[boolean, string]> {
        const request = `{
            "kind": "AdmissionReview",
            "apiVersion": "admission.k8s.io/v1",
            "request": {
               "uid": "0943ee9e-f36e-4f20-b641-a4f2682abb6b",
               "kind": {
                  "group": "cr.kanister.io",
                  "version": "v1alpha1",
                  "kind": "Blueprint"
               },
               "resource": {
                  "group": "cr.kanister.io",
                  "version": "v1alpha1",
                  "resource": "blueprints"
               },
               "name": "kanister",
               "namespace": "kanister",
               "operation": "CREATE",
               "userInfo": {
                  "username": "kubernetes-admin",
                  "groups": [
                     "system:masters",
                     "system:authenticated"
                  ]
               },
               "object": ${blueprintJSON}
            }
         }`;
        var validationResult = await this.client.requestService<AdmissionReviewResponse>("kanister-kanister-operator", "validate/v1alpha1/blueprint", "POST", request, 9443, "https", this.namespace);
        if (!validationResult || !validationResult.response || !validationResult.response.allowed) {
            const msg = validationResult?.response?.status?.message ?? validationResult?.response?.status?.reason ?? "unknown error";
            return [false, msg];
        }

        return [true, ""];
    }

    async setupKanisterActivation(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                'yaml', new ActionSetCompletionItemProvider(this.client), '-'));

        const diagnosticCollection = vscode.languages.createDiagnosticCollection('kanister');
        vscode.workspace.onWillSaveTextDocument(async event => {
            const document = event.document;
            if (document.languageId !== "yaml" || document.lineCount > 120) {
                return;
            }
            const obj = YAML.parse(document.getText());
            if (obj.kind !== "Blueprint") {
                return;
            }

            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Validating Blueprint',
                    cancellable: false,
                },
                async (progress) => {
                    progress.report({ increment: 0, message: '' });
                    try {
                        const jsonString = JSON.stringify(obj);
                        const [valid, details] = await this.validateBlueprint(jsonString);
                        if (!valid) {
                            const diagnostics = [];
                            const range = new vscode.Range(0, 0, document.lineCount, 0);
                            const diagnostic = new vscode.Diagnostic(range, details, vscode.DiagnosticSeverity.Error);
                            diagnostics.push(diagnostic);
                            diagnosticCollection.set(document.uri, diagnostics);
                        } else {
                            diagnosticCollection.set(document.uri, []);
                        }
                    } catch (e) {
                        vscode.window.showErrorMessage("Failed to run validation of Blueprint");
                    } finally {
                        progress.report({ increment: 100, message: 'Completed!' });
                    }
                }
            );
        });
    }
}

interface AdmissionReviewResponse {
    response: {
        uid: string;
        allowed: boolean;
        status: {
            metadata: {};
            message: string;
            reason: string;
            code: number;
        };
    }
}

export class ActionSetCompletionItemProvider implements vscode.CompletionItemProvider {
    constructor(private kubectlClient: KubctlClient) { }
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
        if (document.languageId !== "yaml" || document.lineCount > 120) {
            return [];
        }
        const lineText = document.lineAt(position.line).text;
        let extraLine = false;
        if (lineText.endsWith("actions: ")) {
            extraLine = true;
        }

        const bps = this.getBPs(extraLine);
        return bps;
    }
    resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
        throw new Error("Method not implemented.");
    }

    async getBPs(extraLine: boolean): Promise<vscode.CompletionItem[]> {
        const bps = await this.kubectlClient.getBlueprints();
        const items = bps.flatMap(x => x.actions.map(y => [x.name, y])).map(x => {
            const item = new vscode.CompletionItem(`${x[0]}: ${x[1]}`);
            let str =`- name: ${x[1]}
  blueprint: ${x[0]}
  object:
    kind: $1
    name: $2
    namespace: $3`;
            if (extraLine){
                str = `
${str}`;
            }
            item.insertText = new vscode.SnippetString(str);
            item.kind = vscode.CompletionItemKind.Text;

            return item;
        });

        return items;
    }
}