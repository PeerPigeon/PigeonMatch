/**
 * NetworkNamespace provides isolated networking contexts for peer groups
 * Allows multiple independent peer networks to coexist without interference
 */
export class NetworkNamespace {
  private namespace: string;
  private peers: Map<string, any>;
  private metadata: Map<string, any>;

  constructor(namespace: string) {
    this.namespace = namespace;
    this.peers = new Map();
    this.metadata = new Map();
  }

  /**
   * Get the namespace identifier
   */
  getNamespace(): string {
    return this.namespace;
  }

  /**
   * Add a peer to this namespace
   */
  addPeer(peerId: string, peer: any): void {
    this.peers.set(peerId, peer);
  }

  /**
   * Remove a peer from this namespace
   */
  removePeer(peerId: string): boolean {
    return this.peers.delete(peerId);
  }

  /**
   * Get a peer by ID
   */
  getPeer(peerId: string): any | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Check if a peer exists in this namespace
   */
  hasPeer(peerId: string): boolean {
    return this.peers.has(peerId);
  }

  /**
   * Get all peer IDs in this namespace
   */
  getPeerIds(): string[] {
    return Array.from(this.peers.keys());
  }

  /**
   * Get all peers in this namespace
   */
  getPeers(): Map<string, any> {
    return new Map(this.peers);
  }

  /**
   * Get the number of peers in this namespace
   */
  getPeerCount(): number {
    return this.peers.size;
  }

  /**
   * Set metadata for this namespace
   */
  setMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }

  /**
   * Get metadata from this namespace
   */
  getMetadata(key: string): any | undefined {
    return this.metadata.get(key);
  }

  /**
   * Remove metadata from this namespace
   */
  removeMetadata(key: string): boolean {
    return this.metadata.delete(key);
  }

  /**
   * Clear all peers from this namespace
   */
  clear(): void {
    this.peers.clear();
    this.metadata.clear();
  }

  /**
   * Convert namespace to JSON for serialization
   */
  toJSON(): any {
    return {
      namespace: this.namespace,
      peers: Array.from(this.peers.keys()),
      metadata: Object.fromEntries(this.metadata),
      peerCount: this.peers.size
    };
  }
}

/**
 * NamespaceManager manages multiple network namespaces
 */
export class NamespaceManager {
  private namespaces: Map<string, NetworkNamespace>;

  constructor() {
    this.namespaces = new Map();
  }

  /**
   * Create or get a namespace
   */
  getOrCreateNamespace(namespace: string): NetworkNamespace {
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new NetworkNamespace(namespace));
    }
    return this.namespaces.get(namespace)!;
  }

  /**
   * Get a namespace by name
   */
  getNamespace(namespace: string): NetworkNamespace | undefined {
    return this.namespaces.get(namespace);
  }

  /**
   * Check if a namespace exists
   */
  hasNamespace(namespace: string): boolean {
    return this.namespaces.has(namespace);
  }

  /**
   * Remove a namespace
   */
  removeNamespace(namespace: string): boolean {
    return this.namespaces.delete(namespace);
  }

  /**
   * Get all namespace names
   */
  getNamespaceNames(): string[] {
    return Array.from(this.namespaces.keys());
  }

  /**
   * Get all namespaces
   */
  getAllNamespaces(): Map<string, NetworkNamespace> {
    return new Map(this.namespaces);
  }

  /**
   * Clear all namespaces
   */
  clear(): void {
    this.namespaces.clear();
  }
}
