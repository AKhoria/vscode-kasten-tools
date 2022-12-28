export interface PolicyMetadata {
    creationTimestamp: Date;
    generation: number;
    name: string;
    namespace: string;
    resourceVersion: string;
    uid: string;
}

export interface Policy {
    apiVersion: string;
    kind: string;
    metadata: PolicyMetadata;
}