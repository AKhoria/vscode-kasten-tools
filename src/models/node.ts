import { mainModule } from "process";
import * as vscode from "vscode";
import { Artifact } from "./artifact";
import { Policy } from "./policy";
import { K10Client } from "../clients/k10RestClient";
import { KASTEN_NS } from "../const";
import path = require("path");

export abstract class Node extends vscode.TreeItem {
  raw: any;

  children: Node[] | undefined;

  abstract getChildren(): Promise<Node[]> | Node[];

  abstract getLabel(): string;

  abstract getType(): string;

  getIcon(): { light: string | vscode.Uri; dark: string | vscode.Uri } {
    switch (this.getType()) {
      case "Snapshot":
        return {
          light: assetUri("images/snapshot.svg"),
          dark: assetUri("images/snapshot.svg"),
        };
      case "Spec":
        return {
          light: assetUri("images/spec.svg"),
          dark: assetUri("images/spec-w.svg"),
        };
      case "Kanister":
        return {
          light: assetUri("images/logo-kanister.svg"),
          dark: assetUri("images/logo-kanister-color.svg"),
        };
      case "Volume":
        return {
          light: assetUri("images/volume.svg"),
          dark: assetUri("images/volume.svg"),
        };
      case "Manifest":
        return {
          light: assetUri("images/manifest.svg"),
          dark: assetUri("images/manifest-w.svg"),
        };
      case "Root policy":
        return {
          light: assetUri("images/policy.svg"),
          dark: assetUri("images/policy-w.svg"),
        };
      case "DataService":
        return {
          light: assetUri("images/data.svg"),
          dark: assetUri("images/data-w.svg"),
        };
      case "EncryptionKey":
        return {
          light: assetUri("images/key.svg"),
          dark: assetUri("images/key-w.svg"),
        };
      case "Repository":
        return {
          light: assetUri("images/repository.svg"),
          dark: assetUri("images/repository-w.svg"),
        };
      case "LinkedVbrServer":
        return {
          light: assetUri("images/server.svg"),
          dark: assetUri("images/server-w.svg"),
        };
      default:
        return {
          light: assetUri("images/policy.svg"),
          dark: assetUri("images/policy-w.svg"),
        };
    }
  }
}

export class ArtifactNode extends Node {
  raw: any;
  constructor(private k10Client: K10Client, private artifact: Artifact) {
    super(
      artifact.id,
      (artifact?.meta?.manifest?.entries?.length ?? 0) === 0
        ? vscode.TreeItemCollapsibleState.None
        : vscode.TreeItemCollapsibleState.Collapsed
    );
    this.command = {
      title: "Open",
      command: "kasten.open",
      arguments: [[artifact]],
    };
    this.contextValue = `kasten.view.policy-${this.getType()}`;
  }

  async getChildren(): Promise<Node[]> {
    //TODO simplify
    let childrenIds =
      this.artifact?.meta?.manifest?.entries
        ?.map((e) =>
          e.artifactReference
            ? [e.artifactReference.id]
            : e.artifactReferenceGroup
        )
        ?.flatMap((a) => a) ?? []
      ;

    let childrenArts = await Promise.all(
      childrenIds.map((x) => this.k10Client.getArtifactById(x))
    );
    let result = childrenArts.map((x) =>
      x ? new ArtifactNode(this.k10Client, x) : new DeletedNode()
    );

    let jobID = this.artifact?.meta?.manifest?.jobID;
    if (jobID) {
      let job = await this.k10Client.getJob(jobID);
      if (job) {
        result.push(new JobNode(job));
      }
    }

    return result;
  }

  getLabel(): string {
    return `${this.artifact?.meta?.type} ${this.artifact?.id}`;
  }

  getType(): string {
    return this.artifact.meta.type;
  }
}

export class PolicyNode extends Node {
  constructor(private k10Client: K10Client, private policy: Policy) {
    super(policy.metadata.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.command = {
      title: "Open",
      command: "kasten.open",
      arguments: [[policy]],
    };
  }

  async getChildren(): Promise<Node[]> {
    let arts = await this.k10Client.listArtifacts(
      "manifest-policy",
      `${KASTEN_NS}-${this.policy.metadata.name}`
    );
    return arts.map((x) => new ArtifactNode(this.k10Client, x));
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

export class JobNode extends Node {
  constructor(private obj: any) {
    super(obj.id, vscode.TreeItemCollapsibleState.None);
    this.command = {
      title: "Open",
      command: "kasten.open",
      arguments: [[obj]],
    };
    this.contextValue = "kasten.view.job";
  }
  getChildren(): Node[] | Promise<Node[]> {
    return [];
  }
  getLabel(): string {
    return `Job ${this.obj.id}`;
  }
  getType(): string {
    return "Job";
  }
}

let EXTENSION_CONTEXT: vscode.ExtensionContext | null = null;

export function setAssetContext(context: vscode.ExtensionContext) {
  EXTENSION_CONTEXT = context;
}

export function assetPath(relativePath: string): string {
  if (EXTENSION_CONTEXT) {
    // which it always should be
    return EXTENSION_CONTEXT.asAbsolutePath(relativePath);
  }
  const absolutePath = path.join(__dirname, "..", "..", relativePath);
  return absolutePath;
}

export function assetUri(relativePath: string): vscode.Uri {
  return vscode.Uri.file(assetPath(relativePath));
}