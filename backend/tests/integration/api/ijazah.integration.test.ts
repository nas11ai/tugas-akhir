// tests/integration/api/ijazah.integration.test.ts
import request from "supertest";
import express from "express";
import { Organization, Role } from "../../../src/models/user";
import {
    TestDataGenerator,
    TestAuthHelper,
    TestContainerManager,
} from "../../helpers";
import {
    mockFabloService,
    mockIpfsClusterService,
    mockUserService,
} from "../../mocks";
import fs from "fs";

// Mock Firebase Admin and Auth
jest.mock('../../../src/configs/firebase', () => ({
    auth: {
        verifyIdToken: jest.fn()
    },
    db: {
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: jest.fn()
            }))
        }))
    }
}));

// Mock the services before importing the app
jest.mock("../../../src/services/fabloService", () => ({
    fabloService: mockFabloService,
}));

jest.mock("../../../src/services/ipfsClusterService", () => ({
    ipfsClusterService: mockIpfsClusterService,
}));

jest.mock("../../../src/services/userService", () => ({
    userService: mockUserService,
}));

// Mock fabric service
jest.mock("../../../src/services/fabricService", () => ({
    fabricService: {
        createIjazah: jest.fn(),
        updateIjazah: jest.fn(),
        getIjazah: jest.fn(),
        getAllIjazah: jest.fn(),
        deleteIjazah: jest.fn(),
        getIjazahByStatus: jest.fn(),
        getCertificateDownloadUrl: jest.fn((cid) => `https://ipfs.io/ipfs/${cid}`),
        findMahasiswaByNim: jest.fn()
    }
}));

// Import after mocking
import ijazahRoutes from "../../../src/routes/ijazahRoutes";
import { auth, db } from "../../../src/configs/firebase";
import { fabricService } from "../../../src/services/fabricService";
import { Ijazah, Mahasiswa } from "../../../src/models/ijazah";
import path from "path";
import { logger } from "../../../src/utils/logger";

