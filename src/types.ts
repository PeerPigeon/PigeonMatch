import { VectorClock } from './VectorClock';

/**
 * Configuration options for the matchmaking engine
 */
export interface MatchmakingConfig {
  /** Minimum number of peers required for a match */
  minPeers: number;
  /** Maximum number of peers allowed in a match */
  maxPeers: number;
  /** Timeout in milliseconds for matchmaking */
  matchTimeout?: number;
  /** Network namespace for this matchmaking session */
  namespace?: string;
  /** Custom matching criteria */
  matchCriteria?: MatchCriteria;
  /** PeerPigeon mesh instance for automatic peer discovery */
  mesh?: any; // PeerPigeonMesh instance
}

/**
 * Custom matching criteria for peer selection
 */
export interface MatchCriteria {
  /** Custom properties to match on */
  [key: string]: any;
}

/**
 * Represents a peer in the system
 */
export interface Peer {
  /** Unique identifier for the peer */
  id: string;
  /** Peer metadata */
  metadata?: Record<string, any>;
  /** Peer connection object (from peerpigeon) */
  connection?: any;
  /** Vector clock for this peer */
  vectorClock?: VectorClock;
  /** Timestamp when peer joined */
  joinedAt?: number;
}

/**
 * Represents a match group of peers
 */
export interface MatchGroup {
  /** Unique identifier for the match */
  id: string;
  /** Peers in this match */
  peers: Peer[];
  /** Timestamp when match was created */
  createdAt: number;
  /** Network namespace for this match */
  namespace: string;
  /** Match metadata */
  metadata?: Record<string, any>;
}

/**
 * Events emitted by the matchmaking engine
 */
export enum MatchmakingEvent {
  PEER_JOINED = 'peer:joined',
  PEER_LEFT = 'peer:left',
  MATCH_FOUND = 'match:found',
  MATCH_FAILED = 'match:failed',
  MATCH_READY = 'match:ready',
  MATCH_DISBANDED = 'match:disbanded'
}

/**
 * Events emitted by the collaboration engine
 */
export enum CollaborationEvent {
  STATE_UPDATED = 'state:updated',
  CONFLICT_DETECTED = 'conflict:detected',
  CONFLICT_RESOLVED = 'conflict:resolved',
  SYNC_REQUESTED = 'sync:requested',
  SYNC_COMPLETED = 'sync:completed'
}

/**
 * Message types for peer communication
 */
export enum MessageType {
  STATE_UPDATE = 'state:update',
  STATE_REQUEST = 'state:request',
  STATE_RESPONSE = 'state:response',
  VECTOR_CLOCK_SYNC = 'vector:sync',
  PEER_HEARTBEAT = 'peer:heartbeat'
}

/**
 * Represents a message exchanged between peers
 */
export interface PeerMessage {
  /** Type of message */
  type: MessageType;
  /** Sender peer ID */
  from: string;
  /** Recipient peer ID (undefined for broadcast) */
  to?: string;
  /** Message payload */
  payload: any;
  /** Vector clock at time of sending */
  vectorClock: Record<string, number>;
  /** Timestamp when message was created */
  timestamp: number;
}

/**
 * Configuration for collaboration engine
 */
export interface CollaborationConfig {
  /** Local peer ID */
  peerId: string;
  /** Network namespace */
  namespace?: string;
  /** Conflict resolution strategy */
  conflictResolution?: ConflictResolutionStrategy;
  /** Sync interval in milliseconds */
  syncInterval?: number;
  /** PeerPigeon mesh instance for automatic peer discovery */
  mesh?: any; // PeerPigeonMesh instance
}

/**
 * Conflict resolution strategies
 */
export enum ConflictResolutionStrategy {
  /** Use vector clock to determine latest state */
  VECTOR_CLOCK = 'vector_clock',
  /** Last write wins */
  LAST_WRITE_WINS = 'last_write_wins',
  /** Custom resolver function */
  CUSTOM = 'custom'
}

/**
 * Represents a state conflict between peers
 */
export interface StateConflict {
  /** Conflicting states */
  states: Array<{
    peerId: string;
    state: any;
    vectorClock: VectorClock;
  }>;
  /** Timestamp when conflict was detected */
  detectedAt: number;
}

/**
 * Result of conflict resolution
 */
export interface ConflictResolution {
  /** Resolved state */
  resolvedState: any;
  /** Vector clock of resolved state */
  vectorClock: VectorClock;
  /** Resolution strategy used */
  strategy: ConflictResolutionStrategy;
  /** Timestamp when resolved */
  resolvedAt: number;
}
