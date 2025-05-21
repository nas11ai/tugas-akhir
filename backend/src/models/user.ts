export enum Organization {
  AKADEMIK = "akademik",
  REKTOR = "rektor",
}

export enum Role {
  ADMIN = "admin",
  USER = "user",
}

export interface UserCredentials {
  certificate: string;
  privateKey: string;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: Role;
  organization: Organization;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface UserWithCredentials extends User {
  credentials: UserCredentials;
}

export interface FirestoreUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: Role;
  organization: Organization;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  isActive: boolean;
  credentials?: UserCredentials;
}
