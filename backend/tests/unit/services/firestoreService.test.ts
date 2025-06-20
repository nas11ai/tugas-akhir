import { FirestoreService } from "../../../src/services/firestoreService";
import { db } from "../../../src/configs/firebase";
import { logger } from "../../../src/utils/logger";

// Mock dependencies
jest.mock("../../../src/configs/firebase", () => ({
  db: {
    collection: jest.fn(),
    batch: jest.fn(),
    runTransaction: jest.fn(),
  },
  auth: jest.fn(),
}));

jest.mock("../../../src/utils/logger");

jest.mock("firebase-admin", () => {
  // Create the mock Timestamp object directly in the mock
  const mockTimestamp = {
    fromDate: jest.fn(),
  };

  const firestore = jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: jest.fn(),
        get: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        exists: true,
        data: jest.fn(),
        id: "mock-id",
      }),
      add: jest.fn(),
      get: jest.fn(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnValue({ get: jest.fn() }),
    }),
    batch: jest.fn().mockReturnValue({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(),
    }),
    runTransaction: jest.fn((fn) => fn(jest.fn())),
  });

  const auth = jest.fn();
  const credential = { cert: jest.fn() };

  return {
    initializeApp: jest.fn(),
    firestore: Object.assign(firestore, {
      Timestamp: mockTimestamp,
    }),
    auth,
    credential,
  };
});

const mockDb = db as jest.Mocked<typeof db>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Get access to the mock Timestamp for tests
const mockTimestamp = jest.requireMock('firebase-admin').firestore.Timestamp;

