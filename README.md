# PigeonMatch

The matchmaking and collaboration engine for PeerPigeon - a versatile solution for building distributed peer-to-peer applications with intelligent matchmaking and state synchronization.

## Features

- 🎮 **Flexible Matchmaking**: Configure minimum and maximum peer counts (2 or more peers)
- 🌐 **Network Namespace Support**: Uses PeerPigeon's native namespace isolation for separate peer networks
- 🕸️ **Mesh Peer Discovery**: Automatically tracks both direct and indirect peers throughout the mesh via gossip protocol
- ⏱️ **Vector Clock Arbitration**: Resolve conflicts and handle latency issues in distributed systems
- 🔄 **State Synchronization**: Automatic state synchronization across peers
- ⚡ **Vue/Vite Compatible**: Built with Vue 3 and Vite support by default
- 🔌 **Built on PeerPigeon**: Leverages the powerful PeerPigeon WebRTC mesh networking library

## Installation

```bash
npm install pigeonmatch
```

## Quick Start

### Matchmaking Engine with PeerPigeon Integration

```typescript
import { PeerPigeonMesh } from 'peerpigeon';
import { MatchmakingEngine, MatchmakingEvent } from 'pigeonmatch';

// Create PeerPigeon mesh instance
const mesh = new PeerPigeonMesh({ 
  networkName: 'game-lobby',
  enableWebDHT: true 
});
await mesh.init();
await mesh.connect('ws://localhost:3000');

// Create a matchmaking engine with mesh integration
// Automatically tracks ALL peers (direct + indirect) in the mesh via gossip protocol
const matchmaker = new MatchmakingEngine({
  minPeers: 2,      // Minimum peers required for a match
  maxPeers: 4,      // Maximum peers in a match
  namespace: 'game-lobby',
  matchTimeout: 30000,
  mesh: mesh        // Enables automatic peer discovery
});

// Listen for match events
matchmaker.on(MatchmakingEvent.MATCH_FOUND, (match) => {
  console.log('Match found!', match);
});

matchmaker.on(MatchmakingEvent.PEER_JOINED, (peer) => {
  console.log('Peer joined:', peer);
});

// Peers are automatically discovered from the mesh!
// You can also manually add peers with custom metadata
matchmaker.addPeer({
  id: 'peer-1',
  metadata: { skill: 'advanced' }
});
```

### Collaboration Engine with PeerPigeon Integration

```typescript
import { PeerPigeonMesh } from 'peerpigeon';
import { CollaborationEngine, CollaborationEvent, ConflictResolutionStrategy } from 'pigeonmatch';

// Create PeerPigeon mesh instance
const mesh = new PeerPigeonMesh({ 
  networkName: 'document-collaboration',
  enableWebDHT: true 
});
await mesh.init();
await mesh.connect('ws://localhost:3000');

// Create a collaboration engine with mesh integration
// Automatically tracks ALL peers (direct + indirect) and handles message passing
const collaboration = new CollaborationEngine({
  peerId: mesh.getStatus().peerId,
  namespace: 'document-collaboration',
  conflictResolution: ConflictResolutionStrategy.VECTOR_CLOCK,
  syncInterval: 5000,
  mesh: mesh        // Enables automatic peer discovery and message passing
});

// Listen for state updates
collaboration.on(CollaborationEvent.STATE_UPDATED, (update) => {
  console.log('State updated:', update);
});

// Listen for conflict resolution
collaboration.on(CollaborationEvent.CONFLICT_RESOLVED, (resolution) => {
  console.log('Conflict resolved:', resolution);
});

// Update local state - automatically synced with all peers in the mesh
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

PigeonMatch leverages PeerPigeon's native network namespace support for isolating peer groups. Create separate PeerPigeon mesh instances with different `networkName` configurations:

```typescript
import { PeerPigeonMesh } from 'peerpigeon';
import { MatchmakingEngine } from 'pigeonmatch';

// Create isolated mesh networks using PeerPigeon's native namespace support
const gameMesh = new PeerPigeonMesh({ networkName: 'game-lobby' });
const chatMesh = new PeerPigeonMesh({ networkName: 'chat-room' });

await gameMesh.connect('ws://localhost:3000');
await chatMesh.connect('ws://localhost:3000');

// Create matchmaking engines for each namespace
const gameMatchmaker = new MatchmakingEngine({
  minPeers: 2,
  maxPeers: 4,
  namespace: 'game-lobby'  // Used for match identification
});

const chatMatchmaker = new MatchmakingEngine({
  minPeers: 2,
  maxPeers: 10,
  namespace: 'chat-room'
});

// Peers in different PeerPigeon meshes won't see each other
```

## Mesh Integration & Indirect Peer Tracking

PigeonMatch integrates deeply with PeerPigeon's mesh networking to automatically track **all peers in the network**, including:

- **Direct Peers**: Peers with direct WebRTC connections
- **Indirect Peers**: Peers discovered through PeerPigeon's gossip protocol

### How It Works

When you provide a `mesh` parameter to the engines:

1. **Automatic Discovery**: The engine listens to PeerPigeon's `peerDiscovered` events to track ALL peers in the mesh, not just those directly connected
2. **Gossip Protocol**: PeerPigeon's gossip protocol ensures peer information propagates throughout the entire mesh
3. **Dynamic Updates**: As peers join/leave the mesh, the engines automatically update their peer lists
4. **Message Routing**: Messages are automatically routed through the mesh, reaching indirect peers via relay

### Example: Tracking Indirect Peers

```typescript
// In a mesh with 10 peers where:
// - Peer A is directly connected to Peers B and C
// - Peer D is only connected to Peer C (indirect to Peer A)

const mesh = new PeerPigeonMesh({ networkName: 'game' });
await mesh.connect('ws://localhost:3000');

const matchmaker = new MatchmakingEngine({
  minPeers: 4,
  maxPeers: 8,
  mesh: mesh  // Enables mesh integration
});

// Peer A's matchmaker will automatically track:
// - Peer B (direct)
// - Peer C (direct)
// - Peer D (indirect via C)
// - All other discovered peers in the mesh

// When a match is created, it can include ANY combination of peers,
// whether directly or indirectly connected
```

### Benefits

- **Scalability**: Match across the entire mesh, not just direct connections
- **Resilience**: Peers can communicate even when not directly connected
- **Simplicity**: No manual peer tracking required
- **Efficiency**: Leverages PeerPigeon's optimized routing and gossip protocol

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
  mesh?: any;              // PeerPigeonMesh instance for auto peer discovery
}
```

**Note**: When `mesh` is provided, peers are automatically discovered from the mesh. You can still manually add peers with custom metadata using `addPeer()`.

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
  mesh?: any;                        // PeerPigeonMesh instance for auto peer discovery and messaging
}
```

**Note**: When `mesh` is provided, peers are automatically discovered and messages are automatically sent through the mesh network.

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
2. **PeerPigeon Network Namespaces**: Leverage PeerPigeon's native namespace isolation for separate peer groups
3. **Event-Driven Architecture**: React to state changes and peer events
4. **Conflict Resolution Strategies**: Multiple strategies for handling conflicts

## License

ISC

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Related Projects

- [PeerPigeon](https://github.com/draeder/peerpigeon) - WebRTC mesh networking library
- [PigeonHub](https://github.com/draeder/pigeonhub) - Decentralized mesh network with signaling

