# MongoDB Direct Commands for KYC Approval

## Approve ALL drivers at once
```javascript
db.drivers.updateMany(
  { kycStatus: 'pending' },
  { $set: { kycStatus: 'approved' } }
)
```

## Approve a specific driver by email
```javascript
// First, find the user ID
const user = db.users.findOne({ email: 'kumar@example.com' })

// Then approve their driver profile
db.drivers.updateOne(
  { user: user._id },
  { $set: { kycStatus: 'approved' } }
)
```

## Check all drivers and their KYC status
```javascript
db.drivers.aggregate([
  {
    $lookup: {
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      as: 'userInfo'
    }
  },
  {
    $project: {
      name: { $arrayElemAt: ['$userInfo.name', 0] },
      email: { $arrayElemAt: ['$userInfo.email', 0] },
      kycStatus: 1,
      vehicleType: 1,
      vehicleNumber: 1
    }
  }
])
```

## Reset a driver's KYC to pending
```javascript
const user = db.users.findOne({ email: 'driver@example.com' })
db.drivers.updateOne(
  { user: user._id },
  { $set: { kycStatus: 'pending' } }
)
```
