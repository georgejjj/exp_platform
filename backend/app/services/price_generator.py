import numpy as np


def generate_binary_prices(
    initial_price: float,
    num_periods: int,
    up_prob: float,
    change_pct: float,
    rng: np.random.Generator,
) -> list[dict]:
    prices = [{"period": 0, "price": initial_price, "direction": None}]
    current = initial_price
    for i in range(1, num_periods + 1):
        goes_up = rng.random() < up_prob
        direction = "up" if goes_up else "down"
        current = round(current * (1 + change_pct if goes_up else 1 - change_pct), 2)
        prices.append({"period": i, "price": current, "direction": direction})
    return prices


def generate_normal_prices(
    initial_price: float,
    num_periods: int,
    mean: float,
    std: float,
    rng: np.random.Generator,
) -> list[dict]:
    prices = [{"period": 0, "price": initial_price, "direction": None}]
    current = initial_price
    for i in range(1, num_periods + 1):
        log_return = rng.normal(mean, std)
        new_price = round(current * np.exp(log_return), 2)
        direction = "up" if new_price > current else "down"
        current = new_price
        prices.append({"period": i, "price": current, "direction": direction})
    return prices


def generate_experiment_prices(config: dict, round_num: int) -> list[dict]:
    seed_key = f"seed_round{round_num}"
    seed = config.get(seed_key, 42 if round_num == 1 else 123)
    rng = np.random.default_rng(seed)

    total_periods = config.get("total_periods", 20)
    observation_periods = config.get("observation_periods", 2)
    total = total_periods + observation_periods
    price_mode = config.get("price_mode", "binary")
    assets = config.get("assets", [
        {"symbol": "A", "name": "股票A", "initial_price": 100, "up_prob": 0.5, "change_pct": 0.1}
    ])

    all_prices = []
    for asset in assets:
        symbol = asset["symbol"]
        initial_price = asset.get("initial_price", 100)

        if price_mode == "binary":
            up_prob = asset.get("up_prob", 0.5)
            change_pct = asset.get("change_pct", 0.1)
            prices = generate_binary_prices(initial_price, total, up_prob, change_pct, rng)
        else:
            normal_params = config.get("normal_params", {"mean": 0.001, "std": 0.02})
            prices = generate_normal_prices(
                initial_price, total, normal_params["mean"], normal_params["std"], rng
            )

        for p in prices:
            p["stock_symbol"] = symbol
            p["round_num"] = round_num

        all_prices.extend(prices)

    return all_prices