describe("Ijazah API Integration Tests", () => {
    let app: express.Application;
    let akademikUser: any;
    let rektorUser: any;
    let akademikToken: string;
    let rektorToken: string;

    // Mock Firebase Auth and Firestore
    const mockAuth = auth as jest.Mocked<typeof auth>;
    const mockDb = db as any;
    const mockFabricService = fabricService as jest.Mocked<typeof fabricService>;

    beforeAll(async () => {
        // Check if Fabric network is available for integration tests
        const fabricAvailable = await TestContainerManager.checkFabricAvailability();
        if (!fabricAvailable) {
            console.log("Fabric network not available, using mocks for integration tests");
        }

        // Setup Express app
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Setup Firebase Auth mock
        mockAuth.verifyIdToken.mockImplementation((token: string) => {
            if (token === "mock-akademik-token") {
                return Promise.resolve({ uid: "akademik-user-id" } as any);
            } else if (token === "mock-rektor-token") {
                return Promise.resolve({ uid: "rektor-user-id" } as any);
            }
            return Promise.reject(new Error("Invalid token"));
        });

        // Setup Firestore mock
        mockDb.collection.mockImplementation((collectionName: string) => ({
            doc: (docId: string) => ({
                get: () => {
                    if (collectionName === "users") {
                        if (docId === "akademik-user-id") {
                            return Promise.resolve({
                                exists: true,
                                data: () => ({
                                    email: "akademik@test.itk.ac.id",
                                    displayName: "Akademik User",
                                    role: "admin",
                                    organization: Organization.AKADEMIK,
                                    isActive: true,
                                    createdAt: { toDate: () => new Date() },
                                    updatedAt: { toDate: () => new Date() }
                                })
                            });
                        } else if (docId === "rektor-user-id") {
                            return Promise.resolve({
                                exists: true,
                                data: () => ({
                                    email: "rektor@test.itk.ac.id",
                                    displayName: "Rektor User",
                                    role: "admin",
                                    organization: Organization.REKTOR,
                                    isActive: true,
                                    createdAt: { toDate: () => new Date() },
                                    updatedAt: { toDate: () => new Date() }
                                })
                            });
                        }
                    }
                    return Promise.resolve({ exists: false });
                }
            })
        }));

        // Use real authentication middleware
        app.use("/api/ijazah", ijazahRoutes);

        // Error handling middleware
        app.use((error: any, req: any, res: any, next: any) => {
            res.status(error.status || 500).json({
                success: false,
                message: error.message || "Internal server error",
            });
        });
    });

    beforeEach(async () => {
        // Setup test users
        akademikUser = TestAuthHelper.createMockUser({
            uid: "akademik-user-id",
            email: "akademik@test.itk.ac.id",
            organization: Organization.AKADEMIK,
            role: Role.ADMIN,
        });

        rektorUser = TestAuthHelper.createMockUser({
            uid: "rektor-user-id",
            email: "rektor@test.itk.ac.id",
            organization: Organization.REKTOR,
            role: Role.ADMIN,
        });

        akademikToken = "mock-akademik-token";
        rektorToken = "mock-rektor-token";

        // Add users to mock service
        mockUserService.addMockUser(akademikUser.uid, akademikUser);
        mockUserService.addMockUser(rektorUser.uid, rektorUser);

        // Clear mock data
        mockFabloService.clearMockData();
        mockIpfsClusterService.clearMockData();

        // Clear mock function calls
        jest.clearAllMocks();
    });

    describe("POST /api/ijazah", () => {
        it("should create ijazah certificate successfully (AKADEMIK)", async () => {
            // Arrange
            const ijazahData = TestDataGenerator.generateIjazahData();
            const mockCreatedIjazah: Ijazah = {
                ID: "ijazah_",
                ...ijazahData,
                ipfsCID: "QmTestCertificateCID",
                photoPath: "test-photo.jpg",
                Type: "certificate",
                CreatedAt: new Date().toISOString(),
                UpdatedAt: new Date().toISOString(),
            };

            mockFabricService.createIjazah.mockResolvedValue(mockCreatedIjazah);

            // Act
            const photoPath = path.resolve(__dirname, "../../assets/test-photo.png");
            if (!fs.existsSync(photoPath)) {
                throw new Error(`Photo file not found at path: ${photoPath}`);
            }

            let response;

            // Act
            response = await request(app)
                .post("/api/ijazah")
                .set("Authorization", `Bearer ${akademikToken}`)
                .set("x-fabric-token", "mock-fabric-token")
                .field("nomorDokumen", ijazahData.nomorDokumen)
                .field("nomorIjazahNasional", ijazahData.nomorIjazahNasional)
                .field("nama", ijazahData.nama)
                .field("tempatLahir", ijazahData.tempatLahir ?? "")
                .field("tanggalLahir", ijazahData.tanggalLahir)
                .field("nomorIndukKependudukan", ijazahData.nomorIndukKependudukan)
                .field("programStudi", ijazahData.programStudi)
                .field("fakultas", ijazahData.fakultas)
                .field("tahunDiterima", ijazahData.tahunDiterima)
                .field("nomorIndukMahasiswa", ijazahData.nomorIndukMahasiswa)
                .field("tanggalLulus", ijazahData.tanggalLulus)
                .field("jenisPendidikan", ijazahData.jenisPendidikan)
                .field("gelarPendidikan", ijazahData.gelarPendidikan)
                .field("akreditasiProgramStudi", ijazahData.akreditasiProgramStudi)
                .field("keputusanAkreditasiProgramStudi", ijazahData.keputusanAkreditasiProgramStudi)
                .field("tanggalIjazahDiberikan", ijazahData.tanggalIjazahDiberikan)
                .field("tempatIjazahDiberikan", ijazahData.tempatIjazahDiberikan)
                .field("Status", ijazahData.Status)
                .attach("photo", photoPath);

            // Assert
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.nama).toBe(ijazahData.nama);
            expect(mockFabricService.createIjazah).toHaveBeenCalledWith(
                Organization.AKADEMIK,
                "mock-fabric-token",
                ijazahData,
                expect.any(Buffer)
            );
        });

        it("should reject creation by REKTOR organization", async () => {
            // Arrange
            const ijazahData = TestDataGenerator.generateIjazahData();

            // Act
            const response = await request(app)
                .post("/api/ijazah")
                .set("Authorization", `Bearer ${rektorToken}`)
                .set("x-fabric-token", "mock-fabric-token")
                .send(ijazahData);

            // Assert
            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain("organization access required");
        });

        it("should require authentication", async () => {
            // Arrange
            const ijazahData = TestDataGenerator.generateIjazahData();

            // Act
            const response = await request(app)
                .post("/api/ijazah")
                .send(ijazahData);

            // Assert
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("No auth token");
        });

        it("should require fabric token", async () => {
            // Arrange
            const ijazahData = TestDataGenerator.generateIjazahData();

            // Act
            const response = await request(app)
                .post("/api/ijazah")
                .set("Authorization", `Bearer ${akademikToken}`)
                .send(ijazahData);

            // Assert
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Fabric token is missing or invalid");
        });

        it("should validate required fields", async () => {
            // Act
            const response = await request(app)
                .post("/api/ijazah")
                .set("Authorization", `Bearer ${akademikToken}`)
                .set("x-fabric-token", "mock-fabric-token")
                .send({});

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("GET /api/ijazah/:id", () => {
        it("should get ijazah certificate by ID (public)", async () => {
            // Arrange
            const ijazahData: Ijazah = {
                ID: "ijazah_",
                ...TestDataGenerator.generateIjazahData(),
                Type: "certificate",
                Status: "aktif",
                ipfsCID: "QmTestCertificateCID",
                photoPath: "test-photo.jpg",
                CreatedAt: new Date().toISOString(),
                UpdatedAt: new Date().toISOString(),
            };

            mockFabricService.getIjazah.mockResolvedValue(ijazahData);

            // Act
            const response = await request(app)
                .get("/api/ijazah/ijazah_")
                .set("Authorization", `Bearer ${akademikToken}`)
                .set("x-fabric-token", "mock-fabric-token");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.ID).toBe("ijazah_");
            expect(response.body.accessType).toBe("public");
        });

        it("should get ijazah certificate by ID (public access)", async () => {
            // Arrange
            const ijazahData: Ijazah = {
                ID: "ijazah_",
                ...TestDataGenerator.generateIjazahData(),
                Type: "certificate",
                Status: "aktif",
                ipfsCID: "QmTestCertificateCID",
                photoPath: "test-photo.jpg",
                CreatedAt: new Date().toISOString(),
                UpdatedAt: new Date().toISOString(),
            };

            // Mock fabloService for public access
            const mockFabloService = require("../../../src/services/fabloService").fabloService;
            mockFabloService.enrollUser = jest.fn().mockResolvedValue("admin-fabric-token");
            mockFabricService.getIjazah.mockResolvedValue(ijazahData);

            // Act
            const response = await request(app).get("/api/ijazah/ijazah_");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.validation).toBeDefined();
            expect(response.body.data.validation.isValid).toBe(true);
            expect(response.body.accessType).toBe("public");
        });

        it("should return 404 for non-existent ijazah", async () => {
            // Arrange
            mockFabricService.getIjazah.mockRejectedValue(new Error("Ijazah not found"));

            // Act
            const response = await request(app)
                .get("/api/ijazah/non-existent-id")
                .set("Authorization", `Bearer ${akademikToken}`)
                .set("x-fabric-token", "mock-fabric-token");

            // Assert
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe("PUT /api/ijazah/:id", () => {
        it("should update ijazah certificate successfully (AKADEMIK)", async () => {
            // Arrange
            const updateData = {
                nama: "Updated Graduate Name",
                programStudi: "Updated Program",
            };

            const mockUpdatedIjazah: Ijazah = {
                ID: "ijazah_",
                ...updateData,
                photoPath: "updated-photo.jpg",
                Type: "certificate",
                nomorDokumen: "",
                nomorIjazahNasional: "",
                tanggalLahir: "",
                nomorIndukKependudukan: "",
                fakultas: "",
                tahunDiterima: "",
                nomorIndukMahasiswa: "",
                tanggalLulus: "",
                jenisPendidikan: "",
                gelarPendidikan: "",
                akreditasiProgramStudi: "",
                keputusanAkreditasiProgramStudi: "",
                tempatIjazahDiberikan: "",
                tanggalIjazahDiberikan: "",
                Status: "",
                CreatedAt: "",
                UpdatedAt: ""
            };

            mockFabricService.updateIjazah.mockResolvedValue(mockUpdatedIjazah);

            // Act
            const response = await request(app)
                .put("/api/ijazah/ijazah_")
                .set("Authorization", `Bearer ${akademikToken}`)
                .set("x-fabric-token", "mock-fabric-token")
                .send(updateData);

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.nama).toBe(updateData.nama);
            expect(response.body.data.programStudi).toBe(updateData.programStudi);
        });

        it("should reject update by REKTOR organization", async () => {
            // Act
            const response = await request(app)
                .put("/api/ijazah/ijazah_")
                .set("Authorization", `Bearer ${rektorToken}`)
                .set("x-fabric-token", "mock-fabric-token")
                .send({ nama: "Updated Name" });

            // Assert
            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe("GET /api/ijazah", () => {
        it("should get all ijazah certificates", async () => {
            // Arrange
            const mockIjazahList: Ijazah[] = [
                {
                    ID: "ijazah_1",
                    Type: "certificate",
                    nama: "Graduate 1",
                    ipfsCID: "QmCertificate1",
                    photoPath: "photo1.jpg",
                    nomorDokumen: "",
                    nomorIjazahNasional: "",
                    tanggalLahir: "",
                    nomorIndukKependudukan: "",
                    programStudi: "",
                    fakultas: "",
                    tahunDiterima: "",
                    nomorIndukMahasiswa: "",
                    tanggalLulus: "",
                    jenisPendidikan: "",
                    gelarPendidikan: "",
                    akreditasiProgramStudi: "",
                    keputusanAkreditasiProgramStudi: "",
                    tempatIjazahDiberikan: "",
                    tanggalIjazahDiberikan: "",
                    Status: "",
                    CreatedAt: "",
                    UpdatedAt: ""
                },
                {
                    ID: "ijazah_2",
                    Type: "certificate",
                    nama: "Graduate 2",
                    ipfsCID: "QmCertificate2",
                    photoPath: "photo2.jpg",
                    nomorDokumen: "",
                    nomorIjazahNasional: "",
                    tanggalLahir: "",
                    nomorIndukKependudukan: "",
                    programStudi: "",
                    fakultas: "",
                    tahunDiterima: "",
                    nomorIndukMahasiswa: "",
                    tanggalLulus: "",
                    jenisPendidikan: "",
                    gelarPendidikan: "",
                    akreditasiProgramStudi: "",
                    keputusanAkreditasiProgramStudi: "",
                    tempatIjazahDiberikan: "",
                    tanggalIjazahDiberikan: "",
                    Status: "",
                    CreatedAt: "",
                    UpdatedAt: ""
                },
            ];

            mockFabricService.getAllIjazah.mockResolvedValue(mockIjazahList);

            // Act
            const response = await request(app)
                .get("/api/ijazah")
                .set("Authorization", `Bearer ${akademikToken}`)
                .set("x-fabric-token", "mock-fabric-token");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.count).toBe(2);
        });

        it("should require authentication", async () => {
            // Act
            const response = await request(app).get("/api/ijazah");

            // Assert
            expect(response.status).toBe(401);
            expect(response.body.message).toBe("No auth token");
        });
    });

    describe("DELETE /api/ijazah/:id", () => {
        it("should delete ijazah certificate (AKADEMIK)", async () => {
            // Arrange
            const mockDeleteResult = { success: true, message: "Ijazah deleted successfully" };
            mockFabricService.deleteIjazah.mockResolvedValue(mockDeleteResult);

            // Act
            const response = await request(app)
                .delete("/api/ijazah/ijazah_")
                .set("Authorization", `Bearer ${akademikToken}`)
                .set("x-fabric-token", "mock-fabric-token");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should reject deletion by REKTOR organization", async () => {
            // Act
            const response = await request(app)
                .delete("/api/ijazah/ijazah_")
                .set("Authorization", `Bearer ${rektorToken}`)
                .set("x-fabric-token", "mock-fabric-token");

            // Assert
            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe("Error Handling", () => {
        it("should handle validation errors properly", async () => {
            // Act
            const response = await request(app)
                .post("/api/ijazah")
                .set("Authorization", `Bearer ${akademikToken}`)
                .set("x-fabric-token", "mock-fabric-token")
                .send({
                    nama: "", // Invalid empty name
                    programStudi: "Test Program",
                });

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Validation error");
        });

        it("should handle fabric service errors", async () => {
            // Arrange
            mockFabricService.getIjazah.mockRejectedValue(new Error("Fabric network error"));

            // Act
            const response = await request(app)
                .get("/api/ijazah/test-id")
                .set("Authorization", `Bearer ${akademikToken}`)
                .set("x-fabric-token", "mock-fabric-token");

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should handle missing fabric token", async () => {
            // Act
            const response = await request(app)
                .get("/api/ijazah")
                .set("Authorization", `Bearer ${akademikToken}`);

            // Assert
            expect(response.status).toBe(401);
            expect(response.body.message).toBe("Fabric token is missing or invalid");
        });
    });
});