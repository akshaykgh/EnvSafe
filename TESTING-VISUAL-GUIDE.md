# Testing Visual Guide 🧪

Simple step-by-step visual guide for testing.

## 🎯 Testing Options

```
┌─────────────────────────────────────────┐
│  Choose Your Testing Method:            │
│                                          │
│  1. ⚡ Quick Test (1 minute)            │
│  2. 🔗 Full Integration Test (5 min)    │
│  3. 🎨 UI Test (with dashboard)         │
│  4. 🧪 Unit Tests (drift engine)        │
│  5. 📋 Manual API Tests                 │
└─────────────────────────────────────────┘
```

## ⚡ Option 1: Quick Test (Fastest)

```
Step 1: Start Server
┌─────────────────────────────┐
│ Terminal 1:                 │
│ cd config-monitor-server-js │
│ npm install                  │
│ npm start                    │
└─────────────────────────────┘
         │
         ▼
   Server Running
   http://localhost:8080
         │
         ▼
┌─────────────────────────────┐
│ Terminal 2:                  │
│ ./scripts/quick-test.sh      │
└─────────────────────────────┘
         │
         ▼
   ✅ All tests passed!
```

**Time:** ~1 minute  
**Tests:** 5 basic checks

## 🔗 Option 2: Full Integration Test

```
Step 1: Start Server
┌─────────────────────────────┐
│ Terminal 1:                  │
│ cd config-monitor-server-js  │
│ npm start                    │
└─────────────────────────────┘
         │
         ▼
Step 2: Run Test Suite
┌─────────────────────────────┐
│ Terminal 2:                  │
│ ./scripts/run-tests.sh       │
└─────────────────────────────┘
         │
         ▼
   Testing...
   ✓ Server health
   ✓ Baseline registration
   ✓ Snapshot submission
   ✓ Drift detection
   ✓ Override detection
   ✓ Unsafe config detection
   ✓ Acknowledge/Resolve
   ✓ CI check
         │
         ▼
   ✅ 10 tests passed!
```

**Time:** ~2-3 minutes  
**Tests:** 10 comprehensive scenarios

## 🎨 Option 3: UI Test (Visual)

```
Step 1: Start Server
┌─────────────────────────────┐
│ Terminal 1:                  │
│ cd config-monitor-server-js  │
│ npm start                    │
└─────────────────────────────┘
         │
         ▼
Step 2: Start Dashboard
┌─────────────────────────────┐
│ Terminal 2:                  │
│ cd config-monitor-ui         │
│ npm run dev                  │
└─────────────────────────────┘
         │
         ▼
Step 3: Create Test Data
┌─────────────────────────────┐
│ Terminal 3:                  │
│ ./scripts/test-ui.sh         │
└─────────────────────────────┘
         │
         ▼
Step 4: Open Browser
┌─────────────────────────────┐
│ http://localhost:3000       │
│                             │
│ ✅ See drifts               │
│ ✅ Filter works              │
│ ✅ Buttons work              │
└─────────────────────────────┘
```

**Time:** ~3-5 minutes  
**Tests:** Visual UI testing

## 🧪 Option 4: Unit Tests

```
┌─────────────────────────────┐
│ cd drift-detection-engine    │
│ npm install                  │
│ npm test                     │
└─────────────────────────────┘
         │
         ▼
   Running 19 tests...
         │
         ▼
   ✓ Missing config tests (3)
   ✓ Override tests (4)
   ✓ Unsafe config tests (4)
   ✓ Production scenarios (4)
   ✓ Edge cases (4)
         │
         ▼
   ✅ 19 tests passed!
```

**Time:** ~30 seconds  
**Tests:** 19 unit tests

## 📋 Option 5: Manual API Tests

### Test Flow Diagram

