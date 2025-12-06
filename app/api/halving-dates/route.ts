import { NextRequest, NextResponse } from "next/server";

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
 * Fetch halving dates from Blockstream API
 * Uses actual block timestamps for accurate halving dates
 */
export async function GET(request: NextRequest) {
  try {
    const halvingDates: Date[] = [];

    // Fetch block data for each halving block from Blockstream API
    // Using mempool.space API (based on Esplora) as it's reliable and free
    for (const blockHeight of HALVING_BLOCKS) {
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
          // If block doesn't exist yet (future halving), skip it
          if (response.status === 404) {
            continue;
          }
          throw new Error(`Blockstream API error: ${response.statusText}`);
        }

        const blockHash = await response.text();

        // Fetch block details to get timestamp
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

        const blockData: BlockData = await blockResponse.json();

        // Convert Unix timestamp to Date
        // Blockstream API returns timestamp in seconds
        const halvingDate = new Date(blockData.timestamp * 1000);
        halvingDates.push(halvingDate);
      } catch (error) {
        // Log error but continue with other blocks
        console.error(`Error fetching halving block ${blockHeight}:`, error);
        // For future blocks that don't exist yet, we can estimate
        // but for now, we'll skip them
      }
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
