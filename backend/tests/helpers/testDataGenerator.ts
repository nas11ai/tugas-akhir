import { IjazahInput, Signature } from "@/models/ijazah";
import { Organization, Role, User, UserCredentials } from "@/models/user";
import { v4 as uuidv4 } from "uuid";

export class TestDataGenerator {
  /**
   * Generate test user data
   */
  static generateUser(
    overrides?: Partial<User>
  ): Omit<User, "createdAt" | "updatedAt"> {
    const uid = uuidv4();
    return {
      uid,
      email: `test${uid.substring(0, 8)}@example.com`,
      displayName: `Test User ${uid.substring(0, 8)}`,
      photoURL: "https://i.pravatar.cc/150?img=22",
      role: Role.USER,
      organization: Organization.AKADEMIK,
      isActive: true,
      ...overrides,
    };
  }

  /**
   * Generate test user credentials
   */
  static generateUserCredentials(
    overrides?: Partial<UserCredentials>
  ): UserCredentials {
    const randomId = Math.random().toString(36).substring(2, 8);
    return {
      username: `testuser${randomId}`,
      password: `testpass${randomId}`,
      ...overrides,
    };
  }

  /**
   * Generate test ijazah data
   */
  static generateIjazahData(overrides?: Partial<IjazahInput>): IjazahInput {
    const randomId = Math.random().toString(36).substring(2, 8);
    const currentDate = new Date().toISOString().split("T")[0];

    return {
      nomorDokumen: `DOC${randomId.toUpperCase()}`,
      nomorIjazahNasional: `NIJ${randomId.toUpperCase()}`,
      nama: `Test Graduate ${randomId}`,
      tempatLahir: "Jakarta",
      tanggalLahir: "1995-01-01",
      nomorIndukKependudukan: `31710${randomId}0001`,
      programStudi: "Teknik Informatika",
      fakultas: "Fakultas Teknik",
      tahunDiterima: "2020",
      nomorIndukMahasiswa: `NIM${randomId}`,
      tanggalLulus: currentDate,
      jenisPendidikan: "S1",
      gelarPendidikan: "S.Kom",
      akreditasiProgramStudi: "A",
      keputusanAkreditasiProgramStudi: "SK-001/2023",
      tempatIjazahDiberikan: "Jakarta",
      tanggalIjazahDiberikan: currentDate,
      Status: "aktif",
      ...overrides,
    };
  }

  /**
   * Generate test signature data
   */
  static generateSignatureData(
    overrides?: Partial<Signature>
  ): Omit<Signature, "Type" | "Owner" | "CreatedAt" | "UpdatedAt"> {
    const randomId = Math.random().toString(36).substring(2, 8);

    return {
      ID: `SIG${randomId.toUpperCase()}`,
      CID: `Qm${randomId}TestSignatureCID`,
      IsActive: false,
      ...overrides,
    };
  }

  /**
   * Generate mock photo buffer
   */
  static generateMockPhotoBuffer(): Buffer {
    // Simple PNG header + minimal data for testing
    const pngHeader = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG signature
      0x00,
      0x00,
      0x00,
      0x0d, // IHDR chunk length
      0x49,
      0x48,
      0x44,
      0x52, // IHDR
      0x00,
      0x00,
      0x00,
      0x01, // Width: 1
      0x00,
      0x00,
      0x00,
      0x01, // Height: 1
      0x08,
      0x02,
      0x00,
      0x00,
      0x00, // Bit depth, color type, etc.
      0x90,
      0x77,
      0x53,
      0xde, // CRC
    ]);

    // Add some dummy data to make it a valid(ish) PNG for testing
    const dummyData = Buffer.alloc(100, 0x00);
    return Buffer.concat([pngHeader, dummyData]);
  }
}
