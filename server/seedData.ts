import { db } from "./db";
import { users, patients, transactions, alerts, riskAssessments, alertSettings } from "@shared/schema";

const DEMO_USER_ID = "demo-user-123";

export async function seedDatabase() {
  try {
    console.log("Starting database seeding...");

    // Insert demo user
    await db.insert(users).values({
      id: DEMO_USER_ID,
      email: "caregiver@example.com",
      firstName: "김",
      lastName: "보호자",
      profileImageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    }).onConflictDoNothing();

    // Insert demo patients
    const patientData = [
      {
        name: "김할머니",
        age: 78,
        caregiverId: DEMO_USER_ID,
        riskLevel: "고위험" as const,
        dementiaStage: "중등도",
        avgMonthlySpending: "850000",
        profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
      },
      {
        name: "박할아버지",
        age: 82,
        caregiverId: DEMO_USER_ID,
        riskLevel: "중위험" as const,
        dementiaStage: "경도",
        avgMonthlySpending: "650000",
        profileImageUrl: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
      },
      {
        name: "이할머니",
        age: 75,
        caregiverId: DEMO_USER_ID,
        riskLevel: "저위험" as const,
        dementiaStage: "경도",
        avgMonthlySpending: "420000",
        profileImageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
      },
    ];

    const insertedPatients = await db.insert(patients).values(patientData).returning();
    console.log(`Inserted ${insertedPatients.length} patients`);

    // Generate transactions for each patient
    const now = new Date();
    const transactionData = [];

    for (const patient of insertedPatients) {
      // Generate 30 days of transactions
      for (let day = 0; day < 30; day++) {
        const transactionDate = new Date(now);
        transactionDate.setDate(transactionDate.getDate() - day);
        
        // Generate 1-4 transactions per day
        const transactionCount = Math.floor(Math.random() * 4) + 1;
        
        for (let i = 0; i < transactionCount; i++) {
          const hour = Math.floor(Math.random() * 24);
          const minute = Math.floor(Math.random() * 60);
          transactionDate.setHours(hour, minute);

          const transactionTypes = ["ATM", "카드결제", "온라인", "계좌이체"];
          const locations = [
            "서울 강남구 논현동",
            "서울 서초구 방배동", 
            "경기 성남시 분당구",
            "서울 종로구 명동",
            "서울 마포구 홍대입구역",
            "인천 부평구",
            "경기 고양시 일산동구"
          ];
          const merchants = [
            "이마트 논현점",
            "롯데마트 서초점",
            "GS25 분당점",
            "올리브영 명동점",
            "스타벅스 홍대점",
            "맥도날드 부평점",
            "파리바게뜨 일산점",
            "온라인쇼핑몰",
            "병원",
            "약국"
          ];

          let amount: number;
          let isAnomaly = false;
          let riskScore = 0;

          // Determine transaction characteristics based on patient risk level
          if (patient.riskLevel === "고위험") {
            // High risk patients have more anomalous transactions
            if (Math.random() < 0.3) {
              amount = Math.floor(Math.random() * 800000) + 200000; // 200k-1M
              isAnomaly = true;
              riskScore = Math.floor(Math.random() * 30) + 70; // 70-100
            } else {
              amount = Math.floor(Math.random() * 150000) + 10000; // 10k-160k
              riskScore = Math.floor(Math.random() * 40) + 20; // 20-60
            }
          } else if (patient.riskLevel === "중위험") {
            if (Math.random() < 0.15) {
              amount = Math.floor(Math.random() * 300000) + 100000; // 100k-400k
              isAnomaly = true;
              riskScore = Math.floor(Math.random() * 30) + 50; // 50-80
            } else {
              amount = Math.floor(Math.random() * 80000) + 5000; // 5k-85k
              riskScore = Math.floor(Math.random() * 30) + 10; // 10-40
            }
          } else {
            // Low risk patients have mostly normal transactions
            if (Math.random() < 0.05) {
              amount = Math.floor(Math.random() * 150000) + 50000; // 50k-200k
              isAnomaly = true;
              riskScore = Math.floor(Math.random() * 20) + 40; // 40-60
            } else {
              amount = Math.floor(Math.random() * 50000) + 3000; // 3k-53k
              riskScore = Math.floor(Math.random() * 20) + 5; // 5-25
            }
          }

          // Make some night transactions more risky
          if (hour >= 23 || hour <= 6) {
            riskScore += 15;
            if (riskScore >= 50) {
              isAnomaly = true;
            }
          }

          transactionData.push({
            patientId: patient.id,
            amount: amount.toString(),
            type: transactionTypes[Math.floor(Math.random() * transactionTypes.length)],
            location: locations[Math.floor(Math.random() * locations.length)],
            merchant: merchants[Math.floor(Math.random() * merchants.length)],
            description: `${merchants[Math.floor(Math.random() * merchants.length)]} 거래`,
            timestamp: new Date(transactionDate),
            isAnomaly,
            riskScore: Math.min(riskScore, 100),
          });
        }
      }
    }

    const insertedTransactions = await db.insert(transactions).values(transactionData).returning();
    console.log(`Inserted ${insertedTransactions.length} transactions`);

    // Generate alerts for high-risk transactions
    const alertData = [];
    const highRiskTransactions = insertedTransactions.filter(t => t.isAnomaly);

    for (const transaction of highRiskTransactions.slice(0, 15)) { // Limit to 15 alerts
      const patient = insertedPatients.find(p => p.id === transaction.patientId);
      if (!patient) continue;

      const alertType = transaction.riskScore >= 80 ? "긴급" : 
                       transaction.riskScore >= 60 ? "고위험" : "중위험";
      
      const severity = transaction.riskScore >= 80 ? "high" : 
                      transaction.riskScore >= 60 ? "high" : "medium";

      alertData.push({
        patientId: transaction.patientId,
        transactionId: transaction.id,
        type: alertType,
        title: `${alertType}: ${transaction.type} 거래 감지`,
        message: `${patient.name}님이 ${transaction.location}에서 ${Number(transaction.amount).toLocaleString()}원 ${transaction.type} 거래를 했습니다. 위험도: ${transaction.riskScore}/100`,
        isRead: Math.random() < 0.3, // 30% chance of being read
        severity,
        createdAt: transaction.timestamp,
      });
    }

    if (alertData.length > 0) {
      await db.insert(alerts).values(alertData);
      console.log(`Inserted ${alertData.length} alerts`);
    }

    // Generate risk assessments for each patient
    const riskAssessmentData = insertedPatients.map(patient => {
      const baseScore = patient.riskLevel === "고위험" ? 75 : 
                       patient.riskLevel === "중위험" ? 50 : 25;
      
      return {
        patientId: patient.id,
        frequencyScore: Math.min(baseScore + Math.floor(Math.random() * 20) - 10, 100),
        amountScore: Math.min(baseScore + Math.floor(Math.random() * 20) - 10, 100),
        timingScore: Math.min(baseScore + Math.floor(Math.random() * 20) - 10, 100),
        locationScore: Math.min(baseScore + Math.floor(Math.random() * 20) - 10, 100),
        totalScore: baseScore,
      };
    });

    await db.insert(riskAssessments).values(riskAssessmentData);
    console.log(`Inserted ${riskAssessmentData.length} risk assessments`);

    // Generate alert settings for each patient
    const alertSettingsData = insertedPatients.map(patient => ({
      caregiverId: DEMO_USER_ID,
      patientId: patient.id,
      immediateAlerts: true,
      smsAlerts: patient.riskLevel === "고위험",
      dailySummary: false,
      threshold: patient.riskLevel === "고위험" ? "50000" : 
                patient.riskLevel === "중위험" ? "100000" : "200000",
    }));

    await db.insert(alertSettings).values(alertSettingsData);
    console.log(`Inserted ${alertSettingsData.length} alert settings`);

    console.log("Database seeding completed successfully!");
    return true;
  } catch (error) {
    console.error("Error seeding database:", error);
    return false;
  }
}