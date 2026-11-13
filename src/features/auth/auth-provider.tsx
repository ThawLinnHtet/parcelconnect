import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';

import type { Actor, Role } from '@/features/deliveries/types';
import { getSupabaseClient, supabaseConfiguration } from '@/lib/supabase/client';

import { runBeforeSignOut } from './session-lifecycle';
import { notifyForeground } from './foreground-events';
import { prepareSessionChange, sessionScope } from './session-scope';

type AuthStatus = 'unconfigured' | 'loading' | 'signedOut' | 'signedIn' | 'error';
type AuthState = { status: AuthStatus; session: Session | null; user: User | null; actor: Actor | null; roles: Role[]; error: string | null };
type AuthContextValue = AuthState & {
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => Promise<void>;
  selectRole: (role: Role) => void;
};
const initial: AuthState = { status: supabaseConfiguration.status === 'ready' ? 'loading' : 'unconfigured', session: null, user: null, actor: null, roles: [], error: supabaseConfiguration.status === 'ready' ? null : supabaseConfiguration.message };
const AuthContext = createContext<AuthContextValue | null>(null);
const message = (error: unknown) => error instanceof Error ? error.message : 'The account request failed. Please try again.';

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>(initial);
  const generation = useRef(0);
  const mounted = useRef(true);
  const currentUserId = useRef<string | null>(null);
  const loadSession = useCallback(async (session: Session | null, request: number) => {
    if (!mounted.current || request !== generation.current) return;
    if (!session) {
      currentUserId.current = null; sessionScope.setIdentity(null);
      setState({ ...initial, status: 'signedOut', error: null });
      return;
    }
    try {
      const client = getSupabaseClient();
      const { data: userData, error: userError } = await client.auth.getUser(session.access_token);
      if (userError || !userData.user) throw userError ?? new Error('This session is no longer valid. Sign in again.');
      const { data: profile, error: profileError } = await client.from('profiles').select('id,display_name,is_rider').eq('id', userData.user.id).single();
      if (profileError || !profile) throw profileError ?? new Error('Your account profile is not available. Please try again.');
      if (!mounted.current || request !== generation.current) return;
      const roles: Role[] = profile.is_rider === true ? ['rider', 'sender', 'recipient', 'receiver'] : ['sender', 'recipient', 'receiver'];
      currentUserId.current = userData.user.id;
      sessionScope.setIdentity(userData.user.id);
      setState(previous => ({ status: 'signedIn', session, user: userData.user,
        actor: { id: userData.user.id, role: previous.actor?.id === userData.user.id && roles.includes(previous.actor.role) ? previous.actor.role : roles[0] }, roles, error: null }));
    } catch (error) {
      if (!mounted.current || request !== generation.current) return;
      currentUserId.current = null; sessionScope.setIdentity(null);
      setState({ ...initial, status: 'error', error: message(error) });
    }
  }, []);
  const retry = useCallback(async () => {
    if (supabaseConfiguration.status !== 'ready') return;
    const request = ++generation.current;
    setState(previous => ({ ...previous, status: 'loading', error: null }));
    try {
      const { data, error } = await getSupabaseClient().auth.getSession();
      if (error) throw error;
      await loadSession(data.session, request);
    } catch (error) {
      if (!mounted.current || request !== generation.current) return;
      currentUserId.current = null; sessionScope.setIdentity(null);
      setState({ ...initial, status: 'error', error: message(error) });
    }
  }, [loadSession]);

  useEffect(() => {
    mounted.current = true;
    if (supabaseConfiguration.status !== 'ready') return;
    const client = getSupabaseClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      const request = ++generation.current;
      // Account changes hide old data immediately, before deferred SDK work.
      if (session?.user.id !== state.user?.id) currentUserId.current = null; sessionScope.setIdentity(null);
      setState(previous => previous.user?.id === session?.user.id && session
        ? previous : { ...initial, status: 'loading', error: null });
      clearTimeout(timer);
      timer = setTimeout(() => { void loadSession(session, request); }, 0);
    });
    const lifecycle = AppState.addEventListener('change', next => {
      if (next === 'active') { client.auth.startAutoRefresh(); notifyForeground(); void retry(); }
      else client.auth.stopAutoRefresh();
    });
    if (Platform.OS === 'web' || AppState.currentState === 'active') client.auth.startAutoRefresh();
    void retry();
    return () => {
      mounted.current = false; generation.current += 1; clearTimeout(timer);
      subscription.unsubscribe(); lifecycle.remove(); client.auth.stopAutoRefresh(); sessionScope.setIdentity(null);
    };
  }, [loadSession, retry]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    await retry();
  }, [retry]);
  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await getSupabaseClient().auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() } } });
    if (error) throw error;
    if (!data.session) throw new Error('This project requires email confirmation. Disable Confirm Email for portfolio signup, then sign in with a configured demo account.');
    await retry();
  }, [retry]);
  const signOut = useCallback(async () => {
    const { data, error: sessionError } = await getSupabaseClient().auth.getSession();
    if (sessionError) throw sessionError;
    if (data.session) await runBeforeSignOut(data.session.user.id);
    ++generation.current; currentUserId.current = null; sessionScope.setIdentity(null);
    setState({ ...initial, status: 'loading', error: null });
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) { setState({ ...initial, status: 'error', error: message(error) }); throw error; }
    setState({ ...initial, status: 'signedOut', error: null });
  }, []);
  const selectRole = useCallback((role: Role) => {
    setState(previous => previous.actor && previous.roles.includes(role)
      ? { ...previous, actor: { id: previous.actor.id, role } } : previous);
  }, []);
  return <AuthContext.Provider value={{ ...state, configured: supabaseConfiguration.status === 'ready', signIn, signUp, signOut, retry, selectRole }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
