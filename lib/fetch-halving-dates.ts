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
  console.log(
    `[${new Date().toISOString()}] 🏔️ Fetching current Bitcoin block height from Mempool.space...`
  );
  try {
    const response = await fetch(
      "https://mempool.space/api/blocks/tip/height",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    console.log(
      `[${new Date().toISOString()}] 📡 Block height response status: ${response.status}`
    );

    if (!response.ok) {
      console.error(
        `[${new Date().toISOString()}] ❌ Failed to fetch current block height: ${response.status} ${response.statusText}`
      );
      throw new Error(
        `Failed to fetch current block height: ${response.statusText}`
      );
    }

    const heightText = await response.text();
    const height = parseInt(heightText, 10);
    console.log(
      `[${new Date().toISOString()}] 📊 Current Bitcoin block height: ${height}`
    );
    return height;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] 💥 Error fetching current block height:`,
      error
    );
    throw error;
  }
}

/**
 * Fetch block hash for a given block height
 * Returns null if block doesn't exist (future halving)
 */
async function fetchBlockHash(blockHeight: number): Promise<string | null> {
  console.log(
    `[${new Date().toISOString()}] 🔍 Fetching block hash for height ${blockHeight}...`
  );
  try {
    const response = await fetch(
      `https://mempool.space/api/block-height/${blockHeight}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    console.log(
      `[${new Date().toISOString()}] 📡 Block hash response status: ${response.status} for height ${blockHeight}`
    );

    if (!response.ok) {
      // If block doesn't exist yet (future halving), return null
      if (response.status === 404) {
        console.log(
          `[${new Date().toISOString()}] ⏳ Block ${blockHeight} doesn't exist yet (future halving)`
        );
        return null;
      }
      console.error(
        `[${new Date().toISOString()}] ❌ Blockstream API error for height ${blockHeight}: ${response.status} ${response.statusText}`
      );
      throw new Error(`Blockstream API error: ${response.statusText}`);
    }

    const hash = await response.text();
    console.log(
      `[${new Date().toISOString()}] 🔗 Block ${blockHeight} hash: ${hash.substring(0, 16)}...`
    );
    return hash;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] 💥 Error fetching block hash for block ${blockHeight}:`,
      error
    );
    throw error;
  }
}

/**
 * Fetch block details including timestamp for a given block hash
 */
async function fetchBlockDetails(blockHash: string): Promise<BlockData> {
  console.log(
    `[${new Date().toISOString()}] 📦 Fetching block details for hash ${blockHash.substring(0, 16)}...`
  );

  const blockResponse = await fetch(
    `https://mempool.space/api/block/${blockHash}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    }
  );

  console.log(
    `[${new Date().toISOString()}] 📡 Block details response status: ${blockResponse.status} for hash ${blockHash.substring(0, 16)}...`
  );

  if (!blockResponse.ok) {
    console.error(
      `[${new Date().toISOString()}] ❌ Failed to fetch block details for ${blockHash.substring(0, 16)}...: ${blockResponse.status} ${blockResponse.statusText}`
    );
    throw new Error(
      `Failed to fetch block details: ${blockResponse.statusText}`
    );
  }

  const blockData = await blockResponse.json();
  console.log(
    `[${new Date().toISOString()}] 📊 Block ${blockData.height} mined at ${new Date(blockData.timestamp * 1000).toISOString()}`
  );

  return blockData;
}

/**
 * Fetch halving dates directly (bypassing HTTP layer)
 * Same logic as /api/halving-dates but called as a function
 */
export async function fetchHalvingDatesDirect(): Promise<{
  halvingDates: string[];
}> {
  const startTime = Date.now();
  console.log(
    `[${new Date().toISOString()}] 📅 Starting halving dates fetch...`
  );

  try {
    const halvingDates: Date[] = [];
    const now = new Date();

    // Fetch current block height to avoid unnecessary API calls for future blocks
    const currentBlockHeight = await fetchCurrentBlockHeight();

    // Filter halving blocks to only include those that exist (<= current block height)
    const existingHalvingBlocks = HALVING_BLOCKS.filter(
      (blockHeight) => blockHeight <= currentBlockHeight
    );

    console.log(
      `[${new Date().toISOString()}] 📋 Found ${existingHalvingBlocks.length} existing halving blocks out of ${HALVING_BLOCKS.length} total`
    );

    if (existingHalvingBlocks.length === 0) {
      console.error(
        `[${new Date().toISOString()}] ❌ No halving dates could be fetched - no existing blocks`
      );
      throw new Error("No halving dates could be fetched");
    }

    // Fetch all block hashes in parallel (these should all exist, avoiding 404s)
    console.log(
      `[${new Date().toISOString()}] 🔄 Fetching ${existingHalvingBlocks.length} block hashes in parallel...`
    );
    const blockHashPromises = existingHalvingBlocks.map((blockHeight) =>
      fetchBlockHash(blockHeight)
    );
    const blockHashes = await Promise.all(blockHashPromises);

    // Filter out any null values (shouldn't happen, but safety check)
    const validBlockHashes = blockHashes.filter(
      (hash): hash is string => hash !== null
    );

    console.log(
      `[${new Date().toISOString()}] ✅ Retrieved ${validBlockHashes.length} valid block hashes`
    );

    if (validBlockHashes.length === 0) {
      console.error(
        `[${new Date().toISOString()}] ❌ No valid block hashes found`
      );
      throw new Error("No halving dates could be fetched");
    }

    // Fetch all block details in parallel
    console.log(
      `[${new Date().toISOString()}] 🔄 Fetching ${validBlockHashes.length} block details in parallel...`
    );
    const blockDetailsPromises = validBlockHashes.map((blockHash) =>
      fetchBlockDetails(blockHash)
    );
    const blockDetailsArray = await Promise.all(blockDetailsPromises);

    console.log(
      `[${new Date().toISOString()}] 📊 Processing ${blockDetailsArray.length} block details`
    );

    // Convert timestamps to dates and filter out future dates
    for (const blockData of blockDetailsArray) {
      const halvingDate = new Date(blockData.timestamp * 1000);

      // If date is in the future, stop processing (early return optimization)
      if (halvingDate > now) {
        console.log(
          `[${new Date().toISOString()}] ⏸️ Stopping at future halving date: ${halvingDate.toISOString()}`
        );
        break;
      }

      halvingDates.push(halvingDate);
    }

    console.log(
      `[${new Date().toISOString()}] 📅 Found ${halvingDates.length} past halving dates`
    );

    if (halvingDates.length === 0) {
      console.error(
        `[${new Date().toISOString()}] ❌ No past halving dates found`
      );
      throw new Error("No halving dates could be fetched");
    }

    // Convert Date objects to ISO strings for JSON serialization
    const halvingDatesISO = halvingDates.map((date) => date.toISOString());

    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] ✅ Halving dates fetch completed in ${duration}ms with ${halvingDatesISO.length} dates`
    );

    return { halvingDates: halvingDatesISO };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[${new Date().toISOString()}] 💥 Halving dates fetch failed after ${duration}ms:`,
      error
    );
    throw error;
  }
}
