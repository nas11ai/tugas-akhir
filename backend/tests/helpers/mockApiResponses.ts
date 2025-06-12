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
        peers: ["peer0.akademik.itk.ac.id"],
        orderers: [
          "orderer0.raft-group.orderer.itk.ac.id",
          "orderer1.raft-group.orderer.itk.ac.id",
          "orderer2.raft-group.orderer.itk.ac.id",
        ],
        channels: ["ijazah-channel"],
      },
    };
  }

  /**
   * Mock identities response
   */
  static identitiesSuccess() {
    return {
      response: {
        caname: "ca-akademik",
        identities: [
          {
            affiliation: "akademik",
            id: "admin",
            type: "client",
            attrs: [],
            max_enrollments: -1,
          },
          {
            affiliation: "akademik",
            id: "user1",
            type: "client",
            attrs: [],
            max_enrollments: -1,
          },
        ],
      },
    };
  }
}
