import { Artifact } from "../models/artifact";
import * as vscode from "vscode";
import { KubctlClient } from "./kubctlClient";

export class K10Client {

    catalogName: string = "catalog-svc";
    jobName: string = "jobs-svc";
    cryptoName: string = "crypto-svc";

    constructor(private kubectlClient: KubctlClient) {

    }

    async decryptKey(text: string) {
        let body = `{"Data":"${text}"}`;
        let result = await this.kubectlClient.requestService<{ data: string }>(this.cryptoName, `v0/decryptdata`, "POST", body);
        if (result.data) {
            vscode.env.clipboard.writeText(result.data);
            vscode.window.showInformationMessage("Copied to clipboard");
        }
    }

    async getJob(jobID: string): Promise<any> {
        return await this.kubectlClient.requestService(this.jobName, `v0/jobs/${jobID}`);
    }
    async resetJob(jobID: string): Promise<any> {
        let body = `"${jobID}"`;
        return await this.kubectlClient.requestService(this.jobName, `v0/queuedjobs/reset?visibilityTimeout=0`, "POST", body);
    }

    async getArtifactById(id: string): Promise<Artifact> {
        return await this.kubectlClient.requestService(this.catalogName, `v0/artifacts/${id}`);
    }

    async deleteArtifactById(id: string): Promise<Artifact> {
        return await this.kubectlClient.requestService(this.catalogName, `v0/artifacts/${id}`, "DELETE");
    }

    async listArtifacts(key: string, value: string): Promise<Artifact[]> {
        const artifacts: Artifact[] = await this.kubectlClient.requestService(this.catalogName, `v0/artifacts/search?key=${key}&value=${value}`);
        return artifacts.sort((a: Artifact, b: Artifact) => {
            const act: number = new Date(a.creationTime).getTime();
            const bct: number = new Date(b.creationTime).getTime();
            return bct - act;
        });
    }
}