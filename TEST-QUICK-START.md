# Quick Test Guide - 5 Minutes

Fastest way to test the Configuration Drift Monitor.

## ⚡ Super Quick Test

### 1. Start Server (30 seconds)

```bash
cd config-monitor-server-js
npm install
npm start
```

### 2. Run Quick Test (30 seconds)

**In another terminal:**
```bash
./scripts/quick-test.sh
```

**Expected:** ✅ All smoke tests passed!

## 🎯 Complete Test (5 minutes)

### Step 1: Start Server

```bash
cd config-monitor-server-js
npm install
npm start
```

### Step 2: Run Full Test Suite

**In another terminal:**
```bash
./scripts/run-tests.sh
```

**Expected:** ✅ All tests passed!

### Step 3: Test UI (Optional)

**Terminal 3:**
```bash
cd config-monitor-ui
npm install
npm run dev
```

**Terminal 4:**
```bash
./scripts/test-ui.sh
```

**Open browser:** http://localhost:3000

## 📋 What Gets Tested

### Quick Test (`quick-test.sh`)
- ✅ Server health
- ✅ Baseline registration
- ✅ Snapshot submission
- ✅ Drift retrieval
- ✅ CI check endpoint

### Full Test (`run-tests.sh`)
- ✅ All quick test items
- ✅ Drift detection
- ✅ Override detection
- ✅ Unsafe config detection
- ✅ Acknowledge/Resolve
- ✅ CI check pass/fail

### UI Test (`test-ui.sh`)
- ✅ Creates test data
- ✅ Shows what to look for
- ✅ Ready for manual UI testing

## 🐛 If Tests Fail

### Server Not Running
```bash
cd config-monitor-server-js
npm start
```

### Port Already in Use
```bash
# Check what's using port 8080
lsof -i :8080

# Kill it or change port in .env
PORT=8081 npm start
```

### jq Not Installed
```bash
# macOS
brew install jq

# Linux
sudo apt-get install jq
```

## ✅ Success!

If all tests pass, you're ready to use the system!

For detailed testing, see [HOW-TO-TEST.md](./HOW-TO-TEST.md)
