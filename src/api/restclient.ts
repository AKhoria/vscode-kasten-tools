import { commands } from "vscode";
import { KubectlV1 } from "vscode-kubernetes-tools-api";
import { PolicyNode } from "../bll/node";
import { Artifact } from "./artifact";

export class K10Client {
    urlBuilder: UrlBuilder;
    catalogName: string = "catalog-svc";
    constructor(private k: KubectlV1) {
        this.urlBuilder = new UrlBuilder(k);
    }

    async getArtifactById(id: string): Promise<Artifact> {
        return await this.requestService(this.catalogName, `v0/artifacts/${id}`);
    }

    async getPolicies(): Promise<PolicyNode> {
        let command = "kubectl get --namespace kasten-io policies.config.kio.kasten.io  -o=json";
        let output = await this.k.invokeCommand(command);
        return JSON.parse(output?.stdout ?? "");
    }

    async listArtifacts() {
        // kubectl exec catalog-svc-858d5457fc-jmthb -- curl 'http://catalog-svc:8000/v0/artifacts/search?key=manifest-policy&value=kasten-io-basic-app-backup'
    }



    async requestService<T>(service: string, path: string, method: string = "GET"): Promise<T> {
        try {
            let podName = `${await this.urlBuilder.getHostByService(service)}`;
            let url = `http://localhost:8000/${path}`;
            let command = `exec ${podName} -- curl '${url}'`;
            let output = await this.k.invokeCommand(command);
            return JSON.parse(output?.stdout ?? "");
        } catch {
            return null as any;
        }

    }

}

export class UrlBuilder {

    constructor(private k: KubectlV1) { }

    async getHostByService(service: string): Promise<string> {
        let output = await this.k.invokeCommand(`get service ${service} -o=json`);
        let serviceInfo = JSON.parse(output?.stdout ?? "")["spec"]["selector"];
        let key = Object.keys(serviceInfo)[0]
        let output2 = await this.k.invokeCommand(`get pods --selector=${key}=${serviceInfo[key]} -o=name`);

        return (output2?.stdout ?? "").replace("pod/", "").replace("\n", "");

    }

}