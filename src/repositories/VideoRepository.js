// src/repositories/VideoRepository.js
import { supabase } from '../lib/supabaseClient';
import { Video } from '../models/Video';

/**
 * Accès et gestion des vidéos
 */

export const VideoRepository = {
  async getOrCreate({ url, title }) {
    let { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('url', url)
      .maybeSingle();
    if (error) throw error;
    if (data) return Video.fromRow(data);

    const { data: created, error: e2 } = await supabase
      .from('videos')
      .insert({ url, title: title ?? '' })
      .select()
      .single();
    if (e2) throw e2;
    return Video.fromRow(created);
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return Video.fromRow(data);
  },

  async listByIds(ids = []) {
    const norm = []
    const seen = new Set()
    for (const raw of ids) {
      const n = Number(raw)
      if (!Number.isFinite(n)) continue
      if (seen.has(n)) continue
      seen.add(n)
      norm.push(n)
    }
    if (!norm.length) return []
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .in('id', norm);
    if (error) throw error;
    const byId = new Map((data || []).map((r) => [r.id, Video.fromRow(r)]));
    return norm.map((id) => byId.get(id)).filter(Boolean);
  },

  async list({ q } = {}) {
    let query = supabase.from('videos').select('*').order('id', { ascending: false });
    if (q) query = query.ilike('title', `%${q}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(Video.fromRow);
  },

  async searchYoutube(query) {
    const q = query?.trim()
    if (!q) return []

    try {
      console.log('[VideoRepository] Using fallback YouTube search for:', q)
      const videos = await VideoRepository.list({ q })
      return videos.slice(0, 10) // Limitation
    } catch (error) {
      console.error('[VideoRepository] Fallback search failed:', error)
      return []
    }
  },
};