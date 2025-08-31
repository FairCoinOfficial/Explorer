import mongoose from 'mongoose';

export interface ITransaction {
  txid: string;
  hash?: string;
  version?: number;
  size?: number;
  vsize?: number;
  locktime?: number;
  vin: any[];
  vout: Array<{
    value: number;
    n: number;
    scriptPubKey: {
      addresses?: string[];
      asm?: string;
      type?: string;
    };
  }>;
  hex?: string;
  blockhash?: string;
  confirmations?: number;
  time?: number;
  blocktime?: number;
  blockheight?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new mongoose.Schema<ITransaction>({
  txid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  hash: String,
  version: Number,
  size: Number,
  vsize: Number,
  locktime: Number,
  vin: [mongoose.Schema.Types.Mixed],
  vout: [{
    value: { type: Number, required: true },
    n: { type: Number, required: true },
    scriptPubKey: {
      addresses: [String],
      asm: String,
      type: String
    }
  }],
  hex: String,
  blockhash: {
    type: String,
    index: true
  },
  confirmations: Number,
  time: {
    type: Number,
    index: true
  },
  blocktime: Number,
  blockheight: {
    type: Number,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
TransactionSchema.index({ blockhash: 1, txid: 1 });
TransactionSchema.index({ time: -1 });
TransactionSchema.index({ blockheight: -1 });
TransactionSchema.index({ 'vout.scriptPubKey.addresses': 1 });
TransactionSchema.index({ txid: 1, blockheight: -1 }); // For transaction lookup with block context
TransactionSchema.index({ blockheight: -1, time: -1 }); // For recent transactions in blocks
TransactionSchema.index({ 'vin.txid': 1 }); // For transaction input lookups

export default mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
