import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema, insertPatientSchema, insertAlertSettingsSchema } from "@shared/schema";
import { AnomalyDetectionService } from "./services/anomalyDetection";
import { RiskProfilingService } from "./services/riskProfiling";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mock user ID for demo purposes (in real app, this would come from auth)
  const DEMO_USER_ID = "demo-user-123";

  // Patients endpoints
  app.get("/api/patients", async (req, res) => {
    try {
      const patients = await storage.getPatients(DEMO_USER_ID);
      
      // Enrich with spending data
      const patientsWithStats = await Promise.all(
        patients.map(async (patient) => {
          const stats = await storage.getPatientSpendingStats(patient.id, 1); // Today
          const weekStats = await storage.getPatientSpendingStats(patient.id, 7); // This week
          const recentTransactions = await storage.getTransactions(patient.id, 10);
          const riskAssessment = await storage.getLatestRiskAssessment(patient.id);

          // Calculate risk profile
          const riskProfile = RiskProfilingService.assessRisk(patient, recentTransactions, riskAssessment);
          
          // Calculate weekly comparison
          const monthStats = await storage.getPatientSpendingStats(patient.id, 30);
          const weeklyComparison = monthStats.avgDaily > 0 
            ? Math.round(((weekStats.avgDaily - monthStats.avgDaily) / monthStats.avgDaily) * 100)
            : 0;

          const lastTransaction = recentTransactions[0];
          const lastTransactionTime = lastTransaction 
            ? `${Math.floor((Date.now() - new Date(lastTransaction.timestamp).getTime()) / (1000 * 60))}분 전`
            : "거래 없음";

          return {
            ...patient,
            todayWithdrawal: stats.totalSpent,
            weeklyComparison: weeklyComparison > 0 ? `+${weeklyComparison}%` : `${weeklyComparison}%`,
            lastTransaction: lastTransactionTime,
            riskLevel: riskProfile.riskLevel,
          };
        })
      );

      res.json(patientsWithStats);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const patient = await storage.getPatient(patientId);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient:", error);
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      const patientData = insertPatientSchema.parse({
        ...req.body,
        caregiverId: DEMO_USER_ID,
      });
      
      const patient = await storage.createPatient(patientData);
      res.json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(500).json({ message: "Failed to create patient" });
    }
  });

  // Transactions endpoints
  app.get("/api/patients/:id/transactions", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const transactions = await storage.getTransactions(patientId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/patients/:id/spending-trends", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      
      const trends = await storage.getSpendingTrends(patientId, days);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching spending trends:", error);
      res.status(500).json({ message: "Failed to fetch spending trends" });
    }
  });

  app.post("/api/patients/:id/transactions", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        patientId,
        timestamp: new Date(req.body.timestamp || Date.now()),
      });

      // Get recent transactions and patient data for anomaly detection
      const [recentTransactions, patient] = await Promise.all([
        storage.getTransactions(patientId, 20),
        storage.getPatient(patientId),
      ]);

      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      const avgSpending = parseFloat(patient.avgMonthlySpending || "0") / 30; // Daily average

      // Perform anomaly detection
      const anomalyResult = AnomalyDetectionService.detectAnomaly(
        transactionData,
        recentTransactions,
        avgSpending
      );

      // Create transaction with anomaly data
      const transaction = await storage.createTransaction({
        ...transactionData,
        isAnomaly: anomalyResult.isAnomaly,
        riskScore: anomalyResult.riskScore,
      });

      // If anomaly detected, create alert
      if (anomalyResult.isAnomaly) {
        const alertSettings = await storage.getAlertSettings(DEMO_USER_ID, patientId);
        
        const alertType = anomalyResult.riskScore >= 70 ? "긴급" : 
                         anomalyResult.riskScore >= 50 ? "고위험" : "중위험";
        
        const alert = await storage.createAlert({
          patientId,
          transactionId: transaction.id,
          type: alertType,
          title: `${alertType}: ${transaction.type} 거래 감지`,
          message: `${patient.name}님이 ${transaction.location || "알 수 없는 위치"}에서 ${Number(transaction.amount).toLocaleString()}원 ${transaction.type} 거래를 했습니다. 위험도: ${anomalyResult.riskScore}/100`,
          severity: RiskProfilingService.getAlertPriority(alertType === "긴급" ? "고위험" : alertType),
        });

        // Update risk assessment
        const riskFactors = AnomalyDetectionService.calculateRiskFactors(patientId, [...recentTransactions, transaction]);
        const totalScore = Math.round((riskFactors.frequencyScore + riskFactors.amountScore + riskFactors.timingScore + riskFactors.locationScore) / 4);
        
        await storage.createRiskAssessment({
          patientId,
          frequencyScore: riskFactors.frequencyScore,
          amountScore: riskFactors.amountScore,
          timingScore: riskFactors.timingScore,
          locationScore: riskFactors.locationScore,
          totalScore,
        });

        // Update patient risk level
        const newRiskLevel = totalScore >= 70 ? "고위험" : totalScore >= 40 ? "중위험" : "저위험";
        await storage.updatePatient(patientId, { riskLevel: newRiskLevel });
      }

      res.json({ transaction, anomaly: anomalyResult });
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Alerts endpoints
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getUnreadAlerts(DEMO_USER_ID);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.get("/api/patients/:id/alerts", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const alerts = await storage.getAlerts(patientId, limit);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching patient alerts:", error);
      res.status(500).json({ message: "Failed to fetch patient alerts" });
    }
  });

  app.patch("/api/alerts/:id/read", async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      await storage.markAlertAsRead(alertId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking alert as read:", error);
      res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });

  // Analytics endpoints
  app.get("/api/patients/:id/risk-assessment", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const [patient, recentTransactions, riskAssessment] = await Promise.all([
        storage.getPatient(patientId),
        storage.getTransactions(patientId, 30),
        storage.getLatestRiskAssessment(patientId),
      ]);

      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      const riskProfile = RiskProfilingService.assessRisk(patient, recentTransactions, riskAssessment);
      
      res.json({
        ...riskProfile,
        assessment: riskAssessment,
      });
    } catch (error) {
      console.error("Error fetching risk assessment:", error);
      res.status(500).json({ message: "Failed to fetch risk assessment" });
    }
  });

  app.get("/api/patients/:id/stats", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      
      const stats = await storage.getPatientSpendingStats(patientId, days);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching patient stats:", error);
      res.status(500).json({ message: "Failed to fetch patient stats" });
    }
  });

  // Activity feed endpoint
  app.get("/api/activity", async (req, res) => {
    try {
      const patients = await storage.getPatients(DEMO_USER_ID);
      const activities = [];

      for (const patient of patients) {
        const recentTransactions = await storage.getTransactions(patient.id, 5);
        
        for (const transaction of recentTransactions) {
          const timeAgo = Math.floor((Date.now() - new Date(transaction.timestamp).getTime()) / (1000 * 60));
          const riskLevel = transaction.riskScore >= 70 ? "고위험" : 
                           transaction.riskScore >= 50 ? "중위험" : "정상";
          
          activities.push({
            id: transaction.id,
            patientName: patient.name,
            description: `${transaction.type} - ${Number(transaction.amount).toLocaleString()}원`,
            location: transaction.merchant || transaction.location || "알 수 없는 위치",
            timeAgo: timeAgo === 0 ? "방금 전" : `${timeAgo}분 전`,
            riskLevel,
            isAnomaly: transaction.isAnomaly,
          });
        }
      }

      // Sort by most recent
      activities.sort((a, b) => a.id - b.id);
      
      res.json(activities.slice(0, 10)); // Return top 10 most recent
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Alert settings endpoints
  app.get("/api/patients/:id/alert-settings", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const settings = await storage.getAlertSettings(DEMO_USER_ID, patientId);
      
      res.json(settings || {
        caregiverId: DEMO_USER_ID,
        patientId,
        immediateAlerts: true,
        smsAlerts: true,
        dailySummary: false,
        threshold: "100000",
      });
    } catch (error) {
      console.error("Error fetching alert settings:", error);
      res.status(500).json({ message: "Failed to fetch alert settings" });
    }
  });

  app.post("/api/patients/:id/alert-settings", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const settingsData = insertAlertSettingsSchema.parse({
        ...req.body,
        caregiverId: DEMO_USER_ID,
        patientId,
      });
      
      const settings = await storage.upsertAlertSettings(settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error saving alert settings:", error);
      res.status(500).json({ message: "Failed to save alert settings" });
    }
  });

  // Analytics dashboard endpoint
  app.get("/api/dashboard/analytics", async (req, res) => {
    try {
      const patients = await storage.getPatients(DEMO_USER_ID);
      let totalSpent = 0;
      let totalAnomalies = 0;
      let totalTransactions = 0;

      for (const patient of patients) {
        const stats = await storage.getPatientSpendingStats(patient.id, 30);
        totalSpent += stats.totalSpent;
        totalAnomalies += stats.anomalyCount;
        totalTransactions += stats.transactionCount;
      }

      const avgDailySpending = totalTransactions > 0 ? totalSpent / 30 : 0;
      const preventedLoss = totalAnomalies * 500000; // Estimate 500k per prevented fraud

      res.json({
        avgDailySpending: Math.round(avgDailySpending),
        anomalyCount: totalAnomalies,
        preventedLoss,
        totalPatients: patients.length,
        totalTransactions,
      });
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
