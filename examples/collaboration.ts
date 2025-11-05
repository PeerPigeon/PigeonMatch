/**
 * Collaboration Example
 * 
 * This example demonstrates how to use the CollaborationEngine
 * for real-time state synchronization and conflict resolution.
 */

import { 
  CollaborationEngine, 
  CollaborationEvent, 
  ConflictResolutionStrategy,
  MessageType,
  PeerMessage 
} from '../src/index';

// Create two collaboration engines simulating two peers
const peer1 = new CollaborationEngine({
  peerId: 'peer-1',
  namespace: 'document-editor',
  conflictResolution: ConflictResolutionStrategy.VECTOR_CLOCK,
  syncInterval: 2000
});

const peer2 = new CollaborationEngine({
  peerId: 'peer-2',
  namespace: 'document-editor',
  conflictResolution: ConflictResolutionStrategy.VECTOR_CLOCK,
  syncInterval: 2000
});

// Set up event listeners for peer 1
peer1.on(CollaborationEvent.STATE_UPDATED, (update) => {
  console.log(`\n📝 [Peer 1] State updated by ${update.peerId}`);
  console.log(`   Current state:`, peer1.getState());
  console.log(`   Vector clock:`, update.vectorClock.toJSON());
});

peer1.on(CollaborationEvent.CONFLICT_DETECTED, (conflict) => {
  console.log(`\n⚠️ [Peer 1] Conflict detected!`);
  console.log(`   Conflicting states: ${conflict.states.length}`);
});

peer1.on(CollaborationEvent.CONFLICT_RESOLVED, (resolution) => {
  console.log(`\n✅ [Peer 1] Conflict resolved using ${resolution.strategy}`);
  console.log(`   Resolved state:`, resolution.resolvedState);
});

// Set up event listeners for peer 2
peer2.on(CollaborationEvent.STATE_UPDATED, (update) => {
  console.log(`\n📝 [Peer 2] State updated by ${update.peerId}`);
  console.log(`   Current state:`, peer2.getState());
  console.log(`   Vector clock:`, update.vectorClock.toJSON());
});

peer2.on(CollaborationEvent.CONFLICT_DETECTED, (conflict) => {
  console.log(`\n⚠️ [Peer 2] Conflict detected!`);
  console.log(`   Conflicting states: ${conflict.states.length}`);
});

peer2.on(CollaborationEvent.CONFLICT_RESOLVED, (resolution) => {
  console.log(`\n✅ [Peer 2] Conflict resolved using ${resolution.strategy}`);
  console.log(`   Resolved state:`, resolution.resolvedState);
});

// Set up message passing between peers
peer1.on('message:send', (message: PeerMessage) => {
  if (message.to === 'peer-2' || !message.to) {
    // Simulate network delay
    setTimeout(() => {
      peer2.handleMessage(message);
    }, 100);
  }
});

peer2.on('message:send', (message: PeerMessage) => {
  if (message.to === 'peer-1' || !message.to) {
    // Simulate network delay
    setTimeout(() => {
      peer1.handleMessage(message);
    }, 100);
  }
});

// Add each peer to the other's collaboration space
peer1.addPeer({
  id: 'peer-2',
  metadata: { name: 'Peer 2' }
});

peer2.addPeer({
  id: 'peer-1',
  metadata: { name: 'Peer 1' }
});

// Simulate collaborative editing
console.log('\n🚀 Starting collaboration simulation...\n');

// Peer 1 makes first edit
setTimeout(() => {
  console.log('\n[Action] Peer 1 updates document');
  peer1.updateState({
    documentText: 'Hello',
    cursor: { line: 1, column: 5 }
  });
}, 1000);

// Peer 2 makes an edit
setTimeout(() => {
  console.log('\n[Action] Peer 2 updates document');
  peer2.updateState({
    documentText: 'Hello World',
    cursor: { line: 1, column: 11 }
  });
}, 2000);

// Peer 1 makes another edit
setTimeout(() => {
  console.log('\n[Action] Peer 1 updates document again');
  peer1.updateState({
    documentText: 'Hello World!',
    cursor: { line: 1, column: 12 }
  });
}, 3000);

// Print final state
setTimeout(() => {
  console.log('\n\n📊 Final State:');
  console.log('\nPeer 1:');
  console.log('  State:', peer1.getState());
  console.log('  Vector Clock:', peer1.getVectorClock().toJSON());
  
  console.log('\nPeer 2:');
  console.log('  State:', peer2.getState());
  console.log('  Vector Clock:', peer2.getVectorClock().toJSON());
  
  // Cleanup
  peer1.destroy();
  peer2.destroy();
}, 5000);
