import { FabloService, fabloService } from '../../../src/services/fabloService';
import { Organization } from '../../../src/models/user';
import { FabloInvokeRequest } from '../../../src/models/fablo';
import { akademikClient, rektorClient, setFabricAuthHeader } from '../../../src/configs/fabric';
import { logger } from '../../../src/utils/logger';
import { AxiosResponse } from 'axios';

// Mock dependencies
jest.mock('../../../src/configs/fabric', () => ({
    chaincode: {
        channel: 'test-channel',
        name: 'test-chaincode'
    },
    akademikClient: {
        post: jest.fn(),
        get: jest.fn()
    },
    rektorClient: {
        post: jest.fn(),
        get: jest.fn()
    },
    setFabricAuthHeader: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

jest.mock('dotenv', () => ({
    config: jest.fn()
}));

// Mock process.env
const mockEnv = {
    ADMIN_USERNAME: 'testadmin',
    ADMIN_PASSWORD: 'testpassword'
};

describe('FabloService', () => {
    let service: FabloService;
    const mockAkademikClient = akademikClient as jest.Mocked<typeof akademikClient>;
    const mockRektorClient = rektorClient as jest.Mocked<typeof rektorClient>;
    const mockSetFabricAuthHeader = setFabricAuthHeader as jest.MockedFunction<typeof setFabricAuthHeader>;
    const mockLogger = logger as jest.Mocked<typeof logger>;

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock process.env
        process.env = { ...process.env, ...mockEnv };
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('constructor and initialization', () => {
        it('should create instance and initialize admin tokens', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: { token: 'admin-token-123' },
                status: 200
            };

            mockAkademikClient.post.mockResolvedValueOnce(mockResponse as AxiosResponse);

            // Create service instance
            service = new FabloService();

            // Wait for initialization to complete
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(mockAkademikClient.post).toHaveBeenCalledWith('/user/enroll', {
                id: 'testadmin',
                secret: 'testpassword'
            });
            expect(mockSetFabricAuthHeader).toHaveBeenCalledWith(mockAkademikClient, 'admin-token-123');
            expect(mockLogger.info).toHaveBeenCalledWith('Admin tokens initialized for Akademik organization');
        });

        it('should handle initialization failure gracefully', async () => {
            const error = new Error('Network error');
            mockAkademikClient.post.mockRejectedValueOnce(error);

            // Create service instance
            service = new FabloService();

            // Wait for initialization to complete
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize admin tokens:', expect.any(Error));
        });
    });

    describe('getClient', () => {
        beforeEach(() => {
            service = new FabloService();
        });

        it('should return akademikClient for AKADEMIK organization', () => {
            const client = (service as any).getClient(Organization.AKADEMIK);
            expect(client).toBe(mockAkademikClient);
        });

        it('should return rektorClient for REKTOR organization', () => {
            const client = (service as any).getClient(Organization.REKTOR);
            expect(client).toBe(mockRektorClient);
        });

        it('should return akademikClient as default', () => {
            const client = (service as any).getClient('UNKNOWN' as Organization);
            expect(client).toBe(mockAkademikClient);
        });
    });

    describe('enrollUser', () => {
        beforeEach(() => {
            service = new FabloService();
        });

        it('should successfully enroll user', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: { token: 'user-token-123' },
                status: 200
            };

            mockAkademikClient.post.mockResolvedValueOnce(mockResponse as AxiosResponse);

            const result = await service.enrollUser(Organization.AKADEMIK, 'testuser', 'password');

            expect(mockAkademikClient.post).toHaveBeenCalledWith('/user/enroll', {
                id: 'testuser',
                secret: 'password'
            });
            expect(result).toBe('user-token-123');
            expect(mockLogger.info).toHaveBeenCalledWith(
                'User testuser enrolled successfully in akademik organization'
            );
        });

        it('should handle enrollment error', async () => {
            const error = new Error('Enrollment failed');
            mockAkademikClient.post.mockRejectedValueOnce(error);

            await expect(
                service.enrollUser(Organization.AKADEMIK, 'testuser', 'password')
            ).rejects.toThrow('Enrollment failed');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error enrolling user testuser in akademik:',
                error
            );
        });

        it('should use rektorClient for REKTOR organization', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: { token: 'rektor-token-123' },
                status: 200
            };

            mockRektorClient.post.mockResolvedValueOnce(mockResponse as AxiosResponse);

            const result = await service.enrollUser(Organization.REKTOR, 'rektoruser', 'password');

            expect(mockRektorClient.post).toHaveBeenCalledWith('/user/enroll', {
                id: 'rektoruser',
                secret: 'password'
            });
            expect(result).toBe('rektor-token-123');
        });
    });

    describe('reenrollUser', () => {
        beforeEach(() => {
            service = new FabloService();
        });

        it('should successfully re-enroll user', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: { token: 'new-token-123' },
                status: 200
            };

            mockAkademikClient.post.mockResolvedValueOnce(mockResponse as AxiosResponse);

            const result = await service.reenrollUser(Organization.AKADEMIK, 'old-token');

            expect(mockAkademikClient.post).toHaveBeenCalledWith(
                '/user/reenroll',
                {},
                {
                    headers: {
                        Authorization: 'Bearer old-token'
                    }
                }
            );
            expect(result).toBe('new-token-123');
            expect(mockLogger.info).toHaveBeenCalledWith(
                'User re-enrolled successfully in akademik organization'
            );
        });

        it('should handle re-enrollment error', async () => {
            const error = new Error('Re-enrollment failed');
            mockAkademikClient.post.mockRejectedValueOnce(error);

            await expect(
                service.reenrollUser(Organization.AKADEMIK, 'old-token')
            ).rejects.toThrow('Re-enrollment failed');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error re-enrolling user in akademik:',
                error
            );
        });
    });

    describe('invokeChaincode', () => {
        beforeEach(() => {
            service = new FabloService();
        });

        it('should successfully invoke chaincode', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: { response: { success: true, data: 'result' } },
                status: 200
            };

            mockAkademikClient.post.mockResolvedValueOnce(mockResponse as AxiosResponse);

            const request: FabloInvokeRequest = {
                method: 'CreateAsset',
                args: ['asset1', 'value1']
            };

            const result = await service.invokeChaincode(
                Organization.AKADEMIK,
                'user-token',
                request
            );

            expect(mockAkademikClient.post).toHaveBeenCalledWith(
                '/invoke/test-channel/test-chaincode',
                request,
                {
                    headers: {
                        Authorization: 'Bearer user-token'
                    }
                }
            );
            expect(result).toBe(JSON.stringify({ success: true, data: 'result' }));
            expect(mockLogger.info).toHaveBeenCalledWith('Chaincode invoked successfully: CreateAsset');
        });

        it('should use custom channel and chaincode', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: { response: { success: true } },
                status: 200
            };

            mockAkademikClient.post.mockResolvedValueOnce(mockResponse as AxiosResponse);

            const request: FabloInvokeRequest = {
                method: 'TestMethod',
                args: []
            };

            await service.invokeChaincode(
                Organization.AKADEMIK,
                'user-token',
                request,
                'custom-channel',
                'custom-chaincode'
            );

            expect(mockAkademikClient.post).toHaveBeenCalledWith(
                '/invoke/custom-channel/custom-chaincode',
                request,
                expect.any(Object)
            );
        });

        it('should handle invoke error', async () => {
            const error = new Error('Invoke failed');
            mockAkademikClient.post.mockRejectedValueOnce(error);

            const request: FabloInvokeRequest = {
                method: 'CreateAsset',
                args: ['asset1']
            };

            await expect(
                service.invokeChaincode(Organization.AKADEMIK, 'user-token', request)
            ).rejects.toThrow('Invoke failed');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error invoking chaincode CreateAsset:',
                error
            );
        });
    });

    describe('queryChaincode', () => {
        beforeEach(() => {
            service = new FabloService();
        });

        it('should successfully query chaincode', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: { response: [{ id: 'asset1', value: 'value1' }] },
                status: 200
            };

            mockAkademikClient.post.mockResolvedValueOnce(mockResponse as AxiosResponse);

            const request: FabloInvokeRequest = {
                method: 'GetAllAssets',
                args: []
            };

            const result = await service.queryChaincode(
                Organization.AKADEMIK,
                'user-token',
                request
            );

            expect(mockAkademikClient.post).toHaveBeenCalledWith(
                '/query/test-channel/test-chaincode',
                request,
                {
                    headers: {
                        Authorization: 'Bearer user-token'
                    }
                }
            );
            expect(result).toBe(JSON.stringify([{ id: 'asset1', value: 'value1' }]));
            expect(mockLogger.info).toHaveBeenCalledWith('Chaincode queried successfully: GetAllAssets');
        });

        it('should handle query error', async () => {
            const error = new Error('Query failed');
            mockAkademikClient.post.mockRejectedValueOnce(error);

            const request: FabloInvokeRequest = {
                method: 'GetAllAssets',
                args: []
            };

            await expect(
                service.queryChaincode(Organization.AKADEMIK, 'user-token', request)
            ).rejects.toThrow('Query failed');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error querying chaincode GetAllAssets:',
                error
            );
        });
    });

    describe('validateToken', () => {
        beforeEach(() => {
            service = new FabloService();
        });

        it('should return true for valid token', async () => {
            const mockResponse: Partial<AxiosResponse> = {
                data: { response: [] },
                status: 200
            };

            mockAkademikClient.post.mockResolvedValueOnce(mockResponse as AxiosResponse);

            const result = await service.validateToken(Organization.AKADEMIK, 'valid-token');

            expect(result).toBe(true);
            expect(mockAkademikClient.post).toHaveBeenCalledWith(
                '/query/test-channel/test-chaincode',
                {
                    method: 'GetAllAssets',
                    args: []
                },
                {
                    headers: {
                        Authorization: 'Bearer valid-token'
                    }
                }
            );
        });

        it('should return false for invalid token', async () => {
            const error = new Error('Unauthorized');
            mockAkademikClient.post.mockRejectedValueOnce(error);

            const result = await service.validateToken(Organization.AKADEMIK, 'invalid-token');

            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith('Token validation failed:', error);
        });
    });

    describe('healthCheck', () => {
        beforeEach(() => {
            // Mock admin tokens being available - Fix: use lowercase organization names
            (service as any).adminTokens.set('akademik', 'admin-token-akademik');
            (service as any).adminTokens.set('rektor', 'admin-token-rektor');
        });

        it('should return health status for both organizations', async () => {
            const mockAkademikResponse: Partial<AxiosResponse> = {
                status: 200,
                data: []
            };
            const mockRektorResponse: Partial<AxiosResponse> = {
                status: 200,
                data: []
            };

            mockAkademikClient.get.mockResolvedValueOnce(mockAkademikResponse as AxiosResponse);
            mockRektorClient.get.mockResolvedValueOnce(mockRektorResponse as AxiosResponse);

            const result = await service.healthCheck();

            expect(result).toEqual({
                akademik: true,
                rektor: true
            });

            expect(mockAkademikClient.get).toHaveBeenCalledWith('/user/identities', {
                headers: {
                    Authorization: 'Bearer admin-token-akademik'
                },
                timeout: 5000
            });

            expect(mockRektorClient.get).toHaveBeenCalledWith('/user/identities', {
                headers: {
                    Authorization: 'Bearer admin-token-rektor'
                },
                timeout: 5000
            });
        });

        it('should handle akademik health check failure', async () => {
            const error = new Error('Network error');
            const mockRektorResponse: Partial<AxiosResponse> = {
                status: 200,
                data: []
            };

            mockAkademikClient.get.mockRejectedValueOnce(error);
            mockRektorClient.get.mockResolvedValueOnce(mockRektorResponse as AxiosResponse);

            const result = await service.healthCheck();

            expect(result).toEqual({
                akademik: false,
                rektor: true
            });

            expect(mockLogger.warn).toHaveBeenCalledWith('Akademik Fablo health check failed:', error);
        });

        it('should handle rektor health check failure', async () => {
            const mockAkademikResponse: Partial<AxiosResponse> = {
                status: 200,
                data: []
            };
            const error = new Error('Network error');

            mockAkademikClient.get.mockResolvedValueOnce(mockAkademikResponse as AxiosResponse);
            mockRektorClient.get.mockRejectedValueOnce(error);

            const result = await service.healthCheck();

            expect(result).toEqual({
                akademik: true,
                rektor: false
            });

            expect(mockLogger.warn).toHaveBeenCalledWith('Rektor Fablo health check failed:', error);
        });

        it('should handle both health checks failing', async () => {
            const akademikError = new Error('Akademik error');
            const rektorError = new Error('Rektor error');

            mockAkademikClient.get.mockRejectedValueOnce(akademikError);
            mockRektorClient.get.mockRejectedValueOnce(rektorError);

            const result = await service.healthCheck();

            expect(result).toEqual({
                akademik: false,
                rektor: false
            });

            expect(mockLogger.warn).toHaveBeenCalledWith('Akademik Fablo health check failed:', akademikError);
            expect(mockLogger.warn).toHaveBeenCalledWith('Rektor Fablo health check failed:', rektorError);
        });
    });

    describe('getAdminToken', () => {
        beforeEach(async () => {
            // Mock successful initialization
            const mockResponse: Partial<AxiosResponse> = {
                data: { token: 'admin-token-123' },
                status: 200
            };
            mockAkademikClient.post.mockResolvedValueOnce(mockResponse as AxiosResponse);

            service = new FabloService();

            // Wait for initialization
            await new Promise(resolve => setTimeout(resolve, 150));
        });

        it('should return admin token for existing organization', async () => {
            const token = (service as any).getAdminToken(Organization.AKADEMIK);
            expect(token).toBe('admin-token-123');
        });

        it('should throw error for organization without admin token', () => {
            expect(() => {
                (service as any).getAdminToken(Organization.REKTOR);
            }).toThrow('Admin token not available for organization: rektor');
        });
    });

    describe('singleton instance', () => {
        it('should export singleton instance', () => {
            expect(fabloService).toBeInstanceOf(FabloService);
        });
    });
});