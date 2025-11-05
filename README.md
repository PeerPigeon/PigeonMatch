# PigeonMatch

The matchmaking and collaboration engine for PeerPigeon - a versatile solution for building distributed peer-to-peer applications with intelligent matchmaking and state synchronization.

## Features

- 🎮 **Flexible Matchmaking**: Configure minimum and maximum peer counts (2 or more peers)
- 🌐 **Network Namespace Support**: Isolate different peer groups in separate network namespaces
- ⏱️ **Vector Clock Arbitration**: Resolve conflicts and handle latency issues in distributed systems
- 🔄 **State Synchronization**: Automatic state synchronization across peers
- ⚡ **Vue/Vite Compatible**: Built with Vue 3 and Vite support by default
- 🔌 **Built on PeerPigeon**: Leverages the powerful PeerPigeon WebRTC mesh networking library

## Installation

```bash
npm install pigeonmatch
```

## Quick Start

### Matchmaking Engine

```typescript
import { MatchmakingEngine, MatchmakingEvent } from 'pigeonmatch';

// Create a matchmaking engine
const matchmaker = new MatchmakingEngine({
  minPeers: 2,      // Minimum peers required for a match
  maxPeers: 4,      // Maximum peers in a match
  namespace: 'game-lobby',
  matchTimeout: 30000
});

// Listen for match events
matchmaker.on(MatchmakingEvent.MATCH_FOUND, (match) => {
  console.log('Match found!', match);
});

matchmaker.on(MatchmakingEvent.PEER_JOINED, (peer) => {
  console.log('Peer joined:', peer);
});

// Add peers to the matchmaking pool
matchmaker.addPeer({
  id: 'peer-1',
  metadata: { skill: 'advanced' }
});

matchmaker.addPeer({
  id: 'peer-2',
  metadata: { skill: 'advanced' }
});
```

### Collaboration Engine

```typescript
import { CollaborationEngine, CollaborationEvent, ConflictResolutionStrategy } from 'pigeonmatch';

// Create a collaboration engine
const collaboration = new CollaborationEngine({
  peerId: 'my-peer-id',
  namespace: 'document-collaboration',
  conflictResolution: ConflictResolutionStrategy.VECTOR_CLOCK,
  syncInterval: 5000
});

// Listen for state updates
collaboration.on(CollaborationEvent.STATE_UPDATED, (update) => {
  console.log('State updated:', update);
});

// Listen for conflict resolution
collaboration.on(CollaborationEvent.CONFLICT_RESOLVED, (resolution) => {
  console.log('Conflict resolved:', resolution);
});

// Update local state
collaboration.updateState({
  documentText: 'Hello, world!',
  cursor: { line: 1, column: 0 }
});

// Handle messages from other peers
collaboration.handleMessage(message);
```

### Vector Clock

```typescript
import { VectorClock } from 'pigeonmatch';

// Create vector clocks for distributed time tracking
const clock1 = new VectorClock();
const clock2 = new VectorClock();

// Increment clocks
clock1.increment('peer-1');
clock2.increment('peer-2');

// Compare clocks
if (clock1.happensBefore(clock2)) {
  console.log('Event 1 happened before event 2');
} else if (clock1.happensAfter(clock2)) {
  console.log('Event 1 happened after event 2');
} else {
  console.log('Events are concurrent');
}

// Merge clocks for synchronization
clock1.merge(clock2);
```

### Network Namespaces

```typescript
import { NamespaceManager } from 'pigeonmatch';

// Create a namespace manager
const manager = new NamespaceManager();

// Create or get namespaces
const gameNamespace = manager.getOrCreateNamespace('game-lobby');
const chatNamespace = manager.getOrCreateNamespace('chat-room');

// Add peers to namespaces
gameNamespace.addPeer('peer-1', { /* peer data */ });
chatNamespace.addPeer('peer-2', { /* peer data */ });

// Check peer counts
console.log('Game lobby peers:', gameNamespace.getPeerCount());
console.log('Chat room peers:', chatNamespace.getPeerCount());
```

## API Reference

### MatchmakingEngine

#### Constructor Options

