import EventEmitter from 'eventemitter3';
import { VectorClock } from './VectorClock';
import {
  CollaborationConfig,
  CollaborationEvent,
  MessageType,
  PeerMessage,
  StateConflict,
  ConflictResolution,
  ConflictResolutionStrategy,
  Peer
} from './types';

/**
 * CollaborationEngine handles state synchronization and conflict resolution
 * 
 * Integrates with PeerPigeon mesh to automatically track both direct and indirect peers.
 * When a mesh instance is provided, the engine will discover and track all peers in the
 * network via PeerPigeon's gossip protocol.
 */
export class CollaborationEngine extends EventEmitter {
  private config: Required<CollaborationConfig>;
  private localClock: VectorClock;
  private peerClocks: Map<string, VectorClock>;
  private localState: any;
  private peerStates: Map<string, any>;
  private peers: Map<string, Peer>;
  private syncTimer?: number;
  private messageHandlers: Map<MessageType, (message: PeerMessage) => void>;
  private mesh?: any; // PeerPigeonMesh instance

  constructor(config: CollaborationConfig) {
    super();
    this.config = {
      peerId: config.peerId,
      namespace: config.namespace || 'default',
      conflictResolution: config.conflictResolution || ConflictResolutionStrategy.VECTOR_CLOCK,
      syncInterval: config.syncInterval || 5000,
      mesh: config.mesh
    };

    this.localClock = new VectorClock();
    this.peerClocks = new Map();
    this.localState = {};
    this.peerStates = new Map();
    this.peers = new Map();
    this.messageHandlers = new Map();
    this.mesh = config.mesh;

    this.setupMessageHandlers();
    this.startSyncTimer();

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
      if (peerId !== this.config.peerId && !this.peers.has(peerId)) {
        this.addPeer({
          id: peerId,
          metadata: {},
          joinedAt: Date.now()
        });
      }
    });

    // Track directly connected peers
    this.mesh.on('peerConnected', ({ peerId }: { peerId: string }) => {
      if (peerId !== this.config.peerId && !this.peers.has(peerId)) {
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

    // Handle incoming messages from mesh
    this.mesh.on('messageReceived', ({ content }: { from: string; content: any }) => {
      // Check if message is for this collaboration engine
      if (content && content._pigeonmatch && content.namespace === this.config.namespace) {
        this.handleMessage(content as PeerMessage);
      }
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
        if (peerId !== this.config.peerId && !this.peers.has(peerId)) {
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
        if (peerId !== this.config.peerId && !this.peers.has(peerId)) {
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
   * Set up message handlers for different message types
   */
  private setupMessageHandlers(): void {
    this.messageHandlers.set(MessageType.STATE_UPDATE, this.handleStateUpdate.bind(this));
    this.messageHandlers.set(MessageType.STATE_REQUEST, this.handleStateRequest.bind(this));
    this.messageHandlers.set(MessageType.STATE_RESPONSE, this.handleStateResponse.bind(this));
    this.messageHandlers.set(MessageType.VECTOR_CLOCK_SYNC, this.handleVectorClockSync.bind(this));
    this.messageHandlers.set(MessageType.PEER_HEARTBEAT, this.handlePeerHeartbeat.bind(this));
  }

  /**
   * Start the sync timer
   */
  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      this.syncWithPeers();
    }, this.config.syncInterval) as unknown as number;
  }

  /**
   * Stop the sync timer
   */
  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Update local state and broadcast to peers
   */
  updateState(state: any): void {
    // Increment local clock
    this.localClock.increment(this.config.peerId);

    // Update local state
    this.localState = { ...this.localState, ...state };

    // Broadcast update to all peers
    const message: PeerMessage = {
      type: MessageType.STATE_UPDATE,
      from: this.config.peerId,
      payload: this.localState,
      vectorClock: this.localClock.toJSON(),
      timestamp: Date.now()
    };

    this.broadcastMessage(message);
    this.emit(CollaborationEvent.STATE_UPDATED, {
      peerId: this.config.peerId,
      state: this.localState,
      vectorClock: this.localClock
    });
  }

  /**
   * Get the current local state
   */
  getState(): any {
    return { ...this.localState };
  }

  /**
   * Get state for a specific peer
   */
  getPeerState(peerId: string): any | undefined {
    return this.peerStates.get(peerId);
  }

  /**
   * Get all peer states
   */
  getAllPeerStates(): Map<string, any> {
    return new Map(this.peerStates);
  }

  /**
   * Handle incoming message from a peer
   */
  handleMessage(message: PeerMessage): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }
  }

  /**
   * Handle state update from a peer
   */
  private handleStateUpdate(message: PeerMessage): void {
    const peerClock = VectorClock.fromJSON(message.vectorClock);
    const existingClock = this.peerClocks.get(message.from);

    // Update peer's vector clock
    this.peerClocks.set(message.from, peerClock);

    // Merge with local clock
    this.localClock.merge(peerClock);

    // Check for conflicts
    if (existingClock && this.hasConflict(existingClock, peerClock)) {
      const conflict: StateConflict = {
        states: [
          {
            peerId: message.from,
            state: message.payload,
            vectorClock: peerClock
          },
          {
            peerId: this.config.peerId,
            state: this.localState,
            vectorClock: this.localClock
          }
        ],
        detectedAt: Date.now()
      };

      this.emit(CollaborationEvent.CONFLICT_DETECTED, conflict);
      this.resolveConflict(conflict);
    } else {
      // No conflict, update peer state
      this.peerStates.set(message.from, message.payload);
    }

    this.emit(CollaborationEvent.STATE_UPDATED, {
      peerId: message.from,
      state: message.payload,
      vectorClock: peerClock
    });
  }

  /**
   * Handle state request from a peer
   */
  private handleStateRequest(message: PeerMessage): void {
    const response: PeerMessage = {
      type: MessageType.STATE_RESPONSE,
      from: this.config.peerId,
      to: message.from,
      payload: this.localState,
      vectorClock: this.localClock.toJSON(),
      timestamp: Date.now()
    };

    this.sendMessage(response);
  }

  /**
   * Handle state response from a peer
   */
  private handleStateResponse(message: PeerMessage): void {
    this.handleStateUpdate(message);
  }

  /**
   * Handle vector clock sync from a peer
   */
  private handleVectorClockSync(message: PeerMessage): void {
    const peerClock = VectorClock.fromJSON(message.vectorClock);
    this.localClock.merge(peerClock);
    this.peerClocks.set(message.from, peerClock);
  }

  /**
   * Handle heartbeat from a peer
   */
  private handlePeerHeartbeat(message: PeerMessage): void {
    // Update peer's last seen time in local tracking
    const peer = this.peers.get(message.from);
    if (peer && peer.metadata) {
      peer.metadata.lastSeen = Date.now();
    }
  }

  /**
   * Check if there's a conflict between two vector clocks
   */
  private hasConflict(clock1: VectorClock, clock2: VectorClock): boolean {
    return clock1.isConcurrent(clock2);
  }

  /**
   * Resolve a state conflict
   */
  private resolveConflict(conflict: StateConflict): void {
    let resolution: ConflictResolution;

    switch (this.config.conflictResolution) {
      case ConflictResolutionStrategy.VECTOR_CLOCK:
        resolution = this.resolveByVectorClock(conflict);
        break;
      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        resolution = this.resolveByLastWrite(conflict);
        break;
      default:
        resolution = this.resolveByVectorClock(conflict);
    }

    this.emit(CollaborationEvent.CONFLICT_RESOLVED, resolution);

    // Update local state with resolved state
    this.localState = resolution.resolvedState;
    this.localClock = resolution.vectorClock;
  }

  /**
   * Resolve conflict using vector clock ordering
   */
  private resolveByVectorClock(conflict: StateConflict): ConflictResolution {
    // Find the state with the most advanced vector clock
    let winningState = conflict.states[0];

    for (let i = 1; i < conflict.states.length; i++) {
      const current = conflict.states[i];
      if (current.vectorClock.happensAfter(winningState.vectorClock)) {
        winningState = current;
      }
    }

    return {
      resolvedState: winningState.state,
      vectorClock: winningState.vectorClock.clone(),
      strategy: ConflictResolutionStrategy.VECTOR_CLOCK,
      resolvedAt: Date.now()
    };
  }

  /**
   * Resolve conflict using last write wins strategy
   */
  private resolveByLastWrite(conflict: StateConflict): ConflictResolution {
    // Use the state with the highest timestamp across all peers
    let winningState = conflict.states[0];
    let maxTimestamp = 0;

    for (const state of conflict.states) {
      const peerIds = state.vectorClock.getPeerIds();
      for (const peerId of peerIds) {
        const timestamp = state.vectorClock.get(peerId);
        if (timestamp > maxTimestamp) {
          maxTimestamp = timestamp;
          winningState = state;
        }
      }
    }

    return {
      resolvedState: winningState.state,
      vectorClock: winningState.vectorClock.clone(),
      strategy: ConflictResolutionStrategy.LAST_WRITE_WINS,
      resolvedAt: Date.now()
    };
  }

  /**
   * Sync state with all peers
   */
  private syncWithPeers(): void {
    this.emit(CollaborationEvent.SYNC_REQUESTED);

    const message: PeerMessage = {
      type: MessageType.VECTOR_CLOCK_SYNC,
      from: this.config.peerId,
      payload: null,
      vectorClock: this.localClock.toJSON(),
      timestamp: Date.now()
    };

    this.broadcastMessage(message);
    this.emit(CollaborationEvent.SYNC_COMPLETED);
  }

  /**
   * Broadcast a message to all peers
   */
  private broadcastMessage(message: PeerMessage): void {
    for (const peerId of this.peers.keys()) {
      if (peerId !== this.config.peerId) {
        const targetMessage = { ...message, to: peerId };
        this.sendMessage(targetMessage);
      }
    }
  }

  /**
   * Send a message to a specific peer
   * Uses PeerPigeon mesh if available, otherwise emits event for manual handling
   */
  private sendMessage(message: PeerMessage): void {
    // Mark message as coming from PigeonMatch for identification
    const pigeonmatchMessage = {
      ...message,
      _pigeonmatch: true,
      namespace: this.config.namespace
    };

    if (this.mesh) {
      // Use PeerPigeon mesh to send message
      if (message.to) {
        // Send to specific peer
        this.mesh.sendDirectMessage(message.to, pigeonmatchMessage);
      } else {
        // Broadcast to all peers
        this.mesh.sendMessage(pigeonmatchMessage);
      }
    } else {
      // Emit event for manual handling when mesh is not available
      this.emit('message:send', pigeonmatchMessage);
    }
  }

  /**
   * Add a peer to the collaboration
   */
  addPeer(peer: Peer): void {
    this.peers.set(peer.id, peer);
    if (peer.vectorClock) {
      this.peerClocks.set(peer.id, peer.vectorClock);
    }
  }

  /**
   * Remove a peer from the collaboration
   */
  removePeer(peerId: string): void {
    this.peers.delete(peerId);
    this.peerClocks.delete(peerId);
    this.peerStates.delete(peerId);
  }

  /**
   * Get the local vector clock
   */
  getVectorClock(): VectorClock {
    return this.localClock.clone();
  }

  /**
   * Get the vector clock for a specific peer
   */
  getPeerVectorClock(peerId: string): VectorClock | undefined {
    return this.peerClocks.get(peerId)?.clone();
  }

  /**
   * Destroy the collaboration engine
   */
  destroy(): void {
    this.stopSyncTimer();
    this.removeAllListeners();
    this.peerClocks.clear();
    this.peerStates.clear();
    this.peers.clear();
  }
}
