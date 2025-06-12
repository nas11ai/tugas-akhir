/**
 * Mock User Service for testing
 */
export class MockUserService {
  private mockUsers: Map<string, any> = new Map();

  async createUser(userData: any): Promise<any> {
    const user = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mockUsers.set(userData.uid, user);
    return user;
  }

  async getUserById(uid: string): Promise<any> {
    return this.mockUsers.get(uid) || null;
  }

  async getUserWithCredentials(uid: string): Promise<any> {
    const user = this.mockUsers.get(uid);
    if (user) {
      return {
        ...user,
        credentials: {
          username: `test${uid}`,
          password: "testpass",
          accessToken: "mock-token",
          tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      };
    }
    return null;
  }

  async updateUser(uid: string, updateData: any): Promise<any> {
    const user = this.mockUsers.get(uid);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser = {
      ...user,
      ...updateData,
      updatedAt: new Date(),
    };

    this.mockUsers.set(uid, updatedUser);
    return updatedUser;
  }

  async setUserCredentials(uid: string, credentials: any): Promise<void> {
    const user = this.mockUsers.get(uid);
    if (!user) {
      throw new Error("User not found");
    }

    user.credentials = credentials;
    user.updatedAt = new Date();
  }

  async removeUserCredentials(uid: string): Promise<void> {
    const user = this.mockUsers.get(uid);
    if (user) {
      delete user.credentials;
      user.updatedAt = new Date();
    }
  }

  // Helper methods for testing
  addMockUser(uid: string, userData: any): void {
    this.mockUsers.set(uid, userData);
  }

  clearMockUsers(): void {
    this.mockUsers.clear();
  }
}

export const mockUserService = new MockUserService();
