import { Patient, Transaction, RiskAssessment } from "@shared/schema";

export interface RiskProfile {
  riskLevel: "고위험" | "중위험" | "저위험";
  totalScore: number;
  factors: {
    frequency: number;
    amount: number;
    timing: number;
    location: number;
  };
  recommendations: string[];
}

export class RiskProfilingService {
  static assessRisk(
    patient: Patient,
    recentTransactions: Transaction[],
    riskAssessment?: RiskAssessment
  ): RiskProfile {
    const factors = this.calculateRiskFactors(patient, recentTransactions);
    const totalScore = this.calculateTotalScore(factors);
    const riskLevel = this.determineRiskLevel(totalScore);
    const recommendations = this.generateRecommendations(riskLevel, factors, recentTransactions);

    return {
      riskLevel,
      totalScore,
      factors,
      recommendations,
    };
  }

  private static calculateRiskFactors(
    patient: Patient,
    recentTransactions: Transaction[]
  ): { frequency: number; amount: number; timing: number; location: number } {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const monthTransactions = recentTransactions.filter(
      t => new Date(t.timestamp) >= last30Days
    );
    const weekTransactions = recentTransactions.filter(
      t => new Date(t.timestamp) >= last7Days
    );

    // Frequency factor (거래 빈도)
    const dailyTransactionCount = weekTransactions.length / 7;
    let frequencyScore = 0;
    
    if (dailyTransactionCount > 5) {
      frequencyScore = 85;
    } else if (dailyTransactionCount > 3) {
      frequencyScore = 60;
    } else if (dailyTransactionCount > 2) {
      frequencyScore = 35;
    } else {
      frequencyScore = 15;
    }

    // Amount factor (거래 금액)
    const amounts = weekTransactions.map(t => parseFloat(t.amount));
    const totalWeeklyAmount = amounts.reduce((sum, amount) => sum + amount, 0);
    const avgMonthlySpending = parseFloat(patient.avgMonthlySpending || "0");
    
    let amountScore = 0;
    if (avgMonthlySpending > 0) {
      const weeklyRatio = (totalWeeklyAmount * 4) / avgMonthlySpending;
      if (weeklyRatio > 3) {
        amountScore = 85;
      } else if (weeklyRatio > 2) {
        amountScore = 60;
      } else if (weeklyRatio > 1.5) {
        amountScore = 40;
      } else {
        amountScore = 20;
      }
    } else {
      // If no historical data, base on absolute amounts
      if (totalWeeklyAmount > 1000000) {
        amountScore = 80;
      } else if (totalWeeklyAmount > 500000) {
        amountScore = 50;
      } else {
        amountScore = 20;
      }
    }

    // Timing factor (시간 패턴)
    const nightTransactions = weekTransactions.filter(t => {
      const hour = new Date(t.timestamp).getHours();
      return hour >= 22 || hour <= 7;
    });
    const timingScore = weekTransactions.length > 0 
      ? Math.round((nightTransactions.length / weekTransactions.length) * 100)
      : 0;

    // Location factor (위치 이상)
    const uniqueLocations = new Set(
      weekTransactions.map(t => t.location).filter(Boolean)
    );
    let locationScore = 0;
    
    if (uniqueLocations.size > 10) {
      locationScore = 80;
    } else if (uniqueLocations.size > 7) {
      locationScore = 60;
    } else if (uniqueLocations.size > 5) {
      locationScore = 40;
    } else {
      locationScore = 20;
    }

    // Adjust for dementia stage
    const dementiaMultiplier = this.getDementiaRiskMultiplier(patient.dementiaStage);
    
    return {
      frequency: Math.min(Math.round(frequencyScore * dementiaMultiplier), 100),
      amount: Math.min(Math.round(amountScore * dementiaMultiplier), 100),
      timing: Math.min(Math.round(timingScore * dementiaMultiplier), 100),
      location: Math.min(Math.round(locationScore * dementiaMultiplier), 100),
    };
  }

  private static getDementiaRiskMultiplier(dementiaStage?: string | null): number {
    if (!dementiaStage) return 1.0;
    
    switch (dementiaStage.toLowerCase()) {
      case "경도":
        return 1.1;
      case "중등도":
        return 1.3;
      case "중증":
        return 1.5;
      default:
        return 1.0;
    }
  }

  private static calculateTotalScore(factors: {
    frequency: number;
    amount: number;
    timing: number;
    location: number;
  }): number {
    // Weighted average with different importance for each factor
    const weights = {
      frequency: 0.3,  // 30% - transaction frequency is very important
      amount: 0.4,     // 40% - amount is the most critical
      timing: 0.15,    // 15% - unusual timing
      location: 0.15,  // 15% - location changes
    };

    return Math.round(
      factors.frequency * weights.frequency +
      factors.amount * weights.amount +
      factors.timing * weights.timing +
      factors.location * weights.location
    );
  }

  private static determineRiskLevel(totalScore: number): "고위험" | "중위험" | "저위험" {
    if (totalScore >= 70) {
      return "고위험";
    } else if (totalScore >= 40) {
      return "중위험";
    } else {
      return "저위험";
    }
  }

  private static generateRecommendations(
    riskLevel: "고위험" | "중위험" | "저위험",
    factors: { frequency: number; amount: number; timing: number; location: number },
    recentTransactions: Transaction[]
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === "고위험") {
      recommendations.push("즉시 환자와 연락하여 최근 거래 내역을 확인하세요");
      recommendations.push("필요시 금융기관에 연락하여 거래 제한을 요청하세요");
      
      if (factors.amount > 70) {
        recommendations.push("대용량 거래가 감지되었습니다. 사기 피해 가능성을 확인하세요");
      }
      
      if (factors.frequency > 70) {
        recommendations.push("비정상적으로 잦은 거래가 발생하고 있습니다");
      }
    } else if (riskLevel === "중위험") {
      recommendations.push("환자의 최근 활동을 주의 깊게 모니터링하세요");
      recommendations.push("정기적으로 거래 내역을 확인해주세요");
      
      if (factors.timing > 50) {
        recommendations.push("심야 시간대 거래가 증가했습니다. 주의가 필요합니다");
      }
    } else {
      recommendations.push("현재 안정적인 거래 패턴을 보이고 있습니다");
      recommendations.push("주간 모니터링을 계속 유지하세요");
    }

    // Check for specific patterns
    const atmTransactions = recentTransactions.filter(t => t.type === "ATM");
    if (atmTransactions.length > 3) {
      recommendations.push("ATM 출금 빈도가 높습니다. 현금 사용 패턴을 확인하세요");
    }

    const anomalies = recentTransactions.filter(t => t.isAnomaly);
    if (anomalies.length > 0) {
      recommendations.push(`${anomalies.length}건의 이상 거래가 감지되었습니다`);
    }

    return recommendations;
  }

  static getAlertPriority(riskLevel: string): "high" | "medium" | "low" {
    switch (riskLevel) {
      case "고위험":
        return "high";
      case "중위험":
        return "medium";
      default:
        return "low";
    }
  }

  static shouldSendImmediateAlert(
    riskScore: number,
    transactionAmount: number,
    alertSettings?: { threshold: string; immediateAlerts: boolean }
  ): boolean {
    if (!alertSettings?.immediateAlerts) return false;
    
    const threshold = parseFloat(alertSettings.threshold || "100000");
    
    return riskScore >= 70 || transactionAmount >= threshold;
  }
}
