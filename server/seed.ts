#!/usr/bin/env tsx
import { seedDatabase } from "./seedData";

async function main() {
  console.log("Starting database seeding...");
  const success = await seedDatabase();
  
  if (success) {
    console.log("✅ Database seeded successfully!");
    process.exit(0);
  } else {
    console.log("❌ Database seeding failed!");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});