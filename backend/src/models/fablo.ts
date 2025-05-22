/**
 * Interface for Fablo API responses
 */
export interface FabloEnrollResponse {
  token: string;
}

export interface FabloRegisterResponse {
  message: string;
}

export interface FabloIdentity {
  affiliation: string;
  id: string;
  type: string;
  attrs: any[];
  max_enrollments: number;
}

export interface FabloIdentitiesResponse {
  response: {
    caname: string;
    identities: FabloIdentity[];
  };
}

export interface FabloInvokeRequest {
  method: string;
  args: string[];
  transient?: { [key: string]: string };
}

export interface FabloResponse<T = any> {
  response: T;
}
