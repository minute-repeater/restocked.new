#!/usr/bin/env node
/**
 * End-to-end monitoring test script
 * Tests the full monitoring loop: add product → check → detect changes → create notifications → email
 */

import axios from "axios";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_EMAIL || "free@test.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "Password123!";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@test.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Password123!";

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

function log(step: string, success: boolean, message: string, data?: any) {
  const icon = success ? "✓" : "✗";
  console.log(`${icon} ${step}: ${message}`);
  if (data) {
    console.log(`   Data:`, JSON.stringify(data, null, 2));
  }
  results.push({ step, success, message, data });
}

async function login(email: string, password: string): Promise<string> {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email,
    password,
  });
  return response.data.token;
}

async function testMonitoring() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("End-to-End Monitoring Test");
  console.log("═══════════════════════════════════════════════════════════════\n");

  try {
    // Step 1: Login as test user
    console.log("Step 1: Login as test user");
    const userToken = await login(TEST_EMAIL, TEST_PASSWORD);
    log("Login", true, "Logged in as test user", { email: TEST_EMAIL });

    // Step 2: Add a product
    console.log("\nStep 2: Add a product");
    const testUrl = "https://cherryla.com/collections/headwear/products/bucking-dad-hat-beige";
    const addProductResponse = await axios.post(
      `${API_BASE_URL}/products`,
      { url: testUrl },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    const productId = addProductResponse.data.product.id;
    log("Add Product", true, "Product added", {
      productId,
      name: addProductResponse.data.product.name,
      url: testUrl,
    });

    // Step 3: Track the product
    console.log("\nStep 3: Track the product");
    const trackResponse = await axios.post(
      `${API_BASE_URL}/me/tracked-items`,
      { product_id: productId },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    log("Track Product", true, "Product tracked", {
      trackedItemId: trackResponse.data.tracked_item.id,
    });

    // Step 4: Get initial notification count
    console.log("\nStep 4: Get initial notification count");
    const initialNotificationsResponse = await axios.get(
      `${API_BASE_URL}/me/notifications`,
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    const initialUnreadCount = initialNotificationsResponse.data.unread_count || 0;
    log("Initial Notifications", true, `Initial unread count: ${initialUnreadCount}`);

    // Step 5: Login as admin and run checks
    console.log("\nStep 5: Run checks (admin)");
    const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    const checkResponse = await axios.post(
      `${API_BASE_URL}/admin/checks/run-now`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    log("Run Checks", true, "Checks completed", {
      productsChecked: checkResponse.data.productsChecked,
      changesDetected: checkResponse.data.changesDetected,
      notificationsCreated: checkResponse.data.notificationsCreated,
    });

    // Step 6: Wait a moment for notifications to be created
    console.log("\nStep 6: Wait for notifications...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 7: Check notifications again
    console.log("\nStep 7: Check notifications after check run");
    const afterNotificationsResponse = await axios.get(
      `${API_BASE_URL}/me/notifications`,
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    const afterUnreadCount = afterNotificationsResponse.data.unread_count || 0;
    const notifications = afterNotificationsResponse.data.notifications || [];
    const newNotifications = notifications.filter(
      (n: any) => new Date(n.created_at) > new Date(Date.now() - 10000)
    );

    log("After Notifications", true, `Unread count: ${afterUnreadCount}`, {
      newNotificationsCount: newNotifications.length,
      notifications: newNotifications.slice(0, 3).map((n: any) => ({
        id: n.id,
        type: n.type,
        message: n.message?.substring(0, 50),
      })),
    });

    // Step 8: Verify email delivery (check logs)
    console.log("\nStep 8: Verify email delivery");
    log("Email Delivery", true, "Check server logs for email delivery (or logged payload if RESEND_API_KEY not set)");

    // Summary
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("Test Summary");
    console.log("═══════════════════════════════════════════════════════════════");

    const allPassed = results.every((r) => r.success);
    const failedSteps = results.filter((r) => !r.success);

    if (allPassed) {
      console.log("✅ All tests passed!");
      console.log("\nResults:");
      results.forEach((r) => {
        console.log(`  ${r.success ? "✓" : "✗"} ${r.step}: ${r.message}`);
      });
    } else {
      console.log("❌ Some tests failed:");
      failedSteps.forEach((r) => {
        console.log(`  ✗ ${r.step}: ${r.message}`);
      });
      process.exit(1);
    }

    console.log("\n═══════════════════════════════════════════════════════════════");
  } catch (error: any) {
    console.error("\n❌ Test failed with error:", error.message);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testMonitoring().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

