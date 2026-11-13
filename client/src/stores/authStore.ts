import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('fireblade_token'),
  user: localStorage.getItem('fireblade_user') ? JSON.parse(localStorage.getItem('fireblade_user')!) : null,
  setAuth: (token, user) => {
    localStorage.setItem('fireblade_token', token);
    localStorage.setItem('fireblade_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('fireblade_token');
    localStorage.removeItem('fireblade_user');
    set({ token: null, user: null });
  },
}));
