import * as vscode from 'vscode';
import { ExtensionContext } from 'vscode';
import { K10Client } from '../api/k10client';
import { Service } from './service';

export function serviceForwardPallete(context: vscode.ExtensionContext, client: K10Client): (...args: any[]) => any {
    return async () => {
        const services = await client.getServices();

        const quickPick = vscode.window.createQuickPick();

        quickPick.items = services.map(service => ({ label: service.metadata.name }));
        quickPick.onDidChangeSelection(async selection => {
            if (selection[0]) {
                await portForward(client, selection[0].label, services);
            }
        });
        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
    };
}

async function portForward(client: K10Client, targetService: string, services: Service[]) {
    // TODO dynamic port or settings/parameters
    let localPort = 8001;


    var envVarMap = await client.getPodEnvVars(targetService);

    // TODO add to plugin's setting
    envVarMap.set("POD_SERVICE_ACCOUNT", "k10-k10");
    envVarMap.set("CRYPTO_SVC_SERVICE_PORT_EVENTS", "8002");

    services.forEach(srv => {
        if (srv.metadata.name !== targetService) {
            srv.spec.ports.forEach(portInfo => {
                let terminal = vscode.window.createTerminal(srv.metadata.name);
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
    let output: string[] = [];
    envVarMap.forEach((val, key) => output.push(`${key}=${val}`));

    await client.scaleDownService(targetService);


    vscode.env.clipboard.writeText(output.join("\n"));
    vscode.window.showInformationMessage("Copied to clipboard");

    vscode.commands.executeCommand("kasten.open", [output.join("\n"), "text"]);

    // vscode.window.activeTerminal?.sendText(`echo ${output.join(" \\ \n")}`);

    return;

}