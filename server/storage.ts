import {
  users,
  patients,
  transactions,
  alerts,
  riskAssessments,
  alertSettings,
  type User,
  type UpsertUser,
  type Patient,
  type InsertPatient,
  type Transaction,
  type InsertTransaction,
  type Alert,
  type InsertAlert,
  type RiskAssessment,
  type InsertRiskAssessment,
  type AlertSettings,
  type InsertAlertSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count, avg, sum } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Patient operations
  getPatients(caregiverId: string): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient>;
  
  // Transaction operations
  getTransactions(patientId: number, limit?: number): Promise<Transaction[]>;
  getTransactionsByDateRange(patientId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getRecentAnomalies(patientId: number, limit?: number): Promise<Transaction[]>;
  
  // Alert operations
  getAlerts(patientId: number, limit?: number): Promise<Alert[]>;
  getUnreadAlerts(caregiverId: string): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number): Promise<void>;
  
  // Risk assessment operations
  getLatestRiskAssessment(patientId: number): Promise<RiskAssessment | undefined>;
  createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment>;
  
  // Alert settings operations
  getAlertSettings(caregiverId: string, patientId: number): Promise<AlertSettings | undefined>;
  upsertAlertSettings(settings: InsertAlertSettings): Promise<AlertSettings>;
  
  // Analytics operations
  getPatientSpendingStats(patientId: number, days: number): Promise<{
    totalSpent: number;
    avgDaily: number;
    transactionCount: number;
    anomalyCount: number;
  }>;
  
  getSpendingTrends(patientId: number, days: number): Promise<{
    date: string;
    amount: number;
    isAnomaly: boolean;
  }[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Patient operations
  async getPatients(caregiverId: string): Promise<Patient[]> {
    return await db
      .select()
      .from(patients)
      .where(and(eq(patients.caregiverId, caregiverId), eq(patients.isActive, true)))
      .orderBy(desc(patients.updatedAt));
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [newPatient] = await db.insert(patients).values(patient).returning();
    return newPatient;
  }

  async updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient> {
    const [updatedPatient] = await db
      .update(patients)
      .set({ ...patient, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return updatedPatient;
  }

  // Transaction operations
  async getTransactions(patientId: number, limit = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.patientId, patientId))
      .orderBy(desc(transactions.timestamp))
      .limit(limit);
  }

  async getTransactionsByDateRange(
    patientId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.patientId, patientId),
          gte(transactions.timestamp, startDate),
          lte(transactions.timestamp, endDate)
        )
      )
      .orderBy(desc(transactions.timestamp));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getRecentAnomalies(patientId: number, limit = 10): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.patientId, patientId), eq(transactions.isAnomaly, true)))
      .orderBy(desc(transactions.timestamp))
      .limit(limit);
  }

  // Alert operations
  async getAlerts(patientId: number, limit = 20): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.patientId, patientId))
      .orderBy(desc(alerts.createdAt))
      .limit(limit);
  }

  async getUnreadAlerts(caregiverId: string): Promise<Alert[]> {
    return await db
      .select({
        id: alerts.id,
        patientId: alerts.patientId,
        transactionId: alerts.transactionId,
        type: alerts.type,
        title: alerts.title,
        message: alerts.message,
        isRead: alerts.isRead,
        isResolved: alerts.isResolved,
        severity: alerts.severity,
        createdAt: alerts.createdAt,
      })
      .from(alerts)
      .innerJoin(patients, eq(alerts.patientId, patients.id))
      .where(and(eq(patients.caregiverId, caregiverId), eq(alerts.isRead, false)))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(alerts).values(alert).returning();
    return newAlert;
  }

  async markAlertAsRead(id: number): Promise<void> {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
  }

  // Risk assessment operations
  async getLatestRiskAssessment(patientId: number): Promise<RiskAssessment | undefined> {
    const [assessment] = await db
      .select()
      .from(riskAssessments)
      .where(eq(riskAssessments.patientId, patientId))
      .orderBy(desc(riskAssessments.assessmentDate))
      .limit(1);
    return assessment;
  }

  async createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment> {
    const [newAssessment] = await db.insert(riskAssessments).values(assessment).returning();
    return newAssessment;
  }

  // Alert settings operations
  async getAlertSettings(caregiverId: string, patientId: number): Promise<AlertSettings | undefined> {
    const [settings] = await db
      .select()
      .from(alertSettings)
      .where(and(eq(alertSettings.caregiverId, caregiverId), eq(alertSettings.patientId, patientId)));
    return settings;
  }

  async upsertAlertSettings(settings: InsertAlertSettings): Promise<AlertSettings> {
    const [alertSetting] = await db
      .insert(alertSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: [alertSettings.caregiverId, alertSettings.patientId],
        set: {
          ...settings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return alertSetting;
  }

  // Analytics operations
  async getPatientSpendingStats(patientId: number, days: number): Promise<{
    totalSpent: number;
    avgDaily: number;
    transactionCount: number;
    anomalyCount: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [stats] = await db
      .select({
        totalSpent: sum(transactions.amount),
        avgDaily: avg(transactions.amount),
        transactionCount: count(transactions.id),
        anomalyCount: sql<number>`COUNT(CASE WHEN ${transactions.isAnomaly} = true THEN 1 END)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.patientId, patientId),
          gte(transactions.timestamp, startDate)
        )
      );

    return {
      totalSpent: Number(stats.totalSpent || 0),
      avgDaily: Number(stats.avgDaily || 0),
      transactionCount: stats.transactionCount,
      anomalyCount: Number(stats.anomalyCount || 0),
    };
  }

  async getSpendingTrends(patientId: number, days: number): Promise<{
    date: string;
    amount: number;
    isAnomaly: boolean;
  }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await db
      .select({
        date: sql<string>`DATE(${transactions.timestamp})`,
        amount: sum(transactions.amount),
        isAnomaly: sql<boolean>`BOOL_OR(${transactions.isAnomaly})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.patientId, patientId),
          gte(transactions.timestamp, startDate)
        )
      )
      .groupBy(sql`DATE(${transactions.timestamp})`)
      .orderBy(sql`DATE(${transactions.timestamp})`);

    return trends.map(trend => ({
      date: trend.date,
      amount: Number(trend.amount || 0),
      isAnomaly: trend.isAnomaly,
    }));
  }
}

export const storage = new DatabaseStorage();
