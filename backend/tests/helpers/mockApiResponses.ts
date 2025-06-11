export class MockAPIResponses {
  /**
   * Mock successful Fablo enrollment response
   */
  static enrollSuccess(token: string = "mock-jwt-token") {
    return {
      token,
    };
  }

  /**
   * Mock successful Fablo invoke response
   */
  static invokeSuccess(data: any) {
    return {
      response: data,
    };
  }

  /**
   * Mock successful Fablo query response
   */
  static querySuccess(data: any) {
    return {
      response: data,
    };
  }

  /**
   * Mock error response
   */
  static error(message: string, code: number = 400) {
    return {
      error: message,
      code,
    };
  }

  /**
   * Mock network discovery response
   */
  static discoverSuccess() {
    return {
      response: {
        peers: ["peer0.org1.example.com", "peer0.org2.example.com"],
        orderers: ["orderer.example.com"],
        channels: ["mychannel"],
      },
    };
  }

  /**
   * Mock identities response
   */
  static identitiesSuccess() {
    return {
      response: {
        caname: "ca-org1",
        identities: [
          {
            affiliation: "org1.department1",
            id: "admin",
            type: "client",
            attrs: [],
            max_enrollments: -1,
          },
          {
            affiliation: "org1.department1",
            id: "user1",
            type: "client",
            attrs: [],
            max_enrollments: 1,
          },
        ],
      },
    };
  }
}
