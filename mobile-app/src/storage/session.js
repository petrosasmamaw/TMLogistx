import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'tmlogistx_token';
const USER_KEY = 'tmlogistx_user';

export async function loadSession() {
  const [token, userJson] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(USER_KEY)
  ]);
  if (!token || !userJson) {
    return { token: null, user: null };
  }
  try {
    return { token, user: JSON.parse(userJson) };
  } catch {
    await clearSession();
    return { token: null, user: null };
  }
}

export async function saveSession(token, user) {
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, token),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user))
  ]);
}

export async function clearSession() {
  await Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
}
