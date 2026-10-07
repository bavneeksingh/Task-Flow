import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setSessionEndedHandler, tokenStore } from "../api/client";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState(null);
  const [notice, setNotice] = useState(""); // e.g. "Your session has expired..."

  const endSession = useCallback(async (message = "") => {
    await tokenStore.clear();
    setUser(null);
    setNotice(message);
  }, []);

  useEffect(() => {
    // Braces matter: an effect's return value is treated as its cleanup function.
    setSessionEndedHandler(endSession);
  }, [endSession]);

  const restore = useCallback(async () => {
    setBooting(true);
    setBootError(null);
    try {
      if (await tokenStore.get()) setUser(await api.me());
    } catch (e) {
      // 401 already ended the session via the handler. Offline must NOT log people out.
      if (e.status !== 401) setBootError(e);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    restore();
  }, [restore]);

  const finishAuth = async (res) => {
    await tokenStore.set(res.access_token);
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
          await api.logout(); // revoke server-side
        } catch {
          /* always log out locally, even offline */
        }
        await endSession("");
      },
    }),
    [user, booting, bootError, notice, restore, endSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