```
Register Baseline
       │
       ▼
Submit Snapshot (no drift)
       │
       ▼
Check Drifts (empty)
       │
       ▼
Submit Snapshot (with override)
       │
       ▼
Check Drifts (drift detected)
       │
       ▼
Acknowledge Drift
       │
       ▼
Resolve Drift
       │
       ▼
CI Check (passes)
```

### Commands

```bash
# 1. Register
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{"applicationName":"test","environment":"prod","yamlContent":"key: value"}'

# 2. Submit (no drift)
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{"applicationName":"test","environment":"prod","config":{"key":"value"}}'

# 3. Check (empty)
curl http://localhost:8080/api/v1/drifts

# 4. Submit (with override)
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{"applicationName":"test","environment":"prod","config":{"key":"different"}}'

# 5. Check (drift found)
curl http://localhost:8080/api/v1/drifts

# 6. Acknowledge
DRIFT_ID=$(curl -s http://localhost:8080/api/v1/drifts | jq -r '.[0].id')
curl -X POST "http://localhost:8080/api/v1/drifts/$DRIFT_ID/acknowledge"

# 7. Resolve
curl -X POST "http://localhost:8080/api/v1/drifts/$DRIFT_ID/resolve"

# 8. CI Check
curl http://localhost:8080/api/v1/ci-check?applicationName=test
```

## 🎯 Recommended Testing Order

### For First-Time Users

1. **Quick Test** → Verify basic functionality
2. **UI Test** → See it in action
3. **Full Test** → Comprehensive validation

### For Developers

1. **Unit Tests** → Test detection logic
2. **Integration Tests** → Test full stack
3. **Manual Tests** → Test specific scenarios

### For CI/CD

1. **Unit Tests** → Fast feedback
2. **Integration Tests** → Full validation
3. **CI Check Endpoint** → Deployment gate

## ✅ Test Results Interpretation

### Quick Test Results

```
✅ All smoke tests passed!
```
→ System is working correctly

```
❌ Server not responding
```
→ Start server first

```
❌ Baseline registration failed
```
→ Check server logs, verify server is running

### Full Test Results

```
Passed: 10
Failed: 0
✅ All tests passed!
```
→ Everything works perfectly!

```
Passed: 8
Failed: 2
❌ Some tests failed
```
→ Check which tests failed, review server logs

## 🐛 Common Issues

### Issue: "Server not responding"

**Solution:**
```bash
cd config-monitor-server-js
npm start
# Wait for: "Config Monitor Server running..."
```

### Issue: "jq: command not found"

**Solution:**
```bash
# macOS
brew install jq

# Linux
sudo apt-get install jq

# Or test without jq (manual inspection)
curl http://localhost:8080/api/v1/drifts
```

### Issue: "Port 8080 already in use"

**Solution:**
```bash
# Find what's using the port
lsof -i :8080

# Kill it or change port
PORT=8081 npm start
```

### Issue: "No drifts detected"

**Possible Causes:**
1. Baseline not registered → Register baseline first
2. Config matches baseline → Create a difference
3. Wait time too short → Wait 30-60 seconds

**Solution:**
```bash
# Register baseline
curl -X POST http://localhost:8080/api/v1/baselines ...

# Submit snapshot with DIFFERENT values
curl -X POST http://localhost:8080/api/v1/config-snapshots ...
```

## 📊 Test Coverage Summary

| Test Type | Tests | Time | Coverage |
|-----------|-------|------|----------|
| Unit Tests | 19 | 30s | Detection logic |
| Quick Test | 5 | 1min | Basic API |
| Full Test | 10 | 3min | Full stack |
| UI Test | Manual | 5min | Visual testing |

## 🎉 Success Checklist

- [ ] Quick test passes
- [ ] Unit tests pass (19/19)
- [ ] Integration tests pass (10/10)
- [ ] Dashboard loads
- [ ] Drifts appear in UI
- [ ] Acknowledge works
- [ ] Resolve works
- [ ] CI check works

**All checked? You're ready!** 🚀