describe("FirestoreService", () => {
  let firestoreService: FirestoreService;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockBatch: any;
  let mockTransaction: any;

  beforeEach(() => {
    firestoreService = new FirestoreService();

    // Mock Firestore objects
    mockDoc = {
      set: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      exists: false,
      data: jest.fn(),
      id: "test-id",
    };

    mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis(),
      get: jest.fn(),
      count: jest.fn().mockReturnValue({ get: jest.fn() }),
    };

    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      add: jest.fn(),
      get: jest.fn(),
      where: jest.fn().mockReturnValue(mockQuery),
      orderBy: jest.fn().mockReturnValue(mockQuery),
      limit: jest.fn().mockReturnValue(mockQuery),
    };

    mockBatch = {
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(),
    };

    mockTransaction = jest.fn();

    mockDb.collection.mockReturnValue(mockCollection);
    mockDb.batch.mockReturnValue(mockBatch);
    mockDb.runTransaction.mockImplementation((fn) => fn(mockTransaction));

    jest.clearAllMocks();
  });

  describe("createDocument", () => {
    it("should create document successfully", async () => {
      // Arrange
      const collection = "test-collection";
      const docId = "test-doc-id";
      const data = { name: "Test Document" };

      mockDoc.set.mockResolvedValue();

      // Act
      await firestoreService.createDocument(collection, docId, data);

      // Assert
      expect(mockDb.collection).toHaveBeenCalledWith(collection);
      expect(mockCollection.doc).toHaveBeenCalledWith(docId);
      expect(mockDoc.set).toHaveBeenCalledWith(data);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Document created in ${collection}/${docId}`
      );
    });

    it("should handle creation error", async () => {
      // Arrange
      const collection = "test-collection";
      const docId = "test-doc-id";
      const data = { name: "Test Document" };
      const error = new Error("Creation failed");

      mockDoc.set.mockRejectedValue(error);

      // Act & Assert
      await expect(
        firestoreService.createDocument(collection, docId, data)
      ).rejects.toThrow("Creation failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error creating document in ${collection}/${docId}:`,
        error
      );
    });
  });

  describe("getDocument", () => {
    it("should get document successfully", async () => {
      // Arrange
      const collection = "test-collection";
      const docId = "test-doc-id";
      const mockDocData = { name: "Test Document" };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: docId,
        data: () => mockDocData,
      });

      // Act
      const result = await firestoreService.getDocument(collection, docId);

      // Assert
      expect(result).toEqual({
        id: docId,
        name: "Test Document",
      });
      expect(mockDb.collection).toHaveBeenCalledWith(collection);
      expect(mockCollection.doc).toHaveBeenCalledWith(docId);
    });

    it("should return null when document does not exist", async () => {
      // Arrange
      const collection = "test-collection";
      const docId = "non-existent-doc";

      mockDoc.get.mockResolvedValue({
        exists: false,
      });

      // Act
      const result = await firestoreService.getDocument(collection, docId);

      // Assert
      expect(result).toBeNull();
    });

    it("should handle get document error", async () => {
      // Arrange
      const collection = "test-collection";
      const docId = "test-doc-id";
      const error = new Error("Get failed");

      mockDoc.get.mockRejectedValue(error);

      // Act & Assert
      await expect(
        firestoreService.getDocument(collection, docId)
      ).rejects.toThrow("Get failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error getting document from ${collection}/${docId}:`,
        error
      );
    });
  });

  describe("updateDocument", () => {
    it("should update document successfully", async () => {
      // Arrange
      const collection = "test-collection";
      const docId = "test-doc-id";
      const data = { name: "Updated Document" };

      mockDoc.update.mockResolvedValue();

      // Act
      await firestoreService.updateDocument(collection, docId, data);

      // Assert
      expect(mockDb.collection).toHaveBeenCalledWith(collection);
      expect(mockCollection.doc).toHaveBeenCalledWith(docId);
      expect(mockDoc.update).toHaveBeenCalledWith(data);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Document updated in ${collection}/${docId}`
      );
    });

    it("should handle update error", async () => {
      // Arrange
      const collection = "test-collection";
      const docId = "test-doc-id";
      const data = { name: "Updated Document" };
      const error = new Error("Update failed");

      mockDoc.update.mockRejectedValue(error);

      // Act & Assert
      await expect(
        firestoreService.updateDocument(collection, docId, data)
      ).rejects.toThrow("Update failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error updating document in ${collection}/${docId}:`,
        error
      );
    });
  });

  describe("deleteDocument", () => {
    it("should delete document successfully", async () => {
      // Arrange
      const collection = "test-collection";
      const docId = "test-doc-id";

      mockDoc.delete.mockResolvedValue();

      // Act
      await firestoreService.deleteDocument(collection, docId);

      // Assert
      expect(mockDb.collection).toHaveBeenCalledWith(collection);
      expect(mockCollection.doc).toHaveBeenCalledWith(docId);
      expect(mockDoc.delete).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Document deleted from ${collection}/${docId}`
      );
    });

    it("should handle delete error", async () => {
      // Arrange
      const collection = "test-collection";
      const docId = "test-doc-id";
      const error = new Error("Delete failed");

      mockDoc.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(
        firestoreService.deleteDocument(collection, docId)
      ).rejects.toThrow("Delete failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error deleting document from ${collection}/${docId}:`,
        error
      );
    });
  });

  describe("getAllDocuments", () => {
    it("should get all documents successfully", async () => {
      // Arrange
      const collection = "test-collection";
      const mockDocs = [
        { id: "doc1", data: () => ({ name: "Doc 1" }) },
        { id: "doc2", data: () => ({ name: "Doc 2" }) },
      ];

      mockCollection.get.mockResolvedValue({
        forEach: (callback: any) => mockDocs.forEach(callback),
      });

      // Act
      const result = await firestoreService.getAllDocuments(collection);

      // Assert
      expect(result).toEqual([
        { id: "doc1", name: "Doc 1" },
        { id: "doc2", name: "Doc 2" },
      ]);
      expect(mockDb.collection).toHaveBeenCalledWith(collection);
      expect(mockCollection.get).toHaveBeenCalled();
    });

    it("should handle get all documents error", async () => {
      // Arrange
      const collection = "test-collection";
      const error = new Error("Get all failed");

      mockCollection.get.mockRejectedValue(error);

      // Act & Assert
      await expect(
        firestoreService.getAllDocuments(collection)
      ).rejects.toThrow("Get all failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error getting all documents from ${collection}:`,
        error
      );
    });
  });

  describe("documentExists", () => {
    it("should return true when document exists", async () => {
      // Arrange
      const collection = "test-collection";
      const docId = "existing-doc";

      mockDoc.get.mockResolvedValue({
        exists: true,
      });

      // Act
      const result = await firestoreService.documentExists(collection, docId);

      // Assert
      expect(result).toBe(true);
      expect(mockDb.collection).toHaveBeenCalledWith(collection);
      expect(mockCollection.doc).toHaveBeenCalledWith(docId);
    });

    it("should return false when document does not exist", async () => {
      // Arrange
      const collection = "test-collection";
      const docId = "non-existent-doc";

      mockDoc.get.mockResolvedValue({
        exists: false,
      });

      // Act
      const result = await firestoreService.documentExists(collection, docId);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      // Arrange
      const collection = "test-collection";
      const docId = "test-doc";
      const error = new Error("Check failed");

      mockDoc.get.mockRejectedValue(error);

      // Act
      const result = await firestoreService.documentExists(collection, docId);

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error checking document existence in ${collection}/${docId}:`,
        error
      );
    });
  });

  describe("batchWrite", () => {
    it("should perform batch write operations successfully", async () => {
      // Arrange
      const operations = [
        {
          operation: "create" as const,
          collection: "users",
          docId: "user1",
          data: { name: "User 1" },
        },
        {
          operation: "update" as const,
          collection: "users",
          docId: "user2",
          data: { name: "Updated User 2" },
        },
        {
          operation: "delete" as const,
          collection: "users",
          docId: "user3",
        },
      ];

      mockBatch.commit.mockResolvedValue();

      // Act
      await firestoreService.batchWrite(operations);

      // Assert
      expect(mockDb.batch).toHaveBeenCalled();
      expect(mockBatch.set).toHaveBeenCalled();
      expect(mockBatch.update).toHaveBeenCalled();
      expect(mockBatch.delete).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Batch write completed with ${operations.length} operations`
      );
    });

    it("should handle batch write error", async () => {
      // Arrange
      const operations = [
        {
          operation: "create" as const,
          collection: "users",
          docId: "user1",
          data: { name: "User 1" },
        },
      ];
      const error = new Error("Batch failed");

      mockBatch.commit.mockRejectedValue(error);

      // Act & Assert
      await expect(firestoreService.batchWrite(operations)).rejects.toThrow(
        "Batch failed"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error in batch write:",
        error
      );
    });
  });

  describe("runTransaction", () => {
    it("should run transaction successfully", async () => {
      // Arrange
      const updateFunction = jest.fn().mockResolvedValue("transaction result");
      mockDb.runTransaction.mockImplementation((fn) => fn(mockTransaction));

      // Act
      const result = await firestoreService.runTransaction(updateFunction);

      // Assert
      expect(mockDb.runTransaction).toHaveBeenCalledWith(updateFunction);
      expect(updateFunction).toHaveBeenCalledWith(mockTransaction);
    });

    it("should handle transaction error", async () => {
      // Arrange
      const updateFunction = jest
        .fn()
        .mockRejectedValue(new Error("Transaction failed"));
      const error = new Error("Transaction failed");
      mockDb.runTransaction.mockRejectedValue(error);

      // Act & Assert
      await expect(
        firestoreService.runTransaction(updateFunction)
      ).rejects.toThrow("Transaction failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error running transaction:",
        error
      );
    });
  });

  describe("addDocument", () => {
    it("should add document with auto-generated ID successfully", async () => {
      // Arrange
      const collection = "test-collection";
      const data = { name: "New Document" };
      const generatedId = "auto-generated-id";

      mockCollection.add.mockResolvedValue({
        id: generatedId,
      });

      // Act
      const result = await firestoreService.addDocument(collection, data);

      // Assert
      expect(result).toBe(generatedId);
      expect(mockDb.collection).toHaveBeenCalledWith(collection);
      expect(mockCollection.add).toHaveBeenCalledWith(data);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Document added to ${collection} with ID: ${generatedId}`
      );
    });

    it("should handle add document error", async () => {
      // Arrange
      const collection = "test-collection";
      const data = { name: "New Document" };
      const error = new Error("Add failed");

      mockCollection.add.mockRejectedValue(error);

      // Act & Assert
      await expect(
        firestoreService.addDocument(collection, data)
      ).rejects.toThrow("Add failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error adding document to ${collection}:`,
        error
      );
    });
  });

  describe("healthCheck", () => {
    it("should return true when Firestore is healthy", async () => {
      // Arrange
      mockCollection.limit.mockReturnValue({
        get: jest.fn().mockResolvedValue({}),
      });

      // Act
      const result = await firestoreService.healthCheck();

      // Assert
      expect(result).toBe(true);
      expect(mockDb.collection).toHaveBeenCalledWith("_health_check");
    });

    it("should return false when Firestore is unhealthy", async () => {
      // Arrange
      const error = new Error("Connection failed");
      mockCollection.limit.mockReturnValue({
        get: jest.fn().mockRejectedValue(error),
      });

      // Act
      const result = await firestoreService.healthCheck();

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Firestore health check failed:",
        error
      );
    });
  });

  describe("getFirestore", () => {
    it("should return Firestore instance", () => {
      // Act
      const result = firestoreService.getFirestore();

      // Assert
      expect(result).toBe(mockDb);
    });
  });

  describe("queryDocuments", () => {
    it("should query documents with filters successfully", async () => {
      // Arrange
      const collection = "test-collection";
      const filters = [
        { field: "status", operator: "==" as any, value: "active" },
        { field: "age", operator: ">=" as any, value: 18 }
      ];
      const orderBy = { field: "createdAt", direction: "desc" as const };
      const limit = 10;

      const mockDocs = [
        { id: "doc1", data: () => ({ name: "Doc 1", status: "active" }) },
        { id: "doc2", data: () => ({ name: "Doc 2", status: "active" }) },
      ];

      const mockSnapshot = {
        forEach: (callback: any) => mockDocs.forEach(callback),
      };

      // Create a proper mock query chain that returns itself and has get method
      const mockQueryChain = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      } as any;

      // Mock the collection to return the query chain
      mockDb.collection.mockReturnValue(mockQueryChain);

      // Act
      const result = await firestoreService.queryDocuments(
        collection,
        filters,
        orderBy,
        limit
      );

      // Assert
      expect(result).toEqual([
        { id: "doc1", name: "Doc 1", status: "active" },
        { id: "doc2", name: "Doc 2", status: "active" },
      ]);
      expect(mockDb.collection).toHaveBeenCalledWith(collection);
      expect(mockQueryChain.where).toHaveBeenCalledWith("status", "==", "active");
      expect(mockQueryChain.where).toHaveBeenCalledWith("age", ">=", 18);
      expect(mockQueryChain.orderBy).toHaveBeenCalledWith("createdAt", "desc");
      expect(mockQueryChain.limit).toHaveBeenCalledWith(10);
      expect(mockQueryChain.get).toHaveBeenCalled();
    });

    it("should query documents without filters and ordering", async () => {
      // Arrange
      const collection = "test-collection";
      const mockDocs = [
        { id: "doc1", data: () => ({ name: "Doc 1" }) },
      ];

      const mockSnapshot = {
        forEach: (callback: any) => mockDocs.forEach(callback),
      };

      const mockQueryChain = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      } as any;

      mockDb.collection.mockReturnValue(mockQueryChain);

      // Act
      const result = await firestoreService.queryDocuments(collection);

      // Assert
      expect(result).toEqual([{ id: "doc1", name: "Doc 1" }]);
      expect(mockDb.collection).toHaveBeenCalledWith(collection);
      expect(mockQueryChain.where).not.toHaveBeenCalled();
      expect(mockQueryChain.orderBy).not.toHaveBeenCalled();
      expect(mockQueryChain.limit).not.toHaveBeenCalled();
      expect(mockQueryChain.get).toHaveBeenCalled();
    });

    it("should query documents with only filters", async () => {
      // Arrange
      const collection = "test-collection";
      const filters = [
        { field: "status", operator: "==" as any, value: "active" }
      ];

      const mockDocs = [
        { id: "doc1", data: () => ({ name: "Doc 1", status: "active" }) },
      ];

      const mockSnapshot = {
        forEach: (callback: any) => mockDocs.forEach(callback),
      };

      const mockQueryChain = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      } as any;

      mockDb.collection.mockReturnValue(mockQueryChain);

      // Act
      const result = await firestoreService.queryDocuments(collection, filters);

      // Assert
      expect(result).toEqual([{ id: "doc1", name: "Doc 1", status: "active" }]);
      expect(mockDb.collection).toHaveBeenCalledWith(collection);
      expect(mockQueryChain.where).toHaveBeenCalledWith("status", "==", "active");
      expect(mockQueryChain.orderBy).not.toHaveBeenCalled();
      expect(mockQueryChain.limit).not.toHaveBeenCalled();
    });

    it("should query documents with only orderBy", async () => {
      // Arrange
      const collection = "test-collection";
      const orderBy = { field: "name", direction: "asc" as const };

      const mockDocs = [
        { id: "doc1", data: () => ({ name: "Doc 1" }) },
      ];

      const mockSnapshot = {
        forEach: (callback: any) => mockDocs.forEach(callback),
      };

      const mockQueryChain = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      } as any;

      mockDb.collection.mockReturnValue(mockQueryChain);

      // Act
      const result = await firestoreService.queryDocuments(collection, [], orderBy);

      // Assert
      expect(result).toEqual([{ id: "doc1", name: "Doc 1" }]);
      expect(mockQueryChain.orderBy).toHaveBeenCalledWith("name", "asc");
      expect(mockQueryChain.where).not.toHaveBeenCalled();
      expect(mockQueryChain.limit).not.toHaveBeenCalled();
    });

    it("should query documents with only limit", async () => {
      // Arrange
      const collection = "test-collection";
      const limit = 5;

      const mockDocs = [
        { id: "doc1", data: () => ({ name: "Doc 1" }) },
      ];

      const mockSnapshot = {
        forEach: (callback: any) => mockDocs.forEach(callback),
      };

      const mockQueryChain = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      } as any;

      mockDb.collection.mockReturnValue(mockQueryChain);

      // Act
      const result = await firestoreService.queryDocuments(collection, [], undefined, limit);

      // Assert
      expect(result).toEqual([{ id: "doc1", name: "Doc 1" }]);
      expect(mockQueryChain.limit).toHaveBeenCalledWith(5);
      expect(mockQueryChain.where).not.toHaveBeenCalled();
      expect(mockQueryChain.orderBy).not.toHaveBeenCalled();
    });

    it("should handle query documents error", async () => {
      // Arrange
      const collection = "test-collection";
      const error = new Error("Query failed");

      const mockQueryChain = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockRejectedValue(error),
      } as any;

      mockDb.collection.mockReturnValue(mockQueryChain);

      // Act & Assert
      await expect(
        firestoreService.queryDocuments(collection)
      ).rejects.toThrow("Query failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error querying documents from ${collection}:`,
        error
      );
    });
  });

  describe("convertToTimestamp", () => {
    it("should convert Date to Firestore Timestamp", () => {
      // Arrange
      const testDate = new Date("2023-01-01T00:00:00Z");
      const expectedTimestamp = { seconds: 1672531200, nanoseconds: 0 };

      // Mock the fromDate function to return our expected result
      mockTimestamp.fromDate.mockReturnValue(expectedTimestamp);

      // Act
      const result = firestoreService.convertToTimestamp(testDate);

      // Assert
      expect(mockTimestamp.fromDate).toHaveBeenCalledWith(testDate);
      expect(result).toBe(expectedTimestamp);
    });
  });
});