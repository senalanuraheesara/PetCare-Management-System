import React, { createContext, useState, useEffect } from 'react';
import { setAuthToken } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check async storage for token when app starts
    setIsLoading(false);
  }, []);

  const login = (token, role, name, email) => {
    setUserToken(token);
    setUserRole(role);
    setUserName(name);
    setUserEmail(email);
    setAuthToken(token);
    // save token and role to async storage
  };

  const logout = () => {
    setUserToken(null);
    setUserRole(null);
    setUserName(null);
    setUserEmail(null);
    setAuthToken(null);
    // remove token and role from async storage
  };

  return (
    <AuthContext.Provider value={{ userToken, userRole, userName, userEmail, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
