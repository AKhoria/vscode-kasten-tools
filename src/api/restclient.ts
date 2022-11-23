import { commands } from "vscode";
import { KubectlV1 } from "vscode-kubernetes-tools-api";
import { PolicyNode } from "../bll/node";
import { Artifact } from "./artifact";
import { Policy } from "./policy";
import * as vscode from "vscode";

export class K10Client {
    async decryptKey(text: string) {
        let body = `{"Data":"${text}"}`;
        let result = await this.requestService<{ data: string }>(this.cryptoName, `v0/decryptdata`, "POST", body);
        if (result.data) {
            vscode.env.clipboard.writeText(result.data);
            vscode.window.showInformationMessage("Copied to clipboard");
        }
    }

    urlBuilder: UrlBuilder;
    catalogName: string = "catalog-svc";
    jobName: string = "jobs-svc";
    cryptoName: string = "crypto-svc";

    terminal: vscode.OutputChannel | undefined;

    constructor(private k: KubectlV1) {
        this.urlBuilder = new UrlBuilder(k);
    }

    async getJob(jobID: string): Promise<any> {
        return await this.requestService(this.jobName, `v0/jobs/${jobID}`);
    }
    async resetJob(jobID: string): Promise<any> {
        let body = `"${jobID}"`;
        return await this.requestService(this.jobName, `v0/queuedjobs/reset?visibilityTimeout=0`, "POST", body);
    }

    async getArtifactById(id: string): Promise<Artifact> {
        return await this.requestService(this.catalogName, `v0/artifacts/${id}`);
    }

    async getPolicies(): Promise<Policy[]> {
        let command = "get --namespace kasten-io policies.config.kio.kasten.io  -o=json";
        let output = await this.k.invokeCommand(command);
        return JSON.parse(output?.stdout ?? "")?.["items"];
    }

    async listArtifacts(key: string, value: string): Promise<Artifact[]> {
        const artifacts: Artifact[] = await this.requestService(this.catalogName, `v0/artifacts/search?key=${key}&value=${value}`);
        return artifacts.sort((a: Artifact, b: Artifact) => {
            const act: number = new Date(a.creationTime).getTime();
            const bct: number = new Date(b.creationTime).getTime();
            return bct - act;
        });
    }

    async requestService<T>(service: string, path: string, method: string = "GET", body: any = null): Promise<T> {
        try {
            let podName = `${await this.urlBuilder.getHostByService(service)}`;
            let url = `http://localhost:8000/${path}`;
            let bodyCommand = "";
            if (body) {
                bodyCommand = `-H "Content-Type: application/json" --data ` + `'${body}'`;
            }
            let command = `exec ${podName} -- curl ${bodyCommand} '${url}'`;
            this.log(command);
            let output = await this.k.invokeCommand(command);
            return JSON.parse(output?.stdout ?? "");
        } catch (ex) {
            return null as any;
        }

    }
    log(command: string) {
        if (this.terminal) {
            this.terminal.appendLine(command);
        }
    }

    set logging(val: boolean) {
        if (!this.terminal && val) {
            this.terminal = vscode.window.createOutputChannel("Kasten extention");;
        }
        if (!val && this.terminal) {
            this.terminal.dispose();
        }
    }

}

export class UrlBuilder {

    constructor(private k: KubectlV1) { }

    async getHostByService(service: string): Promise<string> {
        let output = await this.k.invokeCommand(`get service ${service} -o=json`);
        let serviceInfo = JSON.parse(output?.stdout ?? "")["spec"]["selector"];
        let key = Object.keys(serviceInfo)[0];
        let output2 = await this.k.invokeCommand(`get pods --selector=${key}=${serviceInfo[key]} -o=name`);

        return (output2?.stdout ?? "").replace("pod/", "").replace("\n", "");

    }

}