import { K10Client } from '../api/restclient';
import { ArtefactNode, LogicNode, Node, PolicyNode } from './node';

export class ArtefactManager {
    rootIds: string[];
    constructor(private k10Client: K10Client) {
        this.rootIds = ["734c5f9c-1e0b-11ed-942b-8a8fc1958bdc"];
    }
    async getRootItems(): Promise<Node[]> {
        let arts = await Promise.all(this.rootIds.map(rootId => this.k10Client.getArtifactById(rootId)));
        let artNodes = arts.map(rootArt => new ArtefactNode(this.k10Client, rootArt) as Node);
        let policyNode = await this.getPolicies();
        if (policyNode) {
            artNodes = [policyNode, ...artNodes];
        }
        return artNodes;
    }

    async getPolicies(): Promise<Node | null> {
        let policies = await this.k10Client.getPolicies();
        let policyNodes = policies.map(x => new PolicyNode(this.k10Client, x));
        return policyNodes.length > 0 ? new LogicNode("Policies", policyNodes) : null;
    }

    addRootItem(id: string) {
        this.rootIds.push(id);
    }

}
