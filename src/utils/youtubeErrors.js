// src/utils/youtubeErrors.js
/**
 * Gestion des erreurs liées à YouTube
 */

export const YOUTUBE_ERROR_CODES = {
  FATAL: [100, 101, 150],
  TRANSIENT: [2, 5],
  NETWORK: [5]
};

export const isFatalError = (errorCode) => YOUTUBE_ERROR_CODES.FATAL.includes(errorCode);
export const isTransientError = (errorCode) => YOUTUBE_ERROR_CODES.TRANSIENT.includes(errorCode);
export const isNetworkError = (errorCode) => YOUTUBE_ERROR_CODES.NETWORK.includes(errorCode);

export const getErrorMessage = (errorCode) => {
  const messages = {
    2: 'Invalid request parameter',
    5: 'Network error, check the connection',
    100: 'Video not found or deleted',
    101: 'The owner forbade embedding the video',
    150: 'The owner has forbidden embedding the video'
  };
  return messages[errorCode] || `Playback error (code: ${errorCode})`;
};