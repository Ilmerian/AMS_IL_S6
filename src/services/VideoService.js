import { VideoRepository } from '../repositories/VideoRepository'

export const VideoService = {
  getOrCreate: ({ url, title }) => VideoRepository.getOrCreate({ url, title }),
  getById: (id) => VideoRepository.getById(id),
  list: (opts) => VideoRepository.list(opts),
}