```typescript
interface MatchmakingConfig {
  minPeers: number;        // Minimum peers required
  maxPeers: number;        // Maximum peers allowed
  matchTimeout?: number;   // Timeout in milliseconds
  namespace?: string;      // Network namespace
  matchCriteria?: object;  // Custom matching criteria
}
```

#### Methods

- `addPeer(peer: Peer): void` - Add a peer to matchmaking
- `removePeer(peerId: string): boolean` - Remove a peer
- `getPeer(peerId: string): Peer | undefined` - Get peer by ID
- `getAllPeers(): Peer[]` - Get all peers
- `getAllMatches(): MatchGroup[]` - Get all active matches
- `getStats()` - Get matchmaking statistics

#### Events

- `peer:joined` - A peer joined the matchmaking pool
- `peer:left` - A peer left the matchmaking pool
- `match:found` - A match was found
- `match:ready` - A match is ready to start
- `match:failed` - Matchmaking failed
- `match:disbanded` - A match was disbanded

### CollaborationEngine

#### Constructor Options

```typescript
interface CollaborationConfig {
  peerId: string;                    // Local peer ID
  namespace?: string;                // Network namespace
  conflictResolution?: ConflictResolutionStrategy;
  syncInterval?: number;             // Sync interval in ms
}
```

#### Methods

- `updateState(state: any): void` - Update local state
- `getState(): any` - Get current local state
- `getPeerState(peerId: string): any` - Get peer's state
- `handleMessage(message: PeerMessage): void` - Handle peer message
- `addPeer(peer: Peer): void` - Add a peer
- `removePeer(peerId: string): void` - Remove a peer
- `getVectorClock(): VectorClock` - Get local vector clock

#### Events

- `state:updated` - State was updated
- `conflict:detected` - A conflict was detected
- `conflict:resolved` - A conflict was resolved
- `sync:requested` - Sync was requested
- `sync:completed` - Sync completed

### VectorClock

#### Methods

- `increment(peerId: string): void` - Increment clock for peer
- `merge(other: VectorClock): void` - Merge with another clock
- `compare(other: VectorClock): number` - Compare clocks (-1, 0, 1)
- `happensBefore(other: VectorClock): boolean` - Check ordering
- `happensAfter(other: VectorClock): boolean` - Check ordering
- `isConcurrent(other: VectorClock): boolean` - Check concurrency
- `clone(): VectorClock` - Clone the clock
- `toJSON(): object` - Serialize to JSON
- `fromJSON(obj: object): VectorClock` - Deserialize from JSON

## Vue/Vite Integration

PigeonMatch is designed to work seamlessly with Vue 3 and Vite:

```typescript
// In your Vue component
import { ref, onMounted, onUnmounted } from 'vue';
import { MatchmakingEngine, MatchmakingEvent } from 'pigeonmatch';

export default {
  setup() {
    const matchmaker = ref<MatchmakingEngine | null>(null);
    const peers = ref([]);
    
    onMounted(() => {
      matchmaker.value = new MatchmakingEngine({
        minPeers: 2,
        maxPeers: 4,
        namespace: 'game'
      });
      
      matchmaker.value.on(MatchmakingEvent.PEER_JOINED, (peer) => {
        peers.value.push(peer);
      });
    });
    
    onUnmounted(() => {
      matchmaker.value?.removeAllListeners();
    });
    
    return { peers };
  }
};
```

## Use Cases

- **Multiplayer Games**: Match players and synchronize game state
- **Collaborative Editing**: Real-time document collaboration with conflict resolution
- **Video Chat Rooms**: Manage peer connections in virtual rooms
- **Distributed Computing**: Coordinate work across multiple peers
- **Decentralized Apps**: Build dApps with peer-to-peer communication

## Architecture

PigeonMatch uses a combination of proven distributed systems concepts:

1. **Vector Clocks**: Track causality and detect concurrent events
2. **Network Namespaces**: Isolate different peer groups
3. **Event-Driven Architecture**: React to state changes and peer events
4. **Conflict Resolution Strategies**: Multiple strategies for handling conflicts

## License

ISC

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Related Projects

- [PeerPigeon](https://github.com/draeder/peerpigeon) - WebRTC mesh networking library
- [PigeonHub](https://github.com/draeder/pigeonhub) - Decentralized mesh network with signaling

