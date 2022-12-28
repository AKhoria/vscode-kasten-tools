export interface Service {
    apiVersion: string
    kind: string
    metadata: Metadata
    spec: Spec
    status: Status
}

export interface Metadata {
    name: string
    namespace: string
}

export interface Spec {
    clusterIP: string
    clusterIPs: string[]
    internalTrafficPolicy: string
    ipFamilies: string[]
    ipFamilyPolicy: string
    ports: Port[]
}

export interface Port {
    name: string
    port: number
    protocol: string
    targetPort: number
}

export interface Status {
    loadBalancer: LoadBalancer
}

export interface LoadBalancer { }
