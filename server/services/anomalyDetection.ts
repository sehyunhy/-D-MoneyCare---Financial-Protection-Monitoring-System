import { Transaction } from "@shared/schema";

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  riskScore: number;
  reasons: string[];
}

export class AnomalyDetectionService {
  private static readonly NORMAL_TRANSACTION_TYPES = [
    "식료품",
    "대중교통",
    "의료비",
    "생필품",
    "약국"
  ];

  private static readonly HIGH_RISK_KEYWORDS = [
    "선물",
    "송금",
    "투자",
    "대출",
    "보험가입",
    "펀드",
    "주식"
  ];

  static detectAnomaly(
    transaction: Omit<Transaction, "id" | "createdAt">,
    recentTransactions: Transaction[],
    patientAvgSpending: number
  ): AnomalyDetectionResult {
    const reasons: string[] = [];
    let riskScore = 0;

    // 1. Amount-based detection
    const amountRisk = this.analyzeAmount(transaction.amount, patientAvgSpending, recentTransactions);
    riskScore += amountRisk.score;
    reasons.push(...amountRisk.reasons);

    // 2. Frequency-based detection
    const frequencyRisk = this.analyzeFrequency(transaction, recentTransactions);
    riskScore += frequencyRisk.score;
    reasons.push(...frequencyRisk.reasons);

    // 3. Time-based detection
    const timeRisk = this.analyzeTime(transaction.timestamp);
    riskScore += timeRisk.score;
    reasons.push(...timeRisk.reasons);

    // 4. Merchant/Description analysis
    const merchantRisk = this.analyzeMerchant(transaction.merchant, transaction.description);
    riskScore += merchantRisk.score;
    reasons.push(...merchantRisk.reasons);

    // 5. Location analysis
    const locationRisk = this.analyzeLocation(transaction.location, recentTransactions);
    riskScore += locationRisk.score;
    reasons.push(...locationRisk.reasons);

    // Cap the risk score at 100
    riskScore = Math.min(riskScore, 100);

    return {
      isAnomaly: riskScore >= 30, // Threshold for anomaly
      riskScore,
      reasons: reasons.filter(Boolean)
    };
  }

  private static analyzeAmount(
    amount: string,
    avgSpending: number,
    recentTransactions: Transaction[]
  ): { score: number; reasons: string[] } {
    const transactionAmount = parseFloat(amount);
    const reasons: string[] = [];
    let score = 0;

    // Compare with personal average
    if (avgSpending > 0) {
      const ratio = transactionAmount / avgSpending;
      if (ratio > 3) {
        score += 40;
        reasons.push(`평균 지출 대비 ${Math.round(ratio)}배 초과`);
      } else if (ratio > 2) {
        score += 25;
        reasons.push(`평균 지출 대비 ${Math.round(ratio)}배 초과`);
      }
    }

    // Compare with recent transactions
    if (recentTransactions.length > 0) {
      const recentAmounts = recentTransactions.map(t => parseFloat(t.amount));
      const recentAvg = recentAmounts.reduce((a, b) => a + b, 0) / recentAmounts.length;
      const ratio = transactionAmount / recentAvg;
      
      if (ratio > 5) {
        score += 30;
        reasons.push(`최근 거래 대비 ${Math.round(ratio)}배 초과`);
      } else if (ratio > 3) {
        score += 20;
        reasons.push(`최근 거래 대비 ${Math.round(ratio)}배 초과`);
      }
    }

    // Absolute amount thresholds
    if (transactionAmount >= 1000000) {
      score += 35;
      reasons.push("100만원 이상 대용량 거래");
    } else if (transactionAmount >= 500000) {
      score += 20;
      reasons.push("50만원 이상 고액 거래");
    }

    return { score, reasons };
  }

