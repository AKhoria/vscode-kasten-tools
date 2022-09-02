import { commands } from "vscode";
import { KubectlV1 } from "vscode-kubernetes-tools-api";
import { PolicyNode } from "../bll/node";
import { Artifact } from "./artifact";
import { Policy } from "./policy";

export class K10Client {

    urlBuilder: UrlBuilder;
    catalogName: string = "catalog-svc";
    jobName: string = "jobs-svc";
    constructor(private k: KubectlV1) {
        this.urlBuilder = new UrlBuilder(k);
    }

    async getJob(jobID: string): Promise<any> {
        return await this.requestService(this.jobName, `v0/jobs/${jobID}`);
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
        let key = Object.keys(serviceInfo)[0];
        let output2 = await this.k.invokeCommand(`get pods --selector=${key}=${serviceInfo[key]} -o=name`);

        return (output2?.stdout ?? "").replace("pod/", "").replace("\n", "");

    }

}