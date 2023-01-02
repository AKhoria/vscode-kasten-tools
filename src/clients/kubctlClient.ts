import { OutputChannel, window } from "vscode";
import { KubectlV1 } from "vscode-kubernetes-tools-api";
import { Policy } from "../models/policy";
import { Service } from "../models/service";

export class KubctlClient {

    terminal: OutputChannel | undefined;
    constructor(private k: KubectlV1) {

    }

    async getHostByService(service: string): Promise<string> {
        let output = await this.k.invokeCommand(`get service ${service} -o=json`);
        let serviceInfo = JSON.parse(output?.stdout ?? "")["spec"]["selector"];
        let key = Object.keys(serviceInfo)[0];
        let output2 = await this.k.invokeCommand(`get pods --selector=${key}=${serviceInfo[key]} -o=name`);

        return (output2?.stdout ?? "").replace("pod/", "").replace("\n", "");
    }

    // Obsolete, move code here
    async invokeCommand(command: string): Promise<KubectlV1.ShellResult | undefined> {
        return await this.k.invokeCommand(command);
    }

    async scaleService(targetService: string, replica: number) {
        await this.k.invokeCommand(`scale deploy ${targetService} --replicas=${replica}`);
    }

    async getPodEnvVars(targetService: string): Promise<Map<string, string>> {

        let output = await this.k.invokeCommand(`get service ${targetService} -o=json`);
        let serviceInfo = JSON.parse(output?.stdout ?? "")["spec"]["selector"];
        let key = Object.keys(serviceInfo)[0];
        let output2 = await this.k.invokeCommand(`get pod --selector=${key}=${serviceInfo[key]} -o=jsonpath='{.items[0].spec.containers[0].env[*].name}'`);
        let envVarNames = new Set<string>(output2?.stdout?.split(" "));

        let pod = await this.getHostByService(targetService);
        let command = `exec -it -n kasten-io "${pod}" -- bash -c "printenv"`;
        let res = await this.k.invokeCommand(command);
        let envVars = res?.stdout?.split("\n")?.map(pair => pair.split("="));
        if (!envVars) {
            return new Map<string, string>(); //TODO handle
        }
        return new Map<string, string>(envVars.filter(x => envVarNames.has(x[0]) && x[0]).map(x => [x[0], x[1]]));

    }

    async requestService<T>(service: string, path: string, method: string = "GET", body: any = null): Promise<T> {
        try {
            let podName = `${await this.getHostByService(service)}`;
            let url = `http://localhost:8000/${path}`;
            let bodyCommand = "";
            if (body) {
                bodyCommand = `-H "Content-Type: application/json" --data ` + `'${body}'`;
            }
            let command = `exec ${podName} -- curl ${bodyCommand} '${url}'`;
            this.log(command);
            let output = await this.invokeCommand(command);
            return JSON.parse(output?.stdout ?? "");
        } catch (ex) {
            return null as any;
        }
    }

    async getServices(): Promise<Service[]> {
        const command = `get services -o=json`;
        let output = await this.k.invokeCommand(command);
        //TODO refactor
        const services = JSON.parse(output?.stdout ?? "{'items':[]}")["items"];
        return services;
    }

    async getPolicies(): Promise<Policy[]> {
        let command = "get --namespace kasten-io policies.config.kio.kasten.io  -o=json";
        let output = await this.k.invokeCommand(command);
        return JSON.parse(output?.stdout ?? "")?.["items"];
    }

    log(command: string) {
        if (this.terminal) {
            this.terminal.appendLine(command);
        }
    }

    set logging(val: boolean) {
        if (!this.terminal && val) {
            this.terminal = window.createOutputChannel("Kasten extention");;
        }
        if (!val && this.terminal) {
            this.terminal.dispose();
        }
    }
}