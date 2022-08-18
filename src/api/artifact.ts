
export interface Label {
    key: string;
    value: string;
}

export interface ApiMeta {
    annotations?: any;
    labels: Label[];
}

export interface ArtifactReference {
    id: string;
}

export interface Entry {
    artifactReferenceGroup: string[];
    type: string;
    artifactReference: ArtifactReference;
}

export interface Error {
    message: string;
}

export interface Cause {
    errors: Error[];
    message: string;
}

export interface Exception {
    cause: Cause;
    fields: any[];
    message: string;
}

export interface OriginatingPolicy {
    id: string;
}

export interface Filters {
}

export interface Profile {
    name: string;
    namespace: string;
}

export interface BackupParameters {
    filters: Filters;
    profile: Profile;
}

export interface Action {
    backupParameters: BackupParameters;
}

export interface Parameters {
    action: Action;
}

export interface Statistics {
    processedBytes: number;
    readBytes: number;
    transferredBytes: number;
}

export interface Results {
    applicationsCount: number;
    statistics: Statistics;
}

export interface Namespace {
    name: string;
}

export interface App {
    namespace: Namespace;
    type: string;
}

export interface Subject {
    Type: string;
    app: App;
}

export interface Manifest {
    action: string;
    apiKeys: string[];
    apiMeta: ApiMeta;
    endTime: Date;
    entries: Entry[];
    exceptions: Exception[];
    jobID: string;
    originatingPolicies: OriginatingPolicy[];
    parameters: Parameters;
    progress: number;
    results: Results;
    scheduledTime: Date;
    status: string;
    subject: Subject;
}

export interface Meta {
    manifest: Manifest;
    type: string;
}

export interface Artifact {
    creationTime: Date;
    destructionTime: Date;
    id: string;
    meta: Meta;
    resourceVersion: number;
}



