import * as vscode from 'vscode';
import { Artifact } from '../api/artifact';
import { Policy } from '../api/policy';
import { K10Client } from '../api/restclient';
import { KASTEN_NS } from '../const';

export abstract class Node extends vscode.TreeItem {
    raw: any;

    children: Node[] | undefined;

    abstract getChildren(): Promise<Node[]> | Node[];

    abstract getLabel(): string;

    abstract getType(): string;

    abstract getIcon(): string;
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

    async getChildren(): Promise<Node[]> {
        //TODO simplify
        let childrenIds = this.artifact && this.artifact.meta && this.artifact.meta.manifest && this.artifact.meta.manifest.entries ?
            this.artifact.meta.manifest.entries
                .map(e => e.artifactReference ?
                    [e.artifactReference.id] :
                    e.artifactReferenceGroup)
                .flatMap(a => a) :
            [];

        let childrenArts = await Promise.all(childrenIds.map(x => this.k10Client.getArtifactById(x)));
        return childrenArts.map(x => x ? new ArtefactNode(this.k10Client, x) : new DeletedNode());

    };

    getLabel(): string {
        return `${this.artifact?.meta?.type} ${this.artifact?.id}`;
    }

    getType(): string {
        return this.artifact.meta.type;
    }

    getIcon(): string {
        return this.artifact.meta.type;
    }
}


export class PolicyNode extends Node {

    constructor(private k10Client: K10Client, private policy: Policy) {
        super(policy.metadata.name, vscode.TreeItemCollapsibleState.Collapsed);
        this.command = {
            title: "Open",
            command: "kasten.open",
            arguments: [policy]
        };
    }
    getIcon(): string {
        throw new Error('Method not implemented.');
    }

    async getChildren(): Promise<Node[]> {
        let arts = await this.k10Client.listArtifacts("manifest-policy", `${KASTEN_NS}-${this.policy.metadata.name}`);
        return arts.map(x => new ArtefactNode(this.k10Client, x));
    }
    getLabel(): string {
        return this.policy.metadata.name;
    }
    getType(): string {
        return "policy";
    }

}

export class LogicNode extends Node {
    constructor(label: string, children: Node[]) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.children = children;
    }
    getChildren(): Node[] {
        return this.children ?? [];
    }
    getLabel(): string {
        return this.label?.toString() ?? "Undefined object";
    }
    getType(): string {
        return "Root policy";
    }

}

export class DeletedNode extends Node {
    constructor() {
        super("Node deleted or not found", vscode.TreeItemCollapsibleState.None);
    }
    getChildren(): Node[] | Promise<Node[]> {
        return [];
    }
    getLabel(): string {
        return this.label?.toString() ?? "";
    }
    getType(): string {
        return "Deleted";
    }

}

