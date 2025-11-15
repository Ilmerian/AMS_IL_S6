// src/services/ChatService.js
import { ChatRepository } from '../repositories/ChatRepository';

export const ChatService = {
  listByRoom: (roomId, opts) => ChatRepository.listByRoom(roomId, opts),
  send: (roomId, content) => ChatRepository.send(roomId, content),
  remove: (messageId) => ChatRepository.remove(messageId),
  subscribe: (roomId, { onInsert, onDelete } = {}) => {
  const unsubs = [];
    if (typeof onInsert === 'function') {
      unsubs.push(ChatRepository.onNewMessage(roomId, onInsert));
    }
    if (typeof onDelete === 'function') {
      unsubs.push(ChatRepository.onDeleteMessage(roomId, onDelete));
    }
    return () => {
      for (const off of unsubs) {
        try {
          off?.();
        } catch (e) {
          console.warn('[ChatService.subscribe] unsubscribe failed:', e?.message || e);
        }
      }
    };
  },
};
