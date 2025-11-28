import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

// Types
interface User {
  email: string;
  name: string;
  picture?: string;
  domain?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

// Auth Context
const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Decode JWT token
const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkExistingAuth = () => {
      try {
        const savedUser = sessionStorage.getItem('eagle-auth-user');
        const authExpiry = sessionStorage.getItem('eagle-auth-expiry');
        
        if (savedUser && authExpiry) {
          const expiryTime = parseInt(authExpiry);
          if (Date.now() < expiryTime) {
            setUser(JSON.parse(savedUser));
          } else {
            sessionStorage.removeItem('eagle-auth-user');
            sessionStorage.removeItem('eagle-auth-expiry');
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    const expiryTime = Date.now() + (8 * 60 * 60 * 1000); // 8 hours
    sessionStorage.setItem('eagle-auth-user', JSON.stringify(userData));
    sessionStorage.setItem('eagle-auth-expiry', expiryTime.toString());
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('eagle-auth-user');
    sessionStorage.removeItem('eagle-auth-expiry');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Google Login Component
export function GoogleAuthLogin() {
  const { login } = useAuth();
  
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const allowedDomain = import.meta.env.VITE_ALLOWED_DOMAIN || '47eagle.com';

  const handleSuccess = (response: any) => {
    try {
      const payload = decodeJWT(response.credential);
      
      if (!payload) {
        throw new Error('Failed to decode authentication token');
      }

      // Check domain restriction
      if (payload.hd !== allowedDomain) {
        alert(`Access denied: Only @${allowedDomain} email addresses are allowed`);
        return;
      }

      const userData: User = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        domain: payload.hd
      };

      login(userData);
    } catch (error) {
      console.error('Login processing error:', error);
      alert('Login failed. Please try again.');
    }
  };

  const handleError = () => {
    console.error('Google login failed');
    alert('Google login failed. Please check your connection and try again.');
  };

  if (!clientId) {
    return (
      <div className="text-center p-8 bg-red-500/10 rounded-2xl border border-red-500/30">
        <h3 className="text-xl font-semibold text-red-400 mb-2">Configuration Error</h3>
        <p className="text-gray-400">Google OAuth client ID is not configured.</p>
        <p className="text-gray-500 text-sm mt-2">Add VITE_GOOGLE_CLIENT_ID to .env</p>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="google-login-wrapper flex justify-center">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          theme="filled_black"
          size="large"
          text="signin_with"
          shape="rectangular"
          width="320"
        />
      </div>
    </GoogleOAuthProvider>
  );
}

