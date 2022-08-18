import * as vscode from 'vscode';
import { Artifact } from '../api/artifact';
import { K10Client } from '../api/restclient';

export abstract class Node extends vscode.TreeItem {
    raw: any;

    children: Node[] | undefined;

    abstract getChildren(): Promise<Node[]>;

    abstract getLabel(): string;

    abstract getType(): string;
}

export class ArtefactNode extends Node {
    raw: any;
    constructor(private k10Client: K10Client, private artifact: Artifact) {
        super(artifact.id, (artifact?.meta?.manifest?.entries?.length ?? 0) === 0 ? vscode.TreeItemCollapsibleState.None :
            vscode.TreeItemCollapsibleState.Collapsed);
        this.command = {
            title: "Open",
            command: "kasten.open",
            arguments: [artifact]
        };
    }

    async getChildren(): Promise<ArtefactNode[]> {
        //TODO simplify
        let childrenIds = this.artifact && this.artifact.meta && this.artifact.meta.manifest && this.artifact.meta.manifest.entries ?
            this.artifact.meta.manifest.entries
                .map(e => e.artifactReference ?
                    [e.artifactReference.id] :
                    e.artifactReferenceGroup)
                .flatMap(a => a) :
            [];

        let childrenArts = await Promise.all(childrenIds.map(x => this.k10Client.getArtifactById(x)));
        return childrenArts.map(x => new ArtefactNode(this.k10Client, x));

    };

    getLabel(): string {
        return "";
    }

    getType(): string {
        return this.artifact.meta.type;
    }
}


export class PolicyNode extends Node {
    getChildren(): Promise<Node[]> {
        throw new Error('Method not implemented.');
    }
    getLabel(): string {
        throw new Error('Method not implemented.');
    }
    getType(): string {
        throw new Error('Method not implemented.');
    }

}