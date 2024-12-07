import { Block, BlockType, NimiqRPCClient } from "npm:nimiq-rpc-client-ts"
import { AverageTimeTracker, calculateTimeDiff, sleep } from "./utils.ts";
import "jsr:@std/dotenv/load";
import { BlockDb } from "./types.d.ts";

const url = Deno.env.get("NIMIQ_RPC_URL")
if (!url) {
  throw new Error("NIMIQ_RPC_URL is required")
}

const kv = await Deno.openKv('./block-time.db');

const client = new NimiqRPCClient(url)
const { data: policy, error: errorPolicy } = await client.policy.getPolicyConstants()
if (errorPolicy) {
  throw errorPolicy
}

const { genesisBlockNumber, blockSeparationTime, blocksPerBatch, blocksPerEpoch } = policy
const firstBlock = Number(Deno.env.get("FIRST_BLOCK")) || genesisBlockNumber
let lastBlock = Number(Deno.env.get("LAST_BLOCK"))
if (!lastBlock) {
  const { data, error } = await client.blockchain.getBlockNumber()
  if (error) {
    throw error
  }
  lastBlock = data
}

const increment = 1
let lastTimestamp = 0
let count = 0
let totalMacroBlocks = 0
// const expectedBlockSeparationTime = blockSeparationTime
const expectedBlockSeparationTime = 100
const expectedDiff = calculateTimeDiff(expectedBlockSeparationTime * increment, 0)
const tracker = new AverageTimeTracker();

const unexpectedBlocks: number[] = []

for (let i = firstBlock; i <= lastBlock; i += increment) {
  let block: BlockDb

  block = (await kv.get(['timestamp', i])).value as Block

  if (!block) {
    const { data, error: errorBlock } = await client.blockchain.getBlockByNumber(i, { includeBody: true })
    if (errorBlock) {
      console.error(`Error fetching block ${i}: `, errorBlock)
      await sleep(1000)
      i -= increment
      continue
    }
    block = { timestamp: data.timestamp, type: data.type, number: data.number }
    await kv.set(['timestamp', data.number], block)
  }



  const { timestamp } = block
  if (lastTimestamp !== 0) {
    const diff = calculateTimeDiff(lastTimestamp, timestamp)
    // if (diff.hours !== expectedDiff.hours || diff.minutes !== expectedDiff.minutes || diff.seconds !== expectedDiff.seconds || diff.milliseconds !== expectedDiff.milliseconds) {
    //   console.log(`Block ${i} - Actual time: ${diff.hours}h ${diff.minutes}m ${diff.seconds}s`)
    // }
    if (block.type === BlockType.Macro)
      totalMacroBlocks++
    if (diff.milliseconds < expectedBlockSeparationTime && block.type === BlockType.Macro) {
      console.log(`Block ${i} - Actual time: ${diff.milliseconds}ms`)
      count++
      unexpectedBlocks.push(i)
    }
    tracker.addNewDifference(diff.milliseconds)
  }
  lastTimestamp = timestamp

  if (i % 200 === 0) {
    console.log(`Progress: ${((i - firstBlock) / (lastBlock - firstBlock) * 100).toFixed(2)}%`)
    console.log(`${count}/${totalMacroBlocks} macro blocks with time < ${expectedBlockSeparationTime}ms`)
  }
}

console.log('Done!')
console.log(`${count}/${totalMacroBlocks} macro blocks with time < ${expectedBlockSeparationTime}ms`)
console.log('Unexpected blocks: ', unexpectedBlocks.join(', '))

