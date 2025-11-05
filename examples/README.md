# PigeonMatch Examples

This directory contains example implementations demonstrating how to use PigeonMatch.

## Examples

### 1. Basic Matchmaking (`basic-matchmaking.ts`)

Demonstrates the core matchmaking functionality:
- Creating a matchmaking engine
- Adding peers to the queue
- Handling match events
- Using custom match criteria

Run with:
```bash
npx tsx examples/basic-matchmaking.ts
```

### 2. Collaboration (`collaboration.ts`)

Shows how to use the CollaborationEngine for state synchronization:
- Setting up multiple peers
- Syncing state between peers
- Handling conflicts with vector clocks
- Message passing simulation

Run with:
```bash
npx tsx examples/collaboration.ts
```

### 3. Vector Clock (`vector-clock.ts`)

Illustrates vector clock operations:
- Creating and incrementing clocks
- Merging clocks from different peers
- Detecting happens-before relationships
- Identifying concurrent events (conflicts)
- Serialization and deserialization

Run with:
```bash
npx tsx examples/vector-clock.ts
```

### 4. Vue Component (`vue-component.vue`)

A complete Vue 3 component showing:
- Integration with Vue's reactivity system
- UI for matchmaking
- Lifecycle management
- Event handling

To use this component in your Vue app:
```vue
<script setup>
import MatchmakingLobby from './examples/vue-component.vue';
</script>

<template>
  <MatchmakingLobby />
</template>
```

## Running the Examples

First, install dependencies:
```bash
npm install
```

For TypeScript examples, install tsx:
```bash
npm install -g tsx
```

Then run any example:
```bash
npx tsx examples/basic-matchmaking.ts
npx tsx examples/collaboration.ts
npx tsx examples/vector-clock.ts
```

## Integration Patterns

### With PeerPigeon

```typescript
import PeerPigeon from 'peerpigeon';
import { MatchmakingEngine, CollaborationEngine } from 'pigeonmatch';

// Initialize PeerPigeon
const pigeon = new PeerPigeon({
  // your config
});

// Create matchmaking engine
const matchmaker = new MatchmakingEngine({
  minPeers: 2,
  maxPeers: 4
});

// When a match is found, establish PeerPigeon connections
matchmaker.on('match:ready', (match) => {
  match.peers.forEach(peer => {
    pigeon.connect(peer.id);
  });
});

// Use collaboration engine for state sync over PeerPigeon
const collab = new CollaborationEngine({
  peerId: pigeon.id
});

pigeon.on('message', (msg) => {
  collab.handleMessage(msg);
});

collab.on('message:send', (msg) => {
  pigeon.send(msg.to, msg);
});
```

### With Vue 3 Composition API

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import { MatchmakingEngine } from 'pigeonmatch';

export function useMatchmaking(config) {
  const matchmaker = ref(null);
  const currentMatch = ref(null);
  
  onMounted(() => {
    matchmaker.value = new MatchmakingEngine(config);
    
    matchmaker.value.on('match:ready', (match) => {
      currentMatch.value = match;
    });
  });
  
  onUnmounted(() => {
    matchmaker.value?.removeAllListeners();
  });
  
  return {
    matchmaker,
    currentMatch
  };
}
```

## Common Use Cases

### 1. Multiplayer Game Lobby
```typescript
const matchmaker = new MatchmakingEngine({
  minPeers: 2,
  maxPeers: 4,
  namespace: 'game-lobby',
  matchCriteria: {
    gameMode: '2v2',
    skillRange: 'balanced'
  }
});
```

### 2. Collaborative Document Editing
```typescript
const collab = new CollaborationEngine({
  peerId: userId,
  namespace: 'document-123',
  conflictResolution: ConflictResolutionStrategy.VECTOR_CLOCK,
  syncInterval: 1000
});
```

### 3. Video Chat Rooms
```typescript
const matchmaker = new MatchmakingEngine({
  minPeers: 2,
  maxPeers: 10,
  namespace: 'video-room-1'
});
```

## Tips

1. **Network Namespaces**: Use different namespaces to isolate different groups of peers
2. **Vector Clocks**: Always use vector clocks for distributed conflict resolution
3. **Event Handling**: Clean up event listeners in component unmount/destroy hooks
4. **Error Handling**: Always handle matchmaking failures and network errors
5. **Testing**: Use the examples as a starting point for your own tests

## Support

For more information, see the main [README](../README.md) or open an issue on GitHub.
