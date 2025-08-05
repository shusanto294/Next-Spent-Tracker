import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  color: {
    type: String,
    default: '#3B82F6',
  },
  order: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Clear any existing model to ensure schema updates are applied
if (mongoose.models.Category) {
  delete mongoose.models.Category;
}

export default mongoose.model('Category', CategorySchema);