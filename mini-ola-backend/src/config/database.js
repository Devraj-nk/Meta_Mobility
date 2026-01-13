const mongoose = require('mongoose');

const getMongoUriConfigError = (uri) => {
  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    return 'MONGODB_URI is missing. Create mini-ola-backend/.env and set MONGODB_URI.';
  }

  const trimmed = uri.trim();
  if (!trimmed.startsWith('mongodb://') && !trimmed.startsWith('mongodb+srv://')) {
    return 'MONGODB_URI must start with mongodb:// or mongodb+srv://';
  }

  // Common dev pitfall: password contains reserved characters like '@' and is not URL-encoded.
  // In a valid connection string, the authority section should contain exactly one '@'
  // separating credentials from the host.
  const schemeIndex = trimmed.indexOf('://');
  if (schemeIndex !== -1) {
    const afterScheme = trimmed.slice(schemeIndex + 3);
    const authorityEnd = afterScheme.search(/[/?#]/);
    const authority = authorityEnd === -1 ? afterScheme : afterScheme.slice(0, authorityEnd);
    const atCount = (authority.match(/@/g) || []).length;
    if (atCount > 1) {
      return (
        "MONGODB_URI looks malformed (multiple '@' in the credentials/host section). " +
        "If your password contains '@', URL-encode it as '%40'. " +
        "Example: mongodb+srv://user:pa%40ss@cluster.mongodb.net/db"
      );
    }
  }

  return null;
};

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    const uriError = getMongoUriConfigError(uri);
    if (uriError) {
      console.error(`❌ ${uriError}`);
      process.exit(1);
    }

    const conn = await mongoose.connect(uri, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);

    // Add extra guidance for common DNS/SRV failures.
    if (typeof error?.message === 'string' && /querySrv\s+ENOTFOUND/i.test(error.message)) {
      console.error(
        "ℹ️  This usually means the SRV hostname in MONGODB_URI is invalid or couldn't be resolved. " +
        "Double-check your MongoDB Atlas connection string and URL-encode special characters in the password (e.g. '@' -> '%40')."
      );
    }
    process.exit(1);
  }
};

module.exports = connectDB;
