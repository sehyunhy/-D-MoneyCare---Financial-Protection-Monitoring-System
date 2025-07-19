import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Patients being monitored
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  age: integer("age").notNull(),
  profileImageUrl: varchar("profile_image_url"),
  caregiverId: varchar("caregiver_id").notNull(),
  riskLevel: varchar("risk_level", { length: 20 }).notNull().default("저위험"), // 고위험, 중위험, 저위험
  dementiaStage: varchar("dementia_stage", { length: 50 }),
  avgMonthlySpending: decimal("avg_monthly_spending", { precision: 12, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // ATM, 온라인, 카드결제, 계좌이체
  location: varchar("location", { length: 200 }),
  merchant: varchar("merchant", { length: 200 }),
  description: text("description"),
  timestamp: timestamp("timestamp").notNull(),
  isAnomaly: boolean("is_anomaly").default(false),
  riskScore: integer("risk_score").default(0), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
});

// Risk assessments
export const riskAssessments = pgTable("risk_assessments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  frequencyScore: integer("frequency_score").notNull(), // 0-100
  amountScore: integer("amount_score").notNull(), // 0-100
  timingScore: integer("timing_score").notNull(), // 0-100
  locationScore: integer("location_score").notNull(), // 0-100
  totalScore: integer("total_score").notNull(), // 0-100
  assessmentDate: timestamp("assessment_date").defaultNow(),
});

// Alerts
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  transactionId: integer("transaction_id"),
  type: varchar("type", { length: 50 }).notNull(), // 긴급, 고위험, 중위험
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  isResolved: boolean("is_resolved").default(false),
  severity: varchar("severity", { length: 20 }).notNull(), // high, medium, low
  createdAt: timestamp("created_at").defaultNow(),
});

// Alert settings
export const alertSettings = pgTable("alert_settings", {
  id: serial("id").primaryKey(),
  caregiverId: varchar("caregiver_id").notNull(),
  patientId: integer("patient_id").notNull(),
  immediateAlerts: boolean("immediate_alerts").default(true),
  smsAlerts: boolean("sms_alerts").default(true),
  dailySummary: boolean("daily_summary").default(false),
  threshold: decimal("threshold", { precision: 12, scale: 2 }).default("100000"), // 위험 감지 임계값
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  patients: many(patients),
  alertSettings: many(alertSettings),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  caregiver: one(users, {
    fields: [patients.caregiverId],
    references: [users.id],
  }),
  transactions: many(transactions),
  riskAssessments: many(riskAssessments),
  alerts: many(alerts),
  alertSettings: many(alertSettings),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  patient: one(patients, {
    fields: [transactions.patientId],
    references: [patients.id],
  }),
  alerts: many(alerts),
}));

export const riskAssessmentsRelations = relations(riskAssessments, ({ one }) => ({
  patient: one(patients, {
    fields: [riskAssessments.patientId],
    references: [patients.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  patient: one(patients, {
    fields: [alerts.patientId],
    references: [patients.id],
  }),
  transaction: one(transactions, {
    fields: [alerts.transactionId],
    references: [transactions.id],
  }),
}));

export const alertSettingsRelations = relations(alertSettings, ({ one }) => ({
  caregiver: one(users, {
    fields: [alertSettings.caregiverId],
    references: [users.id],
  }),
  patient: one(patients, {
    fields: [alertSettings.patientId],
    references: [patients.id],
  }),
}));

// Schemas for validation
export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export const insertRiskAssessmentSchema = createInsertSchema(riskAssessments).omit({
  id: true,
  assessmentDate: true,
});

export const insertAlertSettingsSchema = createInsertSchema(alertSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertRiskAssessment = z.infer<typeof insertRiskAssessmentSchema>;
export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type InsertAlertSettings = z.infer<typeof insertAlertSettingsSchema>;
export type AlertSettings = typeof alertSettings.$inferSelect;
