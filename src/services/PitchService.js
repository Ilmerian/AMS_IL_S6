import { PitchRepository } from '../repositories/PitchRepository';
export const PitchService={list:()=>PitchRepository.list(),create:(p)=>PitchRepository.create(p)};
