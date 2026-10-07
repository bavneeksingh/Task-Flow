import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setSessionEndedHandler, tokenStore } from "../api/client";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(Boolean(tokenStore.get()));
  const [bootError, setBootError] = useState(null);
  // Shown on the login page, e.g. "Your session has expired."
  const [notice, setNotice] = useState("");

  const endSession = useCallback((message = "") => {
    tokenStore.clear();
    setUser(null);
    setNotice(message);
  }, []);

  useEffect(() => {
    // Braces matter: an effect's return value is treated as its cleanup function.
    setSessionEndedHandler(endSession);
  }, [endSession]);

  const restore = useCallback(async () => {
    if (!tokenStore.get()) return setBooting(false);
    setBooting(true);
    setBootError(null);
    try {
      setUser(await api.me()); // proves the stored token is still valid
    } catch (e) {
      // A 401 already ended the session through the handler. Anything else (offline) is
      // surfaced so we don't log people out just because their wifi dropped.
      if (e.status !== 401) setBootError(e);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    restore();
  }, [restore]);

  const finishAuth = (res) => {
    tokenStore.set(res.access_token);
    setUser(res.user);
    setNotice("");
  };

  const value = useMemo(
    () => ({
      user,
      booting,
      bootError,
      notice,
      retryBoot: restore,
      login: async (b) => finishAuth(await api.login(b)),
      register: async (b) => finishAuth(await api.register(b)),
      logout: async () => {
        try {
          await api.logout(); // revoke the token server-side
        } catch {
          /* even if this fails (offline), always log out locally */
        }
        endSession("");
      },
    }),
    [user, booting, bootError, notice, restore, endSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
