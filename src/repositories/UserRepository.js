import { supabase } from '../lib/supabaseClient';
import { User } from '../models/User';
export const UserRepository={
    async getById(id){
        const {data,error}=await supabase.
        from('users').
        select('*').
        eq('id',id).
        single();
        if(error) throw error;
        return User.fromRow(data);
    }
};
