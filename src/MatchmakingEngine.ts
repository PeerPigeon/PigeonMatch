import EventEmitter from 'eventemitter3';
import { VectorClock } from './VectorClock';
import {
  MatchmakingConfig,
  MatchmakingEvent,
  Peer,
  MatchGroup
} from './types';

/**
 * MatchmakingEngine handles peer matching and group formation
 * 
 * Integrates with PeerPigeon mesh to automatically track both direct and indirect peers.
 * When a mesh instance is provided, the engine will discover and track all peers in the
 * network via PeerPigeon's gossip protocol.
 */
export class MatchmakingEngine extends EventEmitter {
  private config: Required<MatchmakingConfig>;
  private peers: Map<string, Peer>;
  private matches: Map<string, MatchGroup>;
  private matchQueue: Peer[];
  private matchCounter: number;
  private mesh?: any; // PeerPigeonMesh instance

  constructor(config: MatchmakingConfig) {
    super();
    this.config = {
      minPeers: config.minPeers,
      maxPeers: config.maxPeers,
      matchTimeout: config.matchTimeout || 30000,
      namespace: config.namespace || 'default',
      matchCriteria: config.matchCriteria || {},
      mesh: config.mesh
    };

    this.peers = new Map();
    this.matches = new Map();
    this.matchQueue = [];
    this.matchCounter = 0;
    this.mesh = config.mesh;

    // If mesh is provided, set up automatic peer discovery
    if (this.mesh) {
      this.setupMeshIntegration();
    }
  }

  /**
   * Set up integration with PeerPigeon mesh for automatic peer tracking
   */
  private setupMeshIntegration(): void {
    if (!this.mesh) return;

    // Track discovered peers (including indirect peers via gossip)
    this.mesh.on('peerDiscovered', ({ peerId }: { peerId: string }) => {
      if (!this.peers.has(peerId)) {
        this.addPeer({
          id: peerId,
          metadata: {},
          joinedAt: Date.now()
        });
      }
    });

    // Track directly connected peers
    this.mesh.on('peerConnected', ({ peerId }: { peerId: string }) => {
      if (!this.peers.has(peerId)) {
        this.addPeer({
          id: peerId,
          metadata: {},
          joinedAt: Date.now()
        });
      }
    });

    // Handle peer disconnection
    this.mesh.on('peerDisconnected', ({ peerId }: { peerId: string }) => {
      this.removePeer(peerId);
    });

    // Sync existing peers if mesh is already connected
    this.syncMeshPeers();
  }

  /**
   * Sync all existing peers from the mesh
   */
  private syncMeshPeers(): void {
    if (!this.mesh) return;

    try {
      // Get all discovered peers (includes indirect peers)
      const discoveredPeers = this.mesh.getDiscoveredPeers?.() || [];
      for (const peerId of discoveredPeers) {
        if (!this.peers.has(peerId)) {
          this.addPeer({
            id: peerId,
            metadata: {},
            joinedAt: Date.now()
          });
        }
      }

      // Also get directly connected peers
      const connectedPeers = this.mesh.getPeers?.() || [];
      for (const peerId of connectedPeers) {
        if (!this.peers.has(peerId)) {
          this.addPeer({
            id: peerId,
            metadata: {},
            joinedAt: Date.now()
          });
        }
      }
    } catch (error) {
      // Silently handle if methods don't exist
      console.warn('Failed to sync mesh peers:', error);
    }
  }

  /**
   * Add a peer to the matchmaking pool
   */
  addPeer(peer: Peer): void {
    // Initialize vector clock if not present
    if (!peer.vectorClock) {
      peer.vectorClock = new VectorClock();
    }
    
    // Set join timestamp
    if (!peer.joinedAt) {
      peer.joinedAt = Date.now();
    }

    // Increment the peer's own clock
    peer.vectorClock.increment(peer.id);

    this.peers.set(peer.id, peer);
    this.matchQueue.push(peer);

    this.emit(MatchmakingEvent.PEER_JOINED, peer);

    // Try to create a match
    this.tryCreateMatch();
  }

