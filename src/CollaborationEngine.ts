import EventEmitter from 'eventemitter3';
import { VectorClock } from './VectorClock';
import { NetworkNamespace, NamespaceManager } from './NetworkNamespace';
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
 */
export class CollaborationEngine extends EventEmitter {
  private config: Required<CollaborationConfig>;
  private localClock: VectorClock;
  private peerClocks: Map<string, VectorClock>;
  private localState: any;
  private peerStates: Map<string, any>;
  private namespaceManager: NamespaceManager;
  private namespace: NetworkNamespace;
  private syncTimer?: number;
  private messageHandlers: Map<MessageType, (message: PeerMessage) => void>;

  constructor(config: CollaborationConfig) {
    super();
    this.config = {
      peerId: config.peerId,
      namespace: config.namespace || 'default',
      conflictResolution: config.conflictResolution || ConflictResolutionStrategy.VECTOR_CLOCK,
      syncInterval: config.syncInterval || 5000
    };

    this.localClock = new VectorClock();
    this.peerClocks = new Map();
    this.localState = {};
    this.peerStates = new Map();
    this.namespaceManager = new NamespaceManager();
    this.namespace = this.namespaceManager.getOrCreateNamespace(this.config.namespace);
    this.messageHandlers = new Map();

    this.setupMessageHandlers();
    this.startSyncTimer();
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
    // Update peer's last seen time
    this.namespace.setMetadata(`${message.from}:lastSeen`, Date.now());
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
    const peerIds = this.namespace.getPeerIds();
    for (const peerId of peerIds) {
      if (peerId !== this.config.peerId) {
        const targetMessage = { ...message, to: peerId };
        this.sendMessage(targetMessage);
      }
    }
  }

  /**
   * Send a message to a specific peer
   * This is a placeholder - actual implementation depends on peerpigeon integration
   */
  private sendMessage(message: PeerMessage): void {
    // In a real implementation, this would use peerpigeon to send the message
    // For now, we emit an event that can be handled by the integrating application
    this.emit('message:send', message);
  }

  /**
   * Add a peer to the collaboration namespace
   */
  addPeer(peer: Peer): void {
    this.namespace.addPeer(peer.id, peer);
    if (peer.vectorClock) {
      this.peerClocks.set(peer.id, peer.vectorClock);
    }
  }

  /**
   * Remove a peer from the collaboration namespace
   */
  removePeer(peerId: string): void {
    this.namespace.removePeer(peerId);
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
    this.namespace.clear();
  }
}
