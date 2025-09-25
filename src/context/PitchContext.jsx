import {createContext,useContext} from 'react';
export const PitchContext=createContext(null);
export const usePitch=()=>useContext(PitchContext);
