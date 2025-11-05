/**
 * PigeonMatch - Matchmaking and Collaboration Engine for PeerPigeon
 * 
 * A versatile matchmaking and collaboration engine built on top of peerpigeon
 * with network namespace support, configurable peer counts, and vector clock
 * arbitration for distributed systems.
 */

export { VectorClock } from './VectorClock';
export { NetworkNamespace, NamespaceManager } from './NetworkNamespace';
export { MatchmakingEngine } from './MatchmakingEngine';
export { CollaborationEngine } from './CollaborationEngine';

export type {
  // Types
  MatchmakingConfig,
  MatchCriteria,
  Peer,
  MatchGroup,
  CollaborationConfig,
  StateConflict,
  ConflictResolution,
  PeerMessage
} from './types';

export {
  // Enums
  MatchmakingEvent,
  CollaborationEvent,
  MessageType,
  ConflictResolutionStrategy
} from './types';
