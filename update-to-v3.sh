#!/bin/bash
set -e
echo "Updating FairCoin Explorer to v3.0.0 parameters..."

if [ ! -f "package.json" ] || [ ! -d "lib" ]; then
    echo "ERROR: Must be run from the Explorer repository root"
    exit 1
fi

echo "[1/6] Updating RPC ports (40405->46373, 18332->46375)..."
sed -i 's/FAIRCOIN_RPC_PORT=40405/FAIRCOIN_RPC_PORT=46373/g' .env .env.example README.md 2>/dev/null || true
sed -i "s/'40405'/'46373'/g; s/'18332'/'46375'/g" lib/rpc.ts
sed -i 's/rpcPort: 40405/rpcPort: 46373/; s/rpcPort: 18332/rpcPort: 46375/' contexts/network-context.tsx

echo "[2/6] Updating max supply (53,193,831 -> 33,000,000)..."
sed -i 's/53193831/33000000/g' \
    components/stats-content.tsx \
    components/network-stats-content.tsx \
    app/api/stats/route.ts \
    app/api/masternodes/route.ts

echo "[3/6] Updating masternode collateral (25,000 -> 5,000)..."
sed -i 's/collateralPerMasternode = 25000/collateralPerMasternode = 5000/' app/api/masternodes/route.ts

echo "[4/6] Updating PoW phase boundary (blocks 1-25000 -> 1-10000)..."
sed -i 's|PoW blocks 1-25000, PoS 25001+|PoW blocks 1-10000, PoS 10001+|' app/api/stats/route.ts
sed -i 's/blockHeight > 25000/blockHeight > 10000/' app/api/stats/route.ts

echo "[5/6] Updating P2P port references (53472 -> 46372)..."
sed -i 's/127\.0\.0\.1:53472/127.0.0.1:46372/g' components/masternodes-content.tsx

echo "[6/6] Updating translation strings..."
for f in messages/en.json messages/es.json messages/fr.json messages/de.json \
         messages/zh.json messages/ja.json messages/ko.json messages/ru.json; do
    if [ -f "$f" ]; then
        sed -i 's/53472/46372/g' "$f"
        sed -i 's/"blocks1to25000"/"blocks1to10000"/g' "$f"
        sed -i 's/1-25,000/1-10,000/g; s/1-25000/1-10000/g' "$f"
    fi
done
sed -i "s/t('blocks1to25000')/t('blocks1to10000')/" components/stats-content.tsx

echo ""
echo "Verification - remaining old references:"
grep -rn "40405\|18332\|53472\|53193831\|blocks1to25000" \
    --include="*.ts" --include="*.tsx" --include="*.json" --include="*.mjs" --include="*.md" \
    --include=".env*" . 2>/dev/null | grep -v node_modules || echo "  (none - all clean!)"

echo ""
echo "Done. Run: git add . && git commit -m 'Update to FairCoin v3.0.0' && git push"
