import { NextResponse } from "next/server";

/**
 * Bitcoin halving constants
 * Halvings occur every 210,000 blocks starting at block 210,000
 * Bitcoin will be fully mined around 2140, which corresponds to approximately
 * 33 halvings total (from block 210,000 to block 6,930,000)
 */
const BLOCKS_PER_HALVING = 210000;
const FIRST_HALVING_BLOCK = 210000;
// Generate all halving blocks up to block 10,000,000 (covers all possible halvings)
// This is approximately 47 halvings, well beyond when Bitcoin will be fully mined (~2140)
const MAX_HALVING_BLOCK = 10000000;

/**
 * Generate all Bitcoin halving block heights
 * Returns: [210000, 420000, 630000, 840000, ..., up to MAX_HALVING_BLOCK]
 */
function generateAllHalvingBlocks(): number[] {
  const halvingBlocks: number[] = [];
  let currentBlock = FIRST_HALVING_BLOCK;

  while (currentBlock <= MAX_HALVING_BLOCK) {
    halvingBlocks.push(currentBlock);
    currentBlock += BLOCKS_PER_HALVING;
  }

  return halvingBlocks;
}

const HALVING_BLOCKS = generateAllHalvingBlocks();

/**
 * Interface for block data from Blockstream API
 */
interface BlockData {
  id: string;
  height: number;
  timestamp: number;
  [key: string]: unknown;
}

/**
 * Fetch the current Bitcoin block height
 * Returns the height of the latest block in the blockchain
 */
async function fetchCurrentBlockHeight(): Promise<number> {
  try {
    const response = await fetch(
      "https://mempool.space/api/blocks/tip/height",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch current block height: ${response.statusText}`
      );
    }

    const heightText = await response.text();
    return parseInt(heightText, 10);
  } catch (error) {
    console.error("Error fetching current block height:", error);
    throw error;
  }
}

/**
 * Fetch block hash for a given block height
 * Returns null if block doesn't exist (future halving)
 */
async function fetchBlockHash(blockHeight: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://mempool.space/api/block-height/${blockHeight}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!response.ok) {
      // If block doesn't exist yet (future halving), return null
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Blockstream API error: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error(`Error fetching block hash for block ${blockHeight}:`, error);
    throw error;
  }
}

/**
 * Fetch block details including timestamp for a given block hash
 */
async function fetchBlockDetails(blockHash: string): Promise<BlockData> {
  const blockResponse = await fetch(
    `https://mempool.space/api/block/${blockHash}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    }
  );

  if (!blockResponse.ok) {
    throw new Error(
      `Failed to fetch block details: ${blockResponse.statusText}`
    );
  }

  return await blockResponse.json();
}

/**
 * Fetch halving dates from Blockstream API
 * Uses actual block timestamps for accurate halving dates
 * Optimized to fetch blocks in parallel and avoid 404s by checking current block height first
 */
export async function GET() {
  try {
    const halvingDates: Date[] = [];
    const now = new Date();

    // Fetch current block height to avoid unnecessary API calls for future blocks
    const currentBlockHeight = await fetchCurrentBlockHeight();

    // Filter halving blocks to only include those that exist (<= current block height)
    const existingHalvingBlocks = HALVING_BLOCKS.filter(
      (blockHeight) => blockHeight <= currentBlockHeight
    );

    if (existingHalvingBlocks.length === 0) {
      throw new Error("No halving dates could be fetched");
    }

    // Fetch all block hashes in parallel (these should all exist, avoiding 404s)
    const blockHashPromises = existingHalvingBlocks.map((blockHeight) =>
      fetchBlockHash(blockHeight)
    );
    const blockHashes = await Promise.all(blockHashPromises);

    // Filter out any null values (shouldn't happen, but safety check)
    const validBlockHashes = blockHashes.filter(
      (hash): hash is string => hash !== null
    );

    if (validBlockHashes.length === 0) {
      throw new Error("No halving dates could be fetched");
    }

    // Fetch all block details in parallel
    const blockDetailsPromises = validBlockHashes.map((blockHash) =>
      fetchBlockDetails(blockHash)
    );
    const blockDetailsArray = await Promise.all(blockDetailsPromises);

    // Convert timestamps to dates and filter out future dates
    for (const blockData of blockDetailsArray) {
      const halvingDate = new Date(blockData.timestamp * 1000);

      // If date is in the future, stop processing (early return optimization)
      if (halvingDate > now) {
        break;
      }

      halvingDates.push(halvingDate);
    }

    if (halvingDates.length === 0) {
      throw new Error("No halving dates could be fetched");
    }

    // Convert Date objects to ISO strings for JSON serialization
    const halvingDatesISO = halvingDates.map((date) => date.toISOString());

    return NextResponse.json({ halvingDates: halvingDatesISO });
  } catch (error) {
    console.error("Error fetching halving dates:", error);
    return NextResponse.json(
      { error: "Failed to fetch halving dates" },
      { status: 500 }
    );
  }
}
