import { K10Client } from '../clients/k10RestClient';
import { ArtifactNode, LogicNode, Node, PolicyNode } from '../models/node';
import * as vscode from 'vscode';
import { KubctlClient } from '../clients/kubctlClient';
export class ArtifactManager {
    rootIds: string[];
    filters: { key: string, value: string }[];
    constructor(private k10Client: K10Client, private kubectClient: KubctlClient) {
        this.rootIds = [];
        this.filters = [];
    }
    async getRootItems(): Promise<Node[]> {
        let res: Node[] = [];
        await this.withExceptionNotification(async () => {
            let arts = await Promise.all(this.rootIds.map(rootId => this.k10Client.getArtifactById(rootId)));
            let artNodes = arts.map(rootArt => new ArtifactNode(this.k10Client, rootArt) as Node);
            res = [...res, ...artNodes];
        }, "Failed to get artifacts by ID");

        await this.withExceptionNotification(async () => {
            let policyNode = await this.getPolicy();
            if (policyNode) {
                res = [policyNode, ...res];
            }
        }, "Failed to get policies");

        await this.withExceptionNotification(async () => {
            if (this.filters.length > 0) {
                let filteredNodes = (await Promise.all(this.filters.map(async ({ key, value }) => {
                    let filteredArts = await this.k10Client.listArtifacts(key, value);
                    return filteredArts.map(x => new ArtifactNode(this.k10Client, x) as Node);
                }))).flatMap(x => x);
                res = [...res, ...filteredNodes];
            }
        }, "Failed to get artifacts by filtering condition");

        return res;
    }

    async getPolicy(): Promise<Node | null> {
        try {
            let policies = await this.kubectClient.getPolicies();
            let policyNodes = policies.map(x => new PolicyNode(this.k10Client, x));
            return policyNodes.length > 0 ? new LogicNode("Policies", policyNodes) : null;
        } catch (ex) {
            vscode.window.showErrorMessage("Failed on getting policies");
            return null;
        }
    }

    addFilter(key: string, value: string) {
        this.filters.push({ key, value });
    }
    addRootItems(...ids: string[]) {
        this.rootIds.push(...ids);
    }
    reset() {
        this.rootIds = [];
        this.filters = [];
    }

    async withExceptionNotification(arg: () => Promise<void>, err: string) {
        try {
            await arg();
        } catch {
            vscode.window.showErrorMessage(err);
        }
    }

}
