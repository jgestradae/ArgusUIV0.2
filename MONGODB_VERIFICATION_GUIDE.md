# MongoDB Verification Quick Guide

## Quick Access Commands

### Connect to MongoDB
```bash
mongosh
```

### Select Database
```bash
use test_database
```

### View All Collections
```bash
show collections
```

## AMM Data Queries

### 1. View All AMM Configurations
```javascript
db.amm_configurations.find().pretty()
```

### 2. Count Total AMM Configurations
```javascript
db.amm_configurations.countDocuments()
```

### 3. View Latest AMM Configuration
```javascript
db.amm_configurations.find().sort({created_at: -1}).limit(1).pretty()
```

### 4. View Measurement Definitions
```javascript
db.measurement_definitions.find().pretty()
```

### 5. View Specific Measurement by ID
```javascript
db.measurement_definitions.find({id: "your-uuid-here"}).pretty()
```

### 6. View Timing Definitions
```javascript
db.timing_definitions.find().pretty()
```

### 7. View Range Definitions
```javascript
db.range_definitions.find().pretty()
```

### 8. View General Definitions
```javascript
db.general_definitions.find().pretty()
```

### 9. View AMM Execution History
```javascript
db.amm_executions.find().sort({started_at: -1}).pretty()
```

### 10. Count Executions
```javascript
db.amm_executions.countDocuments()
```

### 11. View Failed Executions
```javascript
db.amm_executions.find({status: "failed"}).pretty()
```

### 12. View Successful Executions
```javascript
db.amm_executions.find({status: "completed"}).pretty()
```

### 13. Find AMM by Name
```javascript
db.amm_configurations.find({name: /Test/i}).pretty()
```

### 14. View System States (GSS responses)
```javascript
db.system_states.find().sort({timestamp: -1}).limit(1).pretty()
```

### 15. View All Stations
```javascript
db.system_states.find({}, {stations: 1}).pretty()
```

## Useful Aggregations

### Count AMM by Status
```javascript
db.amm_configurations.aggregate([
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 }
    }
  }
])
```

### Count Executions by AMM Config
```javascript
db.amm_executions.aggregate([
  {
    $group: {
      _id: "$amm_config_id",
      count: { $sum: 1 }
    }
  }
])
```

### Get Latest Execution Per AMM
```javascript
db.amm_executions.aggregate([
  {
    $sort: { started_at: -1 }
  },
  {
    $group: {
      _id: "$amm_config_id",
      latest_execution: { $first: "$$ROOT" }
    }
  }
])
```

## Delete/Clean Operations

### ⚠️ Delete All AMM Configurations (USE WITH CAUTION!)
```javascript
db.amm_configurations.deleteMany({})
db.measurement_definitions.deleteMany({})
db.timing_definitions.deleteMany({})
db.range_definitions.deleteMany({})
db.general_definitions.deleteMany({})
db.amm_executions.deleteMany({})
```

### Delete Specific AMM by ID
```javascript
db.amm_configurations.deleteOne({id: "your-uuid-here"})
```

### Delete Test/Demo Configurations
```javascript
db.amm_configurations.deleteMany({name: /Test|Demo/i})
```

## Exit MongoDB
```bash
exit
```

---

## MongoDB Compass (GUI Tool)

### Download
https://www.mongodb.com/try/download/compass

### Connection String
```
mongodb://localhost:27017
```

### Navigation
1. Connect to MongoDB
2. Select database: `test_database`
3. Browse collections:
   - amm_configurations
   - measurement_definitions
   - timing_definitions
   - range_definitions
   - general_definitions
   - amm_executions
   - system_states
   - users

### Features
- ✅ Visual query builder
- ✅ Document editor
- ✅ Aggregation pipeline builder
- ✅ Index management
- ✅ Schema analyzer
- ✅ Export/Import data

---

## Expected Data After AMM Creation

After creating an AMM through the wizard, you should see:

### 1. In amm_configurations
- 1 new document with status "draft" or "active"
- Links to timing, measurement, range, and general definition IDs

### 2. In measurement_definitions
- 1 new document with:
  - measurement_type (e.g., "FLSCAN")
  - device_name (signal path)
  - station_names array
  - frequency_mode and parameters
  - receiver_config object
  - antenna_config object

### 3. In timing_definitions
- 1 new document with:
  - schedule_type
  - start/end times
  - repeat settings

### 4. In range_definitions
- 1 new document with frequency ranges

### 5. In general_definitions
- 1 new document with general settings

### 6. In amm_executions (after scheduler runs)
- Execution records when AMM is triggered
- generated_orders array with Order IDs

---

## Troubleshooting

### No Data in Collections
**Possible causes:**
1. AMM submission failed (check backend logs)
2. MongoDB connection issue
3. Wrong database name in .env

**Check:**
```javascript
// Verify you're in correct database
db.getName()

// Should return: test_database
```

### Cannot Connect to MongoDB
```bash
# Check if MongoDB is running
net start MongoDB

# Test connection
mongosh --eval "db.adminCommand('ping')"
```

### Data Exists but Incomplete
```javascript
// Check for errors in execution
db.amm_executions.find({error_message: {$exists: true}}).pretty()
```

---

## Quick Health Check Script

Save this as `check_amm_health.js` and run with `mongosh < check_amm_health.js`:

```javascript
use test_database

print("\n=== AMM System Health Check ===\n");

print("Total AMM Configurations: " + db.amm_configurations.countDocuments());
print("Active Configurations: " + db.amm_configurations.countDocuments({status: "active"}));
print("Draft Configurations: " + db.amm_configurations.countDocuments({status: "draft"}));
print("\nTotal Executions: " + db.amm_executions.countDocuments());
print("Failed Executions: " + db.amm_executions.countDocuments({status: "failed"}));
print("\nSystem States: " + db.system_states.countDocuments());
print("Users: " + db.users.countDocuments());

print("\n=== Latest AMM ===");
db.amm_configurations.find().sort({created_at: -1}).limit(1).forEach(printjson);

print("\n=== Latest Execution ===");
db.amm_executions.find().sort({started_at: -1}).limit(1).forEach(printjson);

print("\n=== Health Check Complete ===\n");
```

Run with:
```bash
mongosh < check_amm_health.js
```

---

**End of MongoDB Verification Guide**
