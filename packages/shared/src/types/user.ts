export type PlanTier = 'free' | 'basic' | 'premium';

export interface User {
  id: string;
  email: string;
  plan: PlanTier;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserNotificationSettings {
  id: string;
  userId: string;
  emailEnabled: boolean;
  emailAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// API request/response types
export interface CreateUserRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    hasSubscription?: boolean;
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: string | null;
  };
}
