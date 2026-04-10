import mongoose from 'mongoose';

export interface IBlock {
  hash: string;
  height: number;
  version: number;
  merkleroot: string;
  time: number;
  nonce?: number;
  bits?: string;
  difficulty?: number;
  previousblockhash?: string;
  nextblockhash?: string;
  size?: number;
  weight?: number;
  tx: string[];
  confirmations: number;
  createdAt: Date;
  updatedAt: Date;
}

const BlockSchema = new mongoose.Schema<IBlock>({
  hash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  height: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  version: {
    type: Number,
    required: true
  },
  merkleroot: {
    type: String,
    required: true
  },
  time: {
    type: Number,
    required: true,
    index: true
  },
  nonce: Number,
  bits: String,
  difficulty: Number,
  previousblockhash: {
    type: String,
    index: true
  },
  nextblockhash: {
    type: String,
    index: true
  },
  size: Number,
  weight: Number,
  tx: [{
    type: String,
    index: true
  }],
  confirmations: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
BlockSchema.index({ height: -1 });
BlockSchema.index({ time: -1 });
BlockSchema.index({ hash: 1, height: 1 });
BlockSchema.index({ confirmations: -1, height: -1 }); // For recent blocks
BlockSchema.index({ previousblockhash: 1, height: 1 }); // For block chain navigation
BlockSchema.index({ time: -1, height: -1 }); // For time-based queries with pagination

export default mongoose.models.Block || mongoose.model<IBlock>('Block', BlockSchema);
