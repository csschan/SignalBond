import { prisma } from "@/lib/prisma";
import {
  SLASH_RATE,
  SLASH_BUYER_SHARE,
  SLASH_CHALLENGER_SHARE,
  SLASH_PROTOCOL_SHARE,
  REPUTATION,
  EXPIRED_ACCESS_FEE_REFUND_RATE,
} from "@/lib/constants";

export async function settleSignal(signalId: string, currentPrice: number) {
  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
    include: { purchases: true, challenges: true, agent: true },
  });

  if (!signal) throw new Error("Signal not found");
  if (["SUCCESS", "FAILED", "EXPIRED", "SETTLED", "CANCELLED"].includes(signal.status)) {
    throw new Error("Signal already resolved");
  }

  const now = new Date();
  const expired = now >= new Date(signal.expiryTime);

  let result: "SUCCESS" | "FAILED" | "EXPIRED";

  if (signal.direction === "LONG") {
    if (currentPrice >= signal.takeProfit) result = "SUCCESS";
    else if (currentPrice <= signal.stopLoss) result = "FAILED";
    else if (expired) result = "EXPIRED";
    else return null; // not yet resolved
  } else {
    if (currentPrice <= signal.takeProfit) result = "SUCCESS";
    else if (currentPrice >= signal.stopLoss) result = "FAILED";
    else if (expired) result = "EXPIRED";
    else return null;
  }

  // Calculate settlement amounts
  let slashAmount = 0;
  let buyerRefundPool = 0;
  let buyerCompensationPool = 0;
  let challengerRewardPool = 0;
  let protocolFee = 0;
  let agentPayout = 0;
  let challengerLossPool = 0;

  const totalAccessFees = signal.purchases.reduce((sum, p) => sum + p.amountUsdc, 0);
  const totalChallengeAmount = signal.challenges.reduce((sum, c) => sum + c.challengeAmount, 0);

  if (result === "SUCCESS") {
    // Agent wins: gets bond back + all access fees + all challenge stakes
    agentPayout = signal.bondAmount + totalAccessFees + totalChallengeAmount;
    // Challengers lose their entire stake
    challengerLossPool = totalChallengeAmount;
  } else if (result === "FAILED") {
    slashAmount = signal.bondAmount * SLASH_RATE;
    buyerCompensationPool = slashAmount * SLASH_BUYER_SHARE;
    challengerRewardPool = slashAmount * SLASH_CHALLENGER_SHARE;
    protocolFee = slashAmount * SLASH_PROTOCOL_SHARE;
    buyerRefundPool = totalAccessFees; // full refund on failure
  } else {
    // EXPIRED: partial refund
    buyerRefundPool = totalAccessFees * EXPIRED_ACCESS_FEE_REFUND_RATE;
  }

  // Update signal
  await prisma.signal.update({
    where: { id: signalId },
    data: {
      status: "SETTLED",
      settlementPrice: currentPrice,
      settlementResult: result,
      settledAt: now,
    },
  });

  // Create settlement record
  await prisma.settlement.create({
    data: {
      signalId,
      result,
      slashAmount,
      buyerRefundPool,
      buyerCompensationPool,
      challengerRewardPool,
      protocolFee,
      agentPayout,
      challengerLossPool,
    },
  });

  // Update agent
  const repChange = calculateReputationChange(result, signal.bondAmount, signal.agent.consecutiveFails);
  const newConsecutiveFails = result === "FAILED" ? signal.agent.consecutiveFails + 1 : 0;

  await prisma.agent.update({
    where: { id: signal.agentId },
    data: {
      reputationScore: { increment: repChange },
      successCount: result === "SUCCESS" ? { increment: 1 } : undefined,
      failureCount: result === "FAILED" ? { increment: 1 } : undefined,
      expiredCount: result === "EXPIRED" ? { increment: 1 } : undefined,
      totalSlashedUsdc: { increment: slashAmount },
      totalRevenueUsdc: result === "SUCCESS" ? { increment: totalAccessFees } : undefined,
      balance: result === "SUCCESS"
        ? { increment: signal.bondAmount + totalAccessFees + totalChallengeAmount }
        : result === "FAILED"
        ? { increment: signal.bondAmount - slashAmount - buyerRefundPool }
        : { increment: signal.bondAmount + totalAccessFees * (1 - EXPIRED_ACCESS_FEE_REFUND_RATE) },
      consecutiveFails: newConsecutiveFails,
    },
  });

  // Update buyers
  if (result === "FAILED") {
    const buyerCount = signal.purchases.length;
    const perBuyerRefund = buyerCount > 0 ? buyerRefundPool / buyerCount : 0;
    const perBuyerComp = buyerCount > 0 ? buyerCompensationPool / buyerCount : 0;

    for (const purchase of signal.purchases) {
      await prisma.signalPurchase.update({
        where: { id: purchase.id },
        data: {
          refundAmount: perBuyerRefund,
          compensationAmount: perBuyerComp,
          status: "COMPENSATED",
        },
      });
      await prisma.user.update({
        where: { id: purchase.userId },
        data: { balance: { increment: perBuyerRefund + perBuyerComp }, totalRewardsUsdc: { increment: perBuyerComp } },
      });
    }
  } else if (result === "EXPIRED") {
    const buyerCount = signal.purchases.length;
    const perBuyerRefund = buyerCount > 0 ? buyerRefundPool / buyerCount : 0;

    for (const purchase of signal.purchases) {
      await prisma.signalPurchase.update({
        where: { id: purchase.id },
        data: { refundAmount: perBuyerRefund, status: "REFUNDED" },
      });
      await prisma.user.update({
        where: { id: purchase.userId },
        data: { balance: { increment: perBuyerRefund } },
      });
    }
  }

  // Update challengers
  if (result === "FAILED") {
    const challengerCount = signal.challenges.length;
    const perChallengerReward = challengerCount > 0 ? challengerRewardPool / challengerCount : 0;

    for (const challenge of signal.challenges) {
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: {
          rewardAmount: perChallengerReward,
          status: "WON",
        },
      });
      await prisma.user.update({
        where: { id: challenge.userId },
        data: {
          balance: { increment: challenge.challengeAmount + perChallengerReward },
          totalRewardsUsdc: { increment: perChallengerReward },
        },
      });
    }
  } else if (result === "SUCCESS") {
    for (const challenge of signal.challenges) {
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: { status: "LOST" },
      });
    }
  } else {
    // EXPIRED: return challenge stakes (neutral — not a win)
    for (const challenge of signal.challenges) {
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: { status: "RETURNED" },
      });
      await prisma.user.update({
        where: { id: challenge.userId },
        data: { balance: { increment: challenge.challengeAmount } },
      });
    }
  }

  return { result, slashAmount, buyerRefundPool, buyerCompensationPool, challengerRewardPool, protocolFee, agentPayout, challengerLossPool };
}

function calculateReputationChange(result: string, bondAmount: number, consecutiveFails: number): number {
  if (result === "EXPIRED") return 0;

  if (result === "SUCCESS") {
    let gain = REPUTATION.SUCCESS_GAIN;
    if (bondAmount >= REPUTATION.HIGH_BOND_BONUS_THRESHOLD) {
      gain += REPUTATION.HIGH_BOND_SUCCESS_BONUS;
    }
    return gain;
  }

  // FAILED
  let loss = -REPUTATION.FAILURE_LOSS;
  if (consecutiveFails + 1 >= REPUTATION.CONSECUTIVE_FAIL_THRESHOLD) {
    loss -= REPUTATION.CONSECUTIVE_FAIL_PENALTY;
  }
  return loss;
}
