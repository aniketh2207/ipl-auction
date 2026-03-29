"""prepare_data.py — Transform players_list.csv → data/players.json"""

import pandas as pd
import json
import os
import sys

# Path setup
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
CSV_PATH = os.path.join(PROJECT_ROOT, "players_list.csv")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "data", "players.json")


def load_csv(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        print(f"ERROR: CSV not found at {path}")
        sys.exit(1)
    df = pd.read_csv(path)
    print(f"✓ Loaded {len(df)} players")
    return df


def select_and_rename(df: pd.DataFrame) -> pd.DataFrame:
    df["name"] = df["First Name"].str.strip() + " " + df["Surname"].str.strip()

    # "Unnamed: 10" = batting hand, "Unnamed: 11" = bowling style (no header in CSV)
    column_map = {
        "List Sr. No.": "id",
        "Set No.": "setNo",
        "Country": "country",
        "Specialism": "role",
        "C/U/A": "category",
        "Reserve Price Rs Lakh": "basePrice",
        "Age": "age",
        "Unnamed: 10": "battingHand",
        "Unnamed: 11": "bowlingStyle",
        "IPL": "iplCaps",
    }

    df = df[list(column_map.keys()) + ["name"]].copy()
    df = df.rename(columns=column_map)
    print(f"✓ Columns: {list(df.columns)}")
    return df


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    # Fill missing values
    df["battingHand"] = df["battingHand"].fillna("Unknown")
    df["bowlingStyle"] = df["bowlingStyle"].where(df["bowlingStyle"].notna(), None)
    df["iplCaps"] = df["iplCaps"].fillna(0).astype(int)
    df["age"] = df["age"].astype(int)
    df["basePrice"] = df["basePrice"].astype(int)

    # Standardize text
    df["role"] = df["role"].str.strip().str.upper()
    df["category"] = df["category"].str.strip().str.title()
    df["country"] = df["country"].str.strip()
    df["name"] = df["name"].str.strip().str.replace(r"\s+", " ", regex=True)

    # Overseas flag (for IPL's max 8 overseas rule)
    df["isOverseas"] = df["country"] != "India"

    print(f"✓ Cleaned — {df['isOverseas'].sum()} overseas, {(~df['isOverseas']).sum()} Indian")
    return df


def validate(df: pd.DataFrame) -> bool:
    errors = []

    if len(df) == 0:
        errors.append("No players found!")

    dupes = df[df["id"].duplicated()]
    if len(dupes) > 0:
        errors.append(f"Duplicate IDs: {dupes['id'].tolist()}")

    for col in ["id", "setNo", "name", "country", "role", "basePrice", "category", "age"]:
        nulls = df[col].isna().sum()
        if nulls > 0:
            errors.append(f"'{col}' has {nulls} nulls")

    invalid_roles = set(df["role"].unique()) - {"BATTER", "BOWLER", "ALL-ROUNDER", "WICKETKEEPER"}
    if invalid_roles:
        errors.append(f"Invalid roles: {invalid_roles}")

    invalid_cats = set(df["category"].unique()) - {"Capped", "Uncapped", "Associate"}
    if invalid_cats:
        errors.append(f"Invalid categories: {invalid_cats}")

    if (df["basePrice"] <= 0).any():
        errors.append("Non-positive base prices found")

    if errors:
        print("✗ Validation FAILED:")
        for e in errors:
            print(f"  - {e}")
        return False

    print(f"✓ Validated — {len(df)} players, all clean")
    return True


def export_json(df: pd.DataFrame, output_path: str):
    players = df.to_dict(orient="records")

    # Default auction state — server updates these during the auction
    for player in players:
        player["isSold"] = False
        player["soldPrice"] = None
        player["soldTo"] = None

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(players, f, indent=2, ensure_ascii=False)

    print(f"✓ Exported {len(players)} players → {output_path} ({os.path.getsize(output_path) / 1024:.1f} KB)")


def main():
    print("=" * 40)
    print("IPL Auction — Data Pipeline")
    print("=" * 40)

    df = load_csv(CSV_PATH)
    df = select_and_rename(df)
    df = clean_data(df)

    if not validate(df):
        sys.exit(1)

    export_json(df, OUTPUT_PATH)

    # Preview first 3 players
    with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
        players = json.load(f)
    print("\n--- Preview ---")
    for p in players[:3]:
        print(json.dumps(p, indent=2, ensure_ascii=False))

    print("\n✓ Done! Next: build the server.")


if __name__ == "__main__":
    main()
