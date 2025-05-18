import { type Contract } from "fabric-contract-api";
import { IjazahContract } from "./ijazahContract";

export const contracts: (typeof Contract)[] = [IjazahContract];
