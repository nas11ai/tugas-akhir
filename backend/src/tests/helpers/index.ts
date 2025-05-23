import { Organization, Role } from "../../models/user";
import { expect, jest } from "@jest/globals";

// Mock data generators
export const createMockUser = (overrides: any = {}) => ({
  uid: "test-uid-123",
  email: "test@example.com",
  displayName: "Test User",
  photoURL: "https://example.com/photo.jpg",
  role: Role.ADMIN,
  organization: Organization.AKADEMIK,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockIjazah = (overrides: any = {}) => ({
  ID: "ijazah_test_123",
  Type: "certificate",
  nama: "John Doe",
  tempatLahir: "Jakarta",
  tanggalLahir: "1990-01-01",
  nomorIndukKependudukan: "1234567890123456",
  nomorIndukMahasiswa: "NIM123456",
  programStudi: "Teknik Informatika",
  fakultas: "Fakultas Teknik",
  jenisPendidikan: "S1",
  gelarPendidikan: "S.Kom",
  tahunDiterima: "2018",
  tanggalLulus: "2022-07-15",
  nomorDokumen: "DOC/2022/001",
  nomorIjazahNasional: "NIJ/2022/001",
  tanggalIjazahDiberikan: "2022-08-01",
  tempatIjazahDiberikan: "Jakarta",
  akreditasiProgramStudi: "A",
  keputusanAkreditasiProgramStudi: "SK/001/2020",
  ipfsCID: "QmTest123",
  photoCID: "QmPhoto123",
  signatureID: "signature_123",
  Status: "menunggu tanda tangan rektor",
  CreatedAt: new Date().toISOString(),
  UpdatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockSignature = (overrides: any = {}) => ({
  ID: "signature_test_123",
  URL: "https://ipfs.io/ipfs/QmSignature123",
  IsActive: true,
  CreatedAt: new Date().toISOString(),
  UpdatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockToken = () => "mock-jwt-token-123";

export const createMockFile = () => Buffer.from("mock file content");

// Mock request objects
export const createMockRequest = (overrides: any = {}) => ({
  user: createMockUser(),
  token: createMockToken(),
  params: {},
  query: {},
  body: {},
  file: null,
  files: null,
  ...overrides,
});

export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};

export const createMockNext = () => jest.fn();

// Validation helpers
export const expectSuccessResponse = (
  response: any,
  statusCode: number = 200
) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(true);
  expect(response.body.message).toBeDefined();
};

export const expectErrorResponse = (
  response: any,
  statusCode: number = 400
) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(false);
  expect(response.body.message || response.body.error).toBeDefined();
};

// Test data constants
export const TEST_CONSTANTS = {
  VALID_IJAZAH_ID: "ijazah_test_123",
  VALID_SIGNATURE_ID: "signature_test_123",
  VALID_USER_UID: "test-uid-123",
  INVALID_ID: "invalid-id",
  AKADEMIK_USER: createMockUser({
    organization: Organization.AKADEMIK,
    role: Role.ADMIN,
  }),
  REKTOR_USER: createMockUser({
    organization: Organization.REKTOR,
    role: Role.ADMIN,
  }),
  ADMIN_USER: createMockUser({ role: Role.ADMIN }),
};
