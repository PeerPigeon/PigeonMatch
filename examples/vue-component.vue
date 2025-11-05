<!--
  Vue Component Example
  
  This example shows how to integrate PigeonMatch with Vue 3
-->
<template>
  <div class="matchmaking-lobby">
    <h1>🎮 Game Lobby</h1>
    
    <div class="stats">
      <p>Players Online: {{ stats.totalPeers }}</p>
      <p>In Queue: {{ stats.queuedPeers }}</p>
      <p>Active Matches: {{ stats.activeMatches }}</p>
    </div>
    
    <div class="actions">
      <button @click="joinQueue" :disabled="inQueue">
        {{ inQueue ? '⏳ In Queue...' : '▶️ Join Queue' }}
      </button>
      <button @click="leaveQueue" :disabled="!inQueue">
        ❌ Leave Queue
      </button>
    </div>
    
    <div v-if="currentMatch" class="match-info">
      <h2>🎯 Match Found!</h2>
      <p>Match ID: {{ currentMatch.id }}</p>
      <h3>Players:</h3>
      <ul>
        <li v-for="peer in currentMatch.peers" :key="peer.id">
          {{ peer.id }} (Skill: {{ peer.metadata?.skill }})
        </li>
      </ul>
    </div>
    
    <div class="peer-list">
      <h3>Players in Lobby</h3>
      <ul>
        <li v-for="peer in peers" :key="peer.id">
          {{ peer.id }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { 
  MatchmakingEngine, 
  MatchmakingEvent,
  type MatchGroup,
  type Peer 
} from 'pigeonmatch';

// State
const matchmaker = ref<MatchmakingEngine | null>(null);
const peers = ref<Peer[]>([]);
const currentMatch = ref<MatchGroup | null>(null);
const inQueue = ref(false);
const myPeerId = ref(`player-${Math.random().toString(36).substr(2, 9)}`);

// Computed
const stats = computed(() => {
  if (!matchmaker.value) {
    return { totalPeers: 0, queuedPeers: 0, activeMatches: 0, namespace: '' };
  }
  return matchmaker.value.getStats();
});

// Methods
const joinQueue = () => {
  if (!matchmaker.value) return;
  
  matchmaker.value.addPeer({
    id: myPeerId.value,
    metadata: {
      skill: Math.floor(Math.random() * 1000) + 1000
    }
  });
  
  inQueue.value = true;
};

const leaveQueue = () => {
  if (!matchmaker.value) return;
  
  matchmaker.value.removePeer(myPeerId.value);
  inQueue.value = false;
  currentMatch.value = null;
};

// Lifecycle
onMounted(() => {
  // Initialize matchmaking engine
  matchmaker.value = new MatchmakingEngine({
    minPeers: 2,
    maxPeers: 4,
    namespace: 'game-lobby',
    matchTimeout: 30000
  });
  
  // Set up event listeners
  matchmaker.value.on(MatchmakingEvent.PEER_JOINED, (peer: Peer) => {
    peers.value.push(peer);
  });
  
  matchmaker.value.on(MatchmakingEvent.PEER_LEFT, (peer: Peer) => {
    peers.value = peers.value.filter(p => p.id !== peer.id);
  });
  
  matchmaker.value.on(MatchmakingEvent.MATCH_FOUND, (match: MatchGroup) => {
    currentMatch.value = match;
  });
  
  matchmaker.value.on(MatchmakingEvent.MATCH_READY, (match: MatchGroup) => {
    console.log('Match is ready!', match);
  });
});

onUnmounted(() => {
  if (matchmaker.value) {
    matchmaker.value.removeAllListeners();
    if (inQueue.value) {
      matchmaker.value.removePeer(myPeerId.value);
    }
  }
});
</script>

<style scoped>
.matchmaking-lobby {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
}

h1 {
  text-align: center;
  color: #2c3e50;
}

.stats {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.stats p {
  margin: 0.5rem 0;
  font-size: 1.1rem;
}

.actions {
  display: flex;
  gap: 1rem;
  margin: 2rem 0;
}

button {
  flex: 1;
  padding: 1rem;
  font-size: 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

button:not(:disabled) {
  background: #42b883;
  color: white;
}

button:not(:disabled):hover {
  background: #33a06f;
  transform: translateY(-2px);
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.match-info {
  background: #e7f5ff;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 2rem 0;
  border: 2px solid #42b883;
}

.match-info h2 {
  margin-top: 0;
  color: #2c3e50;
}

.peer-list {
  margin-top: 2rem;
}

.peer-list ul {
  list-style: none;
  padding: 0;
}

.peer-list li {
  background: #f8f9fa;
  padding: 0.75rem;
  margin: 0.5rem 0;
  border-radius: 4px;
  border-left: 3px solid #42b883;
}
</style>
