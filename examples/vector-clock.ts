/**
 * Vector Clock Example
 * 
 * This example demonstrates vector clock usage for distributed
 * time synchronization and causality tracking.
 */

import { VectorClock } from '../src/index';

console.log('🕐 Vector Clock Example\n');

// Create vector clocks for three peers
const clockA = new VectorClock();
const clockB = new VectorClock();
const clockC = new VectorClock();

console.log('1️⃣ Initial state (all clocks at 0)');
console.log('   Clock A:', clockA.toJSON());
console.log('   Clock B:', clockB.toJSON());
console.log('   Clock C:', clockC.toJSON());

// Peer A performs an action
console.log('\n2️⃣ Peer A performs action');
clockA.increment('peer-a');
console.log('   Clock A:', clockA.toJSON());

// Peer B performs an action
console.log('\n3️⃣ Peer B performs action');
clockB.increment('peer-b');
console.log('   Clock B:', clockB.toJSON());

// Check if events are concurrent
console.log('\n4️⃣ Are A and B concurrent?');
console.log('   Result:', clockA.isConcurrent(clockB));

// Peer A sends message to Peer C
console.log('\n5️⃣ Peer A sends message to Peer C');
const messageFromA = clockA.clone();
clockC.merge(messageFromA);
clockC.increment('peer-c');
console.log('   Clock C after receiving from A:', clockC.toJSON());

// Peer B sends message to Peer C
console.log('\n6️⃣ Peer B sends message to Peer C');
const messageFromB = clockB.clone();
clockC.merge(messageFromB);
clockC.increment('peer-c');
console.log('   Clock C after receiving from B:', clockC.toJSON());

// Check happens-before relationships
console.log('\n7️⃣ Happens-before relationships:');
console.log('   Does A happen before C?', clockA.happensBefore(clockC));
console.log('   Does B happen before C?', clockB.happensBefore(clockC));
console.log('   Does C happen after A?', clockC.happensAfter(clockA));
console.log('   Does C happen after B?', clockC.happensAfter(clockB));

// Peer A receives update from C
console.log('\n8️⃣ Peer A receives update from C');
clockA.merge(clockC);
clockA.increment('peer-a');
console.log('   Clock A:', clockA.toJSON());

// Demonstrate conflict detection
console.log('\n9️⃣ Conflict Detection Example');
const clock1 = new VectorClock();
const clock2 = new VectorClock();

clock1.set('peer-x', 5);
clock1.set('peer-y', 3);

clock2.set('peer-x', 4);
clock2.set('peer-y', 6);

console.log('   Clock 1:', clock1.toJSON());
console.log('   Clock 2:', clock2.toJSON());
console.log('   Are they concurrent?', clock1.isConcurrent(clock2));
console.log('   This indicates a conflict that needs resolution!');

// Demonstrate serialization
console.log('\n🔟 Serialization Example');
const clockToSerialize = new VectorClock();
clockToSerialize.increment('peer-1');
clockToSerialize.increment('peer-1');
clockToSerialize.increment('peer-2');

const json = clockToSerialize.toJSON();
console.log('   Serialized:', JSON.stringify(json));

const deserialized = VectorClock.fromJSON(json);
console.log('   Deserialized:', deserialized.toJSON());
console.log('   Are they equal?', deserialized.compare(clockToSerialize) === 0);

console.log('\n✅ Vector Clock example complete!');
