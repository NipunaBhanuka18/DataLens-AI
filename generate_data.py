import polars as pl
import numpy as np
from datetime import datetime, timedelta

print("Generating MASSIVE stress test dataset...")

# =====================================================
# CONFIG & BASE DATA (Keep your original code here)
# =====================================================
N_ROWS = 5_000_000  
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

# ... [KEEP ALL YOUR ORIGINAL np.random CODE HERE] ...
transaction_ids = np.array([f"TXN-{i:08d}" for i in range(N_ROWS)])
# ... etc ...

# =====================================================
# BUILD DATAFRAME (Keep your original code here)
# =====================================================
df = pl.DataFrame({
    "TransactionID": transaction_ids,
    # ... [KEEP ALL YOUR ORIGINAL COLUMNS HERE] ...
    "NearConstant": np.where(np.random.rand(N_ROWS) < 0.995, "YES", "NO")
})

# =====================================================
# INJECT DATA QUALITY ISSUES (Paste my new code here!)
# =====================================================
print("Injecting anomalies...")

def make_mask(n_rows, num_true):
    mask = np.zeros(n_rows, dtype=bool)
    mask[np.random.choice(n_rows, num_true, replace=False)] = True
    return mask

# 10% missing spend
df = df.with_columns(
    pl.when(np.random.rand(N_ROWS) < 0.10)
    .then(None)
    .otherwise(pl.col("Spend_USD"))
    .alias("Spend_USD")
)

# ... [REST OF THE NEW ANOMALY CODE] ...

# =====================================================
# DUPLICATE ROWS & SAVE (Keep your original code here)
# =====================================================
duplicates = df.sample(10000)
df = pl.concat([df, duplicates])

outfile = "ultra_massive_stress_test.csv"
print("Writing CSV...")
df.write_csv(outfile)
print(df.shape)
print(f"Saved -> {outfile}")