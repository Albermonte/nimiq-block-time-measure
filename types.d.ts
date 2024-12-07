import type { BlockType } from "npm:nimiq-rpc-client-ts";

interface BlockDb {
  timestamp: number;
  type: BlockType;
  number: number;
}