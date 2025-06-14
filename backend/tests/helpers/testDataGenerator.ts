import { IjazahInput, Signature } from "../../src/models/ijazah";
import {
  Organization,
  Role,
  User,
  UserCredentials,
} from "../../src/models/user";
import * as fs from "fs";
import * as path from "path";
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
      filePath: `test-signature-${randomId}.png`,
      IsActive: Math.random() > 0.5,
      ...overrides,
    };
  }

  /**
   * Generate mock photo buffer
   */
  static async generateMockPhotoBuffer(): Promise<Buffer> {
    const imagePath = path.resolve(__dirname, "../assets/test-photo.png");
    const imageBuffer = await fs.promises.readFile(imagePath);

    return imageBuffer;
  }

  static async generateMockSignatureBuffer(): Promise<Buffer> {
    const imagePath = path.resolve(__dirname, "../assets/test-signature.png");
    const imageBuffer = await fs.promises.readFile(imagePath);

    return imageBuffer;
  }
}
