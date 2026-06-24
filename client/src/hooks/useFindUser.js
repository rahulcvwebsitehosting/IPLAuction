import { useState, useEffect } from "react";
import { getCurrentUser } from "../services/auth.service";

const useFindUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No backend round-trip: the session is read straight from storage.
    setUser(getCurrentUser());
    setLoading(false);
  }, []);

  return [user, setUser, loading];
};

export default useFindUser;
