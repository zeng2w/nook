import { readonly, ref } from 'vue';
import axios from 'axios';

const STORAGE_KEY = 'current_user';

const readStoredUser = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const authUserState = ref(readStoredUser());
let sessionVerified = false;
let hydratePromise = null;

export const authUser = readonly(authUserState);

export const setAuthUser = (user) => {
  authUserState.value = user || null;
  sessionVerified = Boolean(user);
  if (user) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else sessionStorage.removeItem(STORAGE_KEY);
};

export const clearAuthUser = () => setAuthUser(null);
export const getAuthUser = () => authUserState.value;
export const getAuthUserId = () => authUserState.value?.id || null;

export const hydrateAuth = async ({ force = false } = {}) => {
  if (sessionVerified && !force) return authUserState.value;
  if (hydratePromise) return hydratePromise;

  hydratePromise = axios.get('/api/auth/me')
    .then(response => {
      setAuthUser(response.data.user);
      return authUserState.value;
    })
    .catch(() => {
      clearAuthUser();
      return null;
    })
    .finally(() => {
      hydratePromise = null;
    });

  return hydratePromise;
};
