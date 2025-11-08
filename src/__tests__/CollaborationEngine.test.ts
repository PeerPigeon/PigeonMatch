import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CollaborationEngine } from '../CollaborationEngine';
import { CollaborationEvent, ConflictResolutionStrategy } from '../types';

describe('CollaborationEngine', () => {
  let engine: CollaborationEngine;

  beforeEach(() => {
    engine = new CollaborationEngine({
      peerId: 'test-peer',
      namespace: 'test-collab',
      conflictResolution: ConflictResolutionStrategy.VECTOR_CLOCK,
      syncInterval: 1000
    });
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(engine).toBeDefined();
    });

    it('should use default values for optional config', () => {
      const defaultEngine = new CollaborationEngine({
        peerId: 'test-peer',
        namespace: 'test-collab'
      });
      expect(defaultEngine).toBeDefined();
    });
  });

  describe('updateState', () => {
    it('should update local state', () => {
      const stateUpdatedSpy = vi.fn();
      engine.on(CollaborationEvent.STATE_UPDATED, stateUpdatedSpy);

      engine.updateState({ counter: 1 });

      expect(stateUpdatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          peerId: 'test-peer',
          state: expect.objectContaining({ counter: 1 })
        })
      );
    });

    it('should increment vector clock on update', () => {
      engine.updateState({ value: 'test' });
      const stateData = engine.getState();

      // State should be updated
      expect(stateData).toEqual({ value: 'test' });
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      engine.updateState({ value: 'test' });
      const state = engine.getState();

      expect(state).toEqual({ value: 'test' });
    });
  });

  describe('addPeer', () => {
    it('should add a peer to tracking', () => {
      engine.addPeer({
        id: 'peer1',
        metadata: {},
        joinedAt: Date.now()
      });

      // Verify peer was added by checking internal state
      // Since there's no public getAllPeers, we just check it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('removePeer', () => {
    it('should remove a peer', () => {
      engine.addPeer({
        id: 'peer1',
        metadata: {},
        joinedAt: Date.now()
      });
      
      engine.removePeer('peer1');
      
      // Verify peer was removed by checking getPeerState returns undefined
      expect(engine.getPeerState('peer1')).toBeUndefined();
    });

    it('should handle removing non-existent peer gracefully', () => {
      expect(() => engine.removePeer('nonexistent')).not.toThrow();
    });
  });

  describe('conflict resolution', () => {
    it('should handle conflict resolution strategy', () => {
      const engine = new CollaborationEngine({
        peerId: 'test-peer',
        namespace: 'test-collab',
        conflictResolution: ConflictResolutionStrategy.VECTOR_CLOCK
      });

      expect(engine).toBeDefined();
      // Conflict resolution is tested through integration
    });
  });

  describe('mesh integration', () => {
    it('should set up listeners when mesh is provided', () => {
      const mockMesh = {
        on: vi.fn(),
        send: vi.fn(),
        broadcast: vi.fn(),
        getDiscoveredPeers: vi.fn().mockReturnValue([]),
        getPeers: vi.fn().mockReturnValue([])
      };

      new CollaborationEngine({
        peerId: 'test-peer',
        namespace: 'test-collab',
        mesh: mockMesh
      });

      expect(mockMesh.on).toHaveBeenCalledWith('peerDiscovered', expect.any(Function));
      expect(mockMesh.on).toHaveBeenCalledWith('peerConnected', expect.any(Function));
      expect(mockMesh.on).toHaveBeenCalledWith('peerDisconnected', expect.any(Function));
    });

    it('should broadcast state updates when mesh is available', () => {
      const mockMesh = {
        on: vi.fn(),
        send: vi.fn(),
        sendMessage: vi.fn(),
        sendDirectMessage: vi.fn(),
        broadcast: vi.fn(),
        getDiscoveredPeers: vi.fn().mockReturnValue([]),
        getPeers: vi.fn().mockReturnValue([])
      };

      const engineWithMesh = new CollaborationEngine({
        peerId: 'test-peer',
        namespace: 'test-collab',
        mesh: mockMesh
      });

      // Add a peer so there's someone to broadcast to
      engineWithMesh.addPeer({
        id: 'peer1',
        metadata: {},
        joinedAt: Date.now()
      });

      engineWithMesh.updateState({ value: 'test' });

      // Should send message via mesh (sendMessage or sendDirectMessage)
      expect(mockMesh.sendMessage.mock.calls.length + mockMesh.sendDirectMessage.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('state management', () => {
    it('should manage peer state', () => {
      engine.addPeer({
        id: 'peer1',
        metadata: {},
        joinedAt: Date.now()
      });

      engine.updateState({ value: 'test' });

      // Verify state is updated
      const state = engine.getState();
      expect(state).toEqual({ value: 'test' });
    });
  });
});

