// The preview runs on an in-memory stand-in, so the real Supabase client isn't bundled.
export function createClient() { throw new Error("Supabase is not part of the preview"); }
