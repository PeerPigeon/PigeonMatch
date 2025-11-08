import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchmakingEngine } from '../MatchmakingEngine';
import { MatchmakingEvent } from '../types';

describe('MatchmakingEngine', () => {
  let engine: MatchmakingEngine;

  beforeEach(() => {
    engine = new MatchmakingEngine({
      minPeers: 2,
      maxPeers: 4,
      namespace: 'test-lobby',
      matchTimeout: 5000
    });
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(engine).toBeDefined();
    });

    it('should use default values for optional config', () => {
      const defaultEngine = new MatchmakingEngine({
        minPeers: 2,
        maxPeers: 4
      });
      expect(defaultEngine).toBeDefined();
    });
  });

  describe('addPeer', () => {
    it('should add a peer to the queue', () => {
      const peerJoinedSpy = vi.fn();
      engine.on(MatchmakingEvent.PEER_JOINED, peerJoinedSpy);

      engine.addPeer({ id: 'peer1', metadata: { skill: 'beginner' } });

      expect(peerJoinedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'peer1',
          metadata: { skill: 'beginner' }
        })
      );
    });

    it('should add peers even with same id (no duplicate check)', () => {
      const peerJoinedSpy = vi.fn();
      engine.on(MatchmakingEvent.PEER_JOINED, peerJoinedSpy);

      engine.addPeer({ id: 'peer1', metadata: {} });
      engine.addPeer({ id: 'peer1', metadata: {} });

      // The implementation allows duplicates, so both calls succeed
      expect(peerJoinedSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('removePeer', () => {
    it('should remove a peer', () => {
      const peerLeftSpy = vi.fn();
      engine.on(MatchmakingEvent.PEER_LEFT, peerLeftSpy);

      engine.addPeer({ id: 'peer1', metadata: {} });
      const result = engine.removePeer('peer1');

      expect(result).toBe(true);
      expect(peerLeftSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'peer1'
        })
      );
    });

    it('should handle removing non-existent peer', () => {
      const result = engine.removePeer('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('matchmaking', () => {
    it('should create a match when enough peers join', () => {
      const matchFoundSpy = vi.fn();
      engine.on(MatchmakingEvent.MATCH_FOUND, matchFoundSpy);

      engine.addPeer({ id: 'peer1', metadata: {} });
      engine.addPeer({ id: 'peer2', metadata: {} });

      expect(matchFoundSpy).toHaveBeenCalled();
      const match = matchFoundSpy.mock.calls[0][0];
      expect(match.peers).toHaveLength(2);
    });

    it('should not create a match with insufficient peers', () => {
      const matchFoundSpy = vi.fn();
      engine.on(MatchmakingEvent.MATCH_FOUND, matchFoundSpy);

      engine.addPeer({ id: 'peer1', metadata: {} });

      expect(matchFoundSpy).not.toHaveBeenCalled();
    });

    it('should respect maxPeers limit', () => {
      const matchFoundSpy = vi.fn();
      engine.on(MatchmakingEvent.MATCH_FOUND, matchFoundSpy);

      engine.addPeer({ id: 'peer1', metadata: {} });
      engine.addPeer({ id: 'peer2', metadata: {} });
      engine.addPeer({ id: 'peer3', metadata: {} });
      engine.addPeer({ id: 'peer4', metadata: {} });
      engine.addPeer({ id: 'peer5', metadata: {} });

      expect(matchFoundSpy).toHaveBeenCalled();
      const match = matchFoundSpy.mock.calls[0][0];
      expect(match.peers.length).toBeLessThanOrEqual(4);
    });
  });

  describe('getPeer', () => {
    it('should return peer information', () => {
      engine.addPeer({ id: 'peer1', metadata: {} });

      const peer = engine.getPeer('peer1');
      expect(peer).toBeDefined();
      expect(peer?.id).toBe('peer1');
    });

    it('should return undefined for non-existent peer', () => {
      const peer = engine.getPeer('nonexistent');
      expect(peer).toBeUndefined();
    });
  });

  describe('mesh integration', () => {
    it('should set up listeners when mesh is provided', () => {
      const mockMesh = {
        on: vi.fn(),
        getDiscoveredPeers: vi.fn().mockReturnValue([]),
        getConnectedPeers: vi.fn().mockReturnValue([])
      };

      new MatchmakingEngine({
        minPeers: 2,
        maxPeers: 4,
        mesh: mockMesh
      });

      expect(mockMesh.on).toHaveBeenCalledWith('peerDiscovered', expect.any(Function));
      expect(mockMesh.on).toHaveBeenCalledWith('peerConnected', expect.any(Function));
      expect(mockMesh.on).toHaveBeenCalledWith('peerDisconnected', expect.any(Function));
    });

    it('should automatically add discovered peers', () => {
      const mockMesh = {
        on: vi.fn(),
        getDiscoveredPeers: vi.fn().mockReturnValue([]),
        getConnectedPeers: vi.fn().mockReturnValue([])
      };

      const engineWithMesh = new MatchmakingEngine({
        minPeers: 2,
        maxPeers: 4,
        mesh: mockMesh
      });

      const peerJoinedSpy = vi.fn();
      engineWithMesh.on(MatchmakingEvent.PEER_JOINED, peerJoinedSpy);

      // Simulate peer discovery
      const peerDiscoveredHandler = mockMesh.on.mock.calls.find(
        call => call[0] === 'peerDiscovered'
      )?.[1];

      if (peerDiscoveredHandler) {
        peerDiscoveredHandler({ peerId: 'discovered-peer' });
        expect(peerJoinedSpy).toHaveBeenCalled();
      }
    });
  });

  describe('getAllPeers', () => {
    it('should return all peers', () => {
      engine.addPeer({ id: 'peer1', metadata: {} });
      engine.addPeer({ id: 'peer2', metadata: {} });

      const peers = engine.getAllPeers();
      expect(peers).toHaveLength(2);
    });
  });
});
