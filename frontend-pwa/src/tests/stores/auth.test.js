
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../js/stores/auth';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initial state is correct', () => {
    const store = useAuthStore();
    expect(store.user).toBe(null);
    expect(store.token).toBe(null);
    expect(store.isAuthenticated).toBe(false);
  });

  it('setToken updates the token and isAuthenticated', () => {
    const store = useAuthStore();
    store.setToken('test-token');
    expect(store.token).toBe('test-token');
    expect(store.isAuthenticated).toBe(true);
  });

  it('setUser updates the user', () => {
    const store = useAuthStore();
    const user = { id: 1, name: 'Test User' };
    store.setUser(user);
    expect(store.user).toEqual(user);
  });

  it('logout resets the state', () => {
    const store = useAuthStore();
    store.setToken('test-token');
    store.setUser({ id: 1, name: 'Test User' });
    store.logout();
    expect(store.user).toBe(null);
    expect(store.token).toBe(null);
    expect(store.isAuthenticated).toBe(false);
  });
});
