# QuickShipper sandbox contract

The public docs omit POST `/v1/order` field names. These JSON files are the
shapes the `delivery` edge function maps against. They start from the
documented webhook sample and the `GET /v1/order/fees` query string; replace
them with live captures when you have sandbox credentials:

```bash
node scripts/capture-quickshipper.mjs
```

The script reads `QS_*` from the environment (or `.env.local`) and overwrites
the files in this folder. Never commit real tokens, passwords, or customer
phones — the capture script redacts those.
