/**
 * PigeonMatch - Matchmaking and Collaboration Engine for PeerPigeon
 * 
 * A versatile matchmaking and collaboration engine built on top of peerpigeon
 * with vector clock arbitration for distributed systems.
 * 
 * Note: Network namespace isolation is provided by PeerPigeon's native support.
 * Create separate PeerPigeon mesh instances with different `networkName` configurations
 * for isolated peer networks.
 */

export { VectorClock } from './VectorClock';
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
