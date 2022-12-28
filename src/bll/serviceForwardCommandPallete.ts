import * as vscode from 'vscode';
import { KubctlClient } from '../clients/kubctlClient';
import { SettingsClient } from '../clients/settingsClient';
import { Service } from '../models/service';

export function serviceForwardPallete(kubeConfigPath: string, kubectlClient: KubctlClient): (...args: any[]) => any {
    return async () => {
        const services = await kubectlClient.getServices();

        const quickPick = vscode.window.createQuickPick();

        quickPick.items = services.map(service => ({ label: service.metadata.name }));
        quickPick.onDidChangeSelection(async selection => {
            if (selection[0]) {
                await portForward(kubectlClient, selection[0].label, services, kubeConfigPath);
            }
        });
        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
    };
}

async function portForward(client: KubctlClient, targetService: string, services: Service[], kubeConfigPath: string) {
    let settingsController = new SettingsClient(); //TODO  inject
    let localPort = settingsController.getSetting<number>("portForwardStartingPort") ?? 8001;
    let output = settingsController.getSetting<string[]>("extraEnvVars") ?? [];


    var envVarMap = await client.getPodEnvVars(targetService);

    // TODO add to plugin's setting


    services.forEach(srv => {
        if (srv.metadata.name !== targetService) {
            srv.spec.ports.forEach(portInfo => {
                const terminalOptions = {
                    name: srv.metadata.name,
                    env: process.env
                };
                terminalOptions.env['KUBECONFIG'] = kubeConfigPath;
                let terminal = vscode.window.createTerminal(terminalOptions);
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

    await client.scaleDownService(targetService);


    vscode.env.clipboard.writeText(output.join("\n"));
    vscode.window.showInformationMessage("Copied to clipboard");

    vscode.commands.executeCommand("kasten.open", [output.join("\n"), "text"]);

    // vscode.window.activeTerminal?.sendText(`echo ${output.join(" \\ \n")}`);

    return;

}