  /**
   * Remove a peer from the matchmaking pool
   */
  removePeer(peerId: string): boolean {
    const peer = this.peers.get(peerId);
    if (!peer) {
      return false;
    }

    this.peers.delete(peerId);
    
    // Remove from queue
    const queueIndex = this.matchQueue.findIndex(p => p.id === peerId);
    if (queueIndex !== -1) {
      this.matchQueue.splice(queueIndex, 1);
    }

    // Remove from any active matches
    for (const [matchId, match] of this.matches.entries()) {
      const peerIndex = match.peers.findIndex(p => p.id === peerId);
      if (peerIndex !== -1) {
        match.peers.splice(peerIndex, 1);
        if (match.peers.length < this.config.minPeers) {
          this.disbandMatch(matchId);
        }
      }
    }

    this.emit(MatchmakingEvent.PEER_LEFT, peer);
    return true;
  }

  /**
   * Get a peer by ID
   */
  getPeer(peerId: string): Peer | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Get all peers
   */
  getAllPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get all active matches
   */
  getAllMatches(): MatchGroup[] {
    return Array.from(this.matches.values());
  }

  /**
   * Get a match by ID
   */
  getMatch(matchId: string): MatchGroup | undefined {
    return this.matches.get(matchId);
  }

  /**
   * Try to create a match from queued peers
   */
  private tryCreateMatch(): void {
    if (this.matchQueue.length < this.config.minPeers) {
      return;
    }

    // Take up to maxPeers from the queue
    const peersForMatch = this.matchQueue.splice(0, this.config.maxPeers);

    // Apply custom matching criteria if defined
    const matchedPeers = this.applyMatchCriteria(peersForMatch);

    if (matchedPeers.length >= this.config.minPeers) {
      const match = this.createMatch(matchedPeers);
      this.emit(MatchmakingEvent.MATCH_FOUND, match);
      this.emit(MatchmakingEvent.MATCH_READY, match);
    } else {
      // Put peers back in queue if match criteria not met
      this.matchQueue.unshift(...matchedPeers);
      this.emit(MatchmakingEvent.MATCH_FAILED, {
        reason: 'Insufficient peers meeting criteria',
        peersRequired: this.config.minPeers,
        peersAvailable: matchedPeers.length
      });
    }
  }

  /**
   * Apply custom matching criteria to filter peers
   */
  private applyMatchCriteria(peers: Peer[]): Peer[] {
    if (Object.keys(this.config.matchCriteria).length === 0) {
      return peers;
    }

    return peers.filter(peer => {
      if (!peer.metadata) {
        return false;
      }

      for (const [key, value] of Object.entries(this.config.matchCriteria)) {
        if (peer.metadata[key] !== value) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Create a new match group
   */
  private createMatch(peers: Peer[]): MatchGroup {
    this.matchCounter++;
    const matchId = `match-${this.config.namespace}-${this.matchCounter}`;

    const match: MatchGroup = {
      id: matchId,
      peers: peers,
      createdAt: Date.now(),
      namespace: this.config.namespace,
      metadata: {}
    };

    this.matches.set(matchId, match);
    return match;
  }

  /**
   * Disband a match and return peers to queue
   */
  disbandMatch(matchId: string): boolean {
    const match = this.matches.get(matchId);
    if (!match) {
      return false;
    }

    // Return peers to queue
    for (const peer of match.peers) {
      if (this.peers.has(peer.id)) {
        this.matchQueue.push(peer);
      }
    }

    this.matches.delete(matchId);
    this.emit(MatchmakingEvent.MATCH_DISBANDED, match);
    return true;
  }

  /**
   * Get the current namespace
   */
  getNamespace(): string {
    return this.config.namespace;
  }

  /**
   * Get matchmaking statistics
   */
  getStats(): {
    totalPeers: number;
    queuedPeers: number;
    activeMatches: number;
    namespace: string;
  } {
    return {
      totalPeers: this.peers.size,
      queuedPeers: this.matchQueue.length,
      activeMatches: this.matches.size,
      namespace: this.config.namespace
    };
  }

  /**
   * Clear all peers and matches
   */
  clear(): void {
    this.peers.clear();
    this.matches.clear();
    this.matchQueue = [];
  }
}
