import { db } from "../config/firebase";
import { logger } from "../utils/logger";
import * as admin from "firebase-admin";

/**
 * Query filter interface for Firestore queries
 */
export interface QueryFilter {
  field: string;
  operator: FirebaseFirestore.WhereFilterOp;
  value: any;
}

/**
 * Firestore Database Service
 */
export class FirestoreService {
  /**
   * Create a new document in Firestore
   */
  async createDocument(
    collection: string,
    docId: string,
    data: any
  ): Promise<void> {
    try {
      await db.collection(collection).doc(docId).set(data);
      logger.info(`Document created in ${collection}/${docId}`);
    } catch (error) {
      logger.error(`Error creating document in ${collection}/${docId}:`, error);
      throw error;
    }
  }

  /**
   * Get a document from Firestore
   */
  async getDocument(collection: string, docId: string): Promise<any | null> {
    try {
      const doc = await db.collection(collection).doc(docId).get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      logger.error(
        `Error getting document from ${collection}/${docId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Update a document in Firestore
   */
  async updateDocument(
    collection: string,
    docId: string,
    data: any
  ): Promise<void> {
    try {
      await db.collection(collection).doc(docId).update(data);
      logger.info(`Document updated in ${collection}/${docId}`);
    } catch (error) {
      logger.error(`Error updating document in ${collection}/${docId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document from Firestore
   */
  async deleteDocument(collection: string, docId: string): Promise<void> {
    try {
      await db.collection(collection).doc(docId).delete();
      logger.info(`Document deleted from ${collection}/${docId}`);
    } catch (error) {
      logger.error(
        `Error deleting document from ${collection}/${docId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Query documents from Firestore with filters
   */
  async queryDocuments(
    collection: string,
    filters: QueryFilter[] = [],
    orderBy?: { field: string; direction: "asc" | "desc" },
    limit?: number
  ): Promise<any[]> {
    try {
      let query: FirebaseFirestore.Query = db.collection(collection);

      // Apply filters
      for (const filter of filters) {
        query = query.where(filter.field, filter.operator, filter.value);
      }

      // Apply ordering
      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction);
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();

      const documents: any[] | PromiseLike<any[]> = [];
      snapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });

      return documents;
    } catch (error) {
      logger.error(`Error querying documents from ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Get all documents from a collection
   */
  async getAllDocuments(collection: string): Promise<any[]> {
    try {
      const snapshot = await db.collection(collection).get();

      const documents: any[] | PromiseLike<any[]> = [];
      snapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });

      return documents;
    } catch (error) {
      logger.error(`Error getting all documents from ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Check if a document exists
   */
  async documentExists(collection: string, docId: string): Promise<boolean> {
    try {
      const doc = await db.collection(collection).doc(docId).get();
      return doc.exists;
    } catch (error) {
      logger.error(
        `Error checking document existence in ${collection}/${docId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Batch write operations
   */
  async batchWrite(
    operations: {
      operation: "create" | "update" | "delete";
      collection: string;
      docId: string;
      data?: any;
    }[]
  ): Promise<void> {
    try {
      const batch = db.batch();

      for (const op of operations) {
        const docRef = db.collection(op.collection).doc(op.docId);

        switch (op.operation) {
          case "create":
            batch.set(docRef, op.data);
            break;
          case "update":
            batch.update(docRef, op.data);
            break;
          case "delete":
            batch.delete(docRef);
            break;
        }
      }

      await batch.commit();
      logger.info(`Batch write completed with ${operations.length} operations`);
    } catch (error) {
      logger.error("Error in batch write:", error);
      throw error;
    }
  }

  /**
   * Run a transaction
   */
  async runTransaction<T>(
    updateFunction: (transaction: FirebaseFirestore.Transaction) => Promise<T>
  ): Promise<T> {
    try {
      return await db.runTransaction(updateFunction);
    } catch (error) {
      logger.error("Error running transaction:", error);
      throw error;
    }
  }

  /**
   * Add a document with auto-generated ID
   */
  async addDocument(collection: string, data: any): Promise<string> {
    try {
      const docRef = await db.collection(collection).add(data);
      logger.info(`Document added to ${collection} with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      logger.error(`Error adding document to ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Get documents with pagination
   */
  async getDocumentsWithPagination(
    collection: string,
    pageSize: number,
    lastDocument?: FirebaseFirestore.DocumentSnapshot,
    filters: QueryFilter[] = [],
    orderBy?: { field: string; direction: "asc" | "desc" }
  ): Promise<{
    documents: any[];
    lastDocument: FirebaseFirestore.DocumentSnapshot | null;
    hasMore: boolean;
  }> {
    try {
      let query: FirebaseFirestore.Query = db.collection(collection);

      // Apply filters
      for (const filter of filters) {
        query = query.where(filter.field, filter.operator, filter.value);
      }

      // Apply ordering
      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction);
      }

      // Apply pagination
      if (lastDocument) {
        query = query.startAfter(lastDocument);
      }

      query = query.limit(pageSize + 1); // Get one extra to check if there are more

      const snapshot = await query.get();
      const documents: { id: string }[] = [];

      snapshot.docs.forEach((doc, index) => {
        if (index < pageSize) {
          documents.push({ id: doc.id, ...doc.data() });
        }
      });

      const hasMore = snapshot.docs.length > pageSize;
      const lastDoc =
        documents.length > 0 ? snapshot.docs[documents.length - 1] : null;

      return {
        documents,
        lastDocument: lastDoc,
        hasMore,
      };
    } catch (error) {
      logger.error(
        `Error getting paginated documents from ${collection}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Count documents in a collection with filters
   */
  async countDocuments(
    collection: string,
    filters: QueryFilter[] = []
  ): Promise<number> {
    try {
      let query: FirebaseFirestore.Query = db.collection(collection);

      // Apply filters
      for (const filter of filters) {
        query = query.where(filter.field, filter.operator, filter.value);
      }

      const snapshot = await query.count().get();
      return snapshot.data().count;
    } catch (error) {
      logger.error(`Error counting documents in ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Convert Date to Firestore Timestamp
   */
  convertToTimestamp(date: Date): FirebaseFirestore.Timestamp {
    return admin.firestore.Timestamp.fromDate(date);
  }

  /**
   * Convert Firestore Timestamp to Date
   */
  convertFromTimestamp(timestamp: FirebaseFirestore.Timestamp): Date {
    return timestamp.toDate();
  }

  /**
   * Get server timestamp
   */
  getServerTimestamp(): FirebaseFirestore.FieldValue {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  /**
   * Array union operation
   */
  arrayUnion(...elements: any[]): FirebaseFirestore.FieldValue {
    return admin.firestore.FieldValue.arrayUnion(...elements);
  }

  /**
   * Array remove operation
   */
  arrayRemove(...elements: any[]): FirebaseFirestore.FieldValue {
    return admin.firestore.FieldValue.arrayRemove(...elements);
  }

  /**
   * Increment operation
   */
  increment(n: number): FirebaseFirestore.FieldValue {
    return admin.firestore.FieldValue.increment(n);
  }

  /**
   * Delete field operation
   */
  deleteField(): FirebaseFirestore.FieldValue {
    return admin.firestore.FieldValue.delete();
  }

  /**
   * Health check for Firestore
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test Firestore by trying to read from a health collection
      await db.collection("_health_check").limit(1).get();
      return true;
    } catch (error) {
      logger.warn("Firestore health check failed:", error);
      return false;
    }
  }

  /**
   * Get Firestore instance
   */
  getFirestore(): FirebaseFirestore.Firestore {
    return db;
  }
}

// Export singleton instance
export const firestoreService = new FirestoreService();
