import { K10Client } from '../api/restclient';
import { ArtefactNode, Node } from './node';

export class ArtefactManager {
    rootIds: string[];
    constructor(private k10Client: K10Client) {
        this.rootIds = ["734c5f9c-1e0b-11ed-942b-8a8fc1958bdc"];
    }
    async getRootItems(): Promise<Node[]> {
        let arts = await Promise.all(this.rootIds.map(rootId => this.k10Client.getArtifactById(rootId)))
        return arts.map(rootArt => new ArtefactNode(this.k10Client, rootArt));
    }

    async getPolicies() {

    }

}
