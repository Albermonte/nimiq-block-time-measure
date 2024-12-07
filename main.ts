import { NimiqRPCClient } from "npm:nimiq-rpc-client-ts"
import { AverageTimeTracker, calculateTimeDiff, sleep } from "./utils.ts";
import "jsr:@std/dotenv/load";

const url = Deno.env.get("NIMIQ_RPC_URL")
if (!url) {
  throw new Error("NIMIQ_RPC_URL is required")
}

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

const expectedDiff = calculateTimeDiff(blockSeparationTime * increment, 0)
const tracker = new AverageTimeTracker();

for (let i = firstBlock; i <= lastBlock; i += increment) {
  const { data: block, error: errorBlock } = await client.blockchain.getBlockByNumber(i)
  if (errorBlock) {
    console.error(`Error fetching block ${i}: `, errorBlock)
    await sleep(1000)
    i -= increment
    continue
  }

  const { timestamp } = block
  if (lastTimestamp !== 0) {
    const diff = calculateTimeDiff(lastTimestamp, timestamp)
    // if (diff.hours !== expectedDiff.hours || diff.minutes !== expectedDiff.minutes || diff.seconds !== expectedDiff.seconds || diff.milliseconds !== expectedDiff.milliseconds) {
    //   console.log(`Block ${i} - Actual time: ${diff.hours}h ${diff.minutes}m ${diff.seconds}s`)
    // }
    if (diff.milliseconds < blockSeparationTime) {
      // console.log(`Block ${i} - Actual time: ${diff.milliseconds}ms`)
      count++
    }
    tracker.addNewDifference(diff.milliseconds)
  }
  lastTimestamp = timestamp

  if (i % 100 === 0) {
    console.log(`Progress: ${((i - firstBlock) / (lastBlock - firstBlock) * 100).toFixed(2)}%`)
    console.log(`Average time: ${tracker.getFormattedAverage()}, ${count} blocks with time < ${blockSeparationTime}ms`)
  }
}
