import * as vscode from 'vscode';
import { KubctlClient } from '../clients/kubctlClient';
import { SettingsClient } from '../clients/settingsClient';
import { Service } from '../models/service';

export function serviceForwardPallete(kubeConfigPath: string, kubectlClient: KubctlClient, cleanup: (d: () => Promise<void>) => void): (...args: any[]) => any {
    return async () => {
        const services = await kubectlClient.getServices();

        const quickPick = vscode.window.createQuickPick();

        quickPick.items = services.map(service => ({ label: service.metadata.name }));
        quickPick.onDidChangeSelection(async selection => {
            if (selection[0]) {
                let dispose = await portForward(kubectlClient, selection[0].label, services, kubeConfigPath);
                cleanup(dispose);
                quickPick.hide();
            }
        });
        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
    };
}

async function portForward(client: KubctlClient, targetService: string, services: Service[], kubeConfigPath: string): Promise<() => Promise<void>> {
    vscode.window.showInformationMessage("Starting port forwarding...");
    let settingsController = new SettingsClient(); //TODO  inject
    let localPort = settingsController.getSetting<number>("portForwardStartingPort") ?? 8001;
    let output = settingsController.getSetting<string[]>("extraEnvVars") ?? [];
    output.push(`KUBECONFIG=${kubeConfigPath}`)
    output.push(`POD_NAME=${require("os").hostname()}`)

    let envVarMap = await client.getPodEnvVars(targetService);

    let terminals: vscode.Terminal[] = [];
    services.forEach(srv => {
        if (srv.metadata.name !== targetService) {
            srv.spec.ports.forEach(portInfo => {
                const terminalOptions = {
                    name: srv.metadata.name,
                    env: process.env
                };
                terminalOptions.env['KUBECONFIG'] = kubeConfigPath;
                let terminal = vscode.window.createTerminal(terminalOptions);
                terminals.push(terminal);
                terminal.hide();
                terminal.sendText(`kubectl port-forward deployments/${srv.metadata.name} ${localPort}:${portInfo.port} -n kasten-io`);

                let prefix = srv.metadata.name.toUpperCase().replace("-", "_");
                if (!envVarMap.has(`${prefix}_PORT`)) { // SETUP the main service
                    envVarMap.set(`${prefix}_PORT`, localPort.toString());
                    envVarMap.set(`${prefix}_SERVICE_HOST`, `127.0.0.1`);
                    envVarMap.set(`${prefix}_SERVICE_PORT`, localPort.toString());
                }
                envVarMap.set(`${prefix}_SERVICE_PORT_${portInfo.port}`, localPort.toString());
                localPort++;
            });
        }
    });

    envVarMap.forEach((val, key) => output.push(`${key}=${val}`));

    await client.scaleService(targetService, 0);

    vscode.env.clipboard.writeText(output.join("\n"));
    vscode.window.showInformationMessage("Your EnvVars were copied to clipboard");
    vscode.commands.executeCommand("kasten.open", [output.join("\n"), "text"]);

    return async () => {
        terminals.forEach(t => t.dispose());
        await client.scaleService(targetService, 1); // TODO scale up the right amount
        vscode.window.showInformationMessage(`Closed port-forwarding and scaled up service: ${targetService}`);
    };
}