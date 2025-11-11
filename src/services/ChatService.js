import { ChatRepository } from '../repositories/ChatRepository';

export const ChatService = {
  listByRoom: (roomId, opts) => ChatRepository.listByRoom(roomId, opts),
  send: (roomId, content) => ChatRepository.send(roomId, content),
  remove: (messageId) => ChatRepository.remove(messageId),
  subscribe: (roomId, { onInsert, onDelete } = {}) => {
    const unsubs = [];
    if (onInsert) {
      unsubs.push(ChatRepository.onNewMessage(roomId, onInsert));
    }
    if (onDelete) {
      unsubs.push(ChatRepository.onDeleteMessage(roomId, onDelete));
    }
    return () => unsubs.forEach((off) => off?.());
  },
};
