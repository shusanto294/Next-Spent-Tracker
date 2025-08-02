import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
  },
  currencySymbol: {
    type: String,
    required: true,
    default: '$',
  },
  timezone: {
    type: String,
    required: true,
    default: 'America/New_York',
  },
}, {
  timestamps: true,
});

export default mongoose.models.User || mongoose.model('User', UserSchema);