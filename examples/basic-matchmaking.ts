/**
 * Basic Matchmaking Example
 * 
 * This example demonstrates how to use the MatchmakingEngine
 * to create matches between peers.
 */

import { MatchmakingEngine, MatchmakingEvent, Peer } from '../src/index';

// Create a matchmaking engine for a 2v2 game
const matchmaker = new MatchmakingEngine({
  minPeers: 2,
  maxPeers: 4,
  namespace: 'game-lobby',
  matchTimeout: 30000,
  matchCriteria: {
    gameMode: '2v2'
  }
});

// Listen for matchmaking events
matchmaker.on(MatchmakingEvent.PEER_JOINED, (peer: Peer) => {
  console.log(`✅ Peer joined: ${peer.id}`);
  console.log(`   Queue size: ${matchmaker.getStats().queuedPeers}`);
});

matchmaker.on(MatchmakingEvent.PEER_LEFT, (peer: Peer) => {
  console.log(`❌ Peer left: ${peer.id}`);
});

matchmaker.on(MatchmakingEvent.MATCH_FOUND, (match) => {
  console.log('\n🎮 Match found!');
  console.log(`   Match ID: ${match.id}`);
  console.log(`   Players: ${match.peers.map(p => p.id).join(', ')}`);
  console.log(`   Namespace: ${match.namespace}`);
});

matchmaker.on(MatchmakingEvent.MATCH_READY, (match) => {
  console.log('\n🚀 Match is ready to start!');
  console.log(`   Match ID: ${match.id}`);
  console.log(`   Player count: ${match.peers.length}`);
});

matchmaker.on(MatchmakingEvent.MATCH_FAILED, (error) => {
  console.log('\n⚠️ Match failed:', error.reason);
  console.log(`   Required: ${error.peersRequired}, Available: ${error.peersAvailable}`);
});

// Simulate players joining
console.log('\n📊 Starting matchmaking simulation...\n');

// Add first player
setTimeout(() => {
  matchmaker.addPeer({
    id: 'player-1',
    metadata: {
      gameMode: '2v2',
      skill: 1500
    }
  });
}, 1000);

// Add second player (should create a match)
setTimeout(() => {
  matchmaker.addPeer({
    id: 'player-2',
    metadata: {
      gameMode: '2v2',
      skill: 1450
    }
  });
}, 2000);

// Add third player
setTimeout(() => {
  matchmaker.addPeer({
    id: 'player-3',
    metadata: {
      gameMode: '2v2',
      skill: 1600
    }
  });
}, 3000);

// Add fourth player
setTimeout(() => {
  matchmaker.addPeer({
    id: 'player-4',
    metadata: {
      gameMode: '2v2',
      skill: 1550
    }
  });
}, 4000);

// Print statistics after 5 seconds
setTimeout(() => {
  const stats = matchmaker.getStats();
  console.log('\n📈 Final Statistics:');
  console.log(`   Total peers: ${stats.totalPeers}`);
  console.log(`   Queued peers: ${stats.queuedPeers}`);
  console.log(`   Active matches: ${stats.activeMatches}`);
  console.log(`   Namespace: ${stats.namespace}`);
}, 5000);
