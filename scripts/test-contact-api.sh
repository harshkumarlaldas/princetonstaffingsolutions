#!/bin/bash

# Contact Form API Test Script
# This script tests the contact form API endpoints

BASE_URL="http://localhost:3000"

echo "🧪 Testing Contact Form API"
echo "=========================="

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "$BASE_URL/api/health" | jq '.' || echo "Health check failed or jq not installed"

echo -e "\n2. Testing contact form validation..."

# Test valid submission (will fail without real CAPTCHA token)
echo "Testing valid submission (should fail due to invalid CAPTCHA)..."
curl -s -X POST "$BASE_URL/api/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "company": "Test Company",
    "subject": "Test Subject",
    "message": "This is a test message with more than 10 characters to validate the form.",
    "website": "",
    "formAge": 5,
    "captchaToken": "invalid-token",
    "privacyConsent": true
  }' | jq '.' || echo "Request failed"

echo -e "\n3. Testing validation errors..."

# Test invalid email
echo "Testing invalid email..."
curl -s -X POST "$BASE_URL/api/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "invalid-email",
    "message": "Test message",
    "website": "",
    "formAge": 5,
    "captchaToken": "token",
    "privacyConsent": true
  }' | jq '.' || echo "Request failed"

# Test short message
echo -e "\nTesting short message..."
curl -s -X POST "$BASE_URL/api/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Short",
    "website": "",
    "formAge": 5,
    "captchaToken": "token",
    "privacyConsent": true
  }' | jq '.' || echo "Request failed"

# Test honeypot field
echo -e "\nTesting honeypot field (should be rejected)..."
curl -s -X POST "$BASE_URL/api/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Test message",
    "website": "bot-filled-field",
    "formAge": 5,
    "captchaToken": "token",
    "privacyConsent": true
  }' | jq '.' || echo "Request failed"

# Test form age validation
echo -e "\nTesting form age validation (should be rejected)..."
curl -s -X POST "$BASE_URL/api/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Test message",
    "website": "",
    "formAge": 1,
    "captchaToken": "token",
    "privacyConsent": true
  }' | jq '.' || echo "Request failed"

echo -e "\n4. Testing rate limiting..."
echo "Sending multiple requests to test rate limiting..."

for i in {1..3}; do
  echo "Request $i..."
  curl -s -X POST "$BASE_URL/api/contact" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Rate Test",
      "email": "rate@test.com",
      "message": "Rate limit test",
      "website": "",
      "formAge": 5,
      "captchaToken": "token",
      "privacyConsent": true
    }' | jq '.' || echo "Request failed"
  sleep 1
done

echo -e "\n✅ API testing completed!"
echo "Note: These tests will fail due to invalid CAPTCHA tokens."
echo "For real testing, you need to configure valid CAPTCHA keys."