  private static analyzeFrequency(
    transaction: Omit<Transaction, "id" | "createdAt">,
    recentTransactions: Transaction[]
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Check transactions in the last 24 hours
    const last24Hours = new Date(transaction.timestamp);
    last24Hours.setHours(last24Hours.getHours() - 24);
    
    const recentCount = recentTransactions.filter(
      t => new Date(t.timestamp) >= last24Hours
    ).length;

    if (recentCount >= 5) {
      score += 30;
      reasons.push(`24시간 내 ${recentCount}번의 거래`);
    } else if (recentCount >= 3) {
      score += 15;
      reasons.push(`24시간 내 ${recentCount}번의 거래`);
    }

    // Check ATM withdrawals specifically
    if (transaction.type === "ATM") {
      const atmCount = recentTransactions.filter(
        t => t.type === "ATM" && new Date(t.timestamp) >= last24Hours
      ).length;

      if (atmCount >= 3) {
        score += 25;
        reasons.push(`하루 내 ${atmCount}번의 ATM 출금`);
      }
    }

    return { score, reasons };
  }

  private static analyzeTime(timestamp: Date): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;
    const hour = timestamp.getHours();

    // Late night or very early morning transactions (11 PM - 6 AM)
    if (hour >= 23 || hour <= 6) {
      score += 20;
      reasons.push("비정상적인 시간대 거래 (심야/새벽)");
    }

    return { score, reasons };
  }

  private static analyzeMerchant(
    merchant: string | null,
    description: string | null
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    const text = `${merchant || ""} ${description || ""}`.toLowerCase();

    // Check for high-risk keywords
    for (const keyword of this.HIGH_RISK_KEYWORDS) {
      if (text.includes(keyword)) {
        score += 25;
        reasons.push(`위험 키워드 감지: ${keyword}`);
        break; // Only add once for keywords
      }
    }

    // Check for online/phone transactions
    if (text.includes("온라인") || text.includes("인터넷") || text.includes("전화")) {
      score += 15;
      reasons.push("온라인/전화 거래");
    }

    // Check for unknown or suspicious merchants
    if (merchant && (merchant.includes("알수없음") || merchant.includes("미확인"))) {
      score += 20;
      reasons.push("알 수 없는 가맹점");
    }

    return { score, reasons };
  }

  private static analyzeLocation(
    location: string | null,
    recentTransactions: Transaction[]
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    if (!location) return { score, reasons };

    // Check if location is far from usual locations
    const recentLocations = recentTransactions
      .map(t => t.location)
      .filter(Boolean)
      .slice(0, 10); // Last 10 transactions

    if (recentLocations.length > 0) {
      const isUnusualLocation = !recentLocations.some(loc => 
        loc && this.isSimilarLocation(location, loc)
      );

      if (isUnusualLocation) {
        score += 15;
        reasons.push("비정상적인 거래 위치");
      }
    }

    return { score, reasons };
  }

  private static isSimilarLocation(loc1: string, loc2: string): boolean {
    // Simple similarity check - in a real system, you'd use proper geolocation
    const words1 = loc1.toLowerCase().split(/\s+/);
    const words2 = loc2.toLowerCase().split(/\s+/);
    
    return words1.some(word => words2.includes(word));
  }

  static calculateRiskFactors(
    patientId: number,
    recentTransactions: Transaction[]
  ): {
    frequencyScore: number;
    amountScore: number;
    timingScore: number;
    locationScore: number;
  } {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weekTransactions = recentTransactions.filter(
      t => new Date(t.timestamp) >= last7Days
    );

    // Frequency analysis
    const dailyTransactionCount = weekTransactions.length / 7;
    const frequencyScore = Math.min(dailyTransactionCount * 20, 100);

    // Amount analysis
    const amounts = weekTransactions.map(t => parseFloat(t.amount));
    const avgAmount = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
    const amountScore = Math.min(avgAmount / 10000, 100); // Scale by 10k

    // Timing analysis
    const nightTransactions = weekTransactions.filter(t => {
      const hour = new Date(t.timestamp).getHours();
      return hour >= 23 || hour <= 6;
    });
    const timingScore = (nightTransactions.length / weekTransactions.length) * 100;

    // Location analysis
    const uniqueLocations = new Set(weekTransactions.map(t => t.location).filter(Boolean));
    const locationScore = Math.min(uniqueLocations.size * 15, 100);

    return {
      frequencyScore: Math.round(frequencyScore),
      amountScore: Math.round(amountScore),
      timingScore: Math.round(timingScore),
      locationScore: Math.round(locationScore),
    };
  }
}
