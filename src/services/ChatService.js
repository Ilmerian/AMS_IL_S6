import { ChatRepository } from '../repositories/ChatRepository';

export const ChatService = {
  listByRoom: (roomId, opts) => ChatRepository.listByRoom(roomId, opts),
  send: (roomId, content) => ChatRepository.send(roomId, content),
  subscribe: (roomId, cb) => ChatRepository.onNewMessage(roomId, cb),
};
