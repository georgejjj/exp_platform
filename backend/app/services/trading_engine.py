def validate_trade(
    action: str,
    quantity: int,
    price: float,
    cash: float,
    holdings: dict,
    stock_symbol: str,
) -> tuple[bool, str]:
    if action == "hold":
        return True, "OK"
    if action == "buy":
        cost = quantity * price
        if cost > cash:
            return False, f"现金不足：需要 {cost:.2f}，可用 {cash:.2f}"
        return True, "OK"
    if action == "sell":
        held = holdings.get(stock_symbol, {}).get("quantity", 0)
        if quantity > held:
            return False, f"持仓不足：需要卖出 {quantity} 股，持有 {held} 股"
        return True, "OK"
    return False, f"未知操作: {action}"


def execute_trade(
    action: str,
    quantity: int,
    price: float,
    cash: float,
    holdings: dict,
    stock_symbol: str,
) -> tuple[float, dict]:
    holdings = {k: dict(v) for k, v in holdings.items()}

    if action == "hold":
        return cash, holdings

    if action == "buy":
        cost = quantity * price
        cash -= cost
        if stock_symbol in holdings:
            existing = holdings[stock_symbol]
            total_qty = existing["quantity"] + quantity
            total_cost = existing["avg_cost"] * existing["quantity"] + cost
            existing["quantity"] = total_qty
            existing["avg_cost"] = round(total_cost / total_qty, 4)
        else:
            holdings[stock_symbol] = {"quantity": quantity, "avg_cost": price}
        return round(cash, 2), holdings

    if action == "sell":
        revenue = quantity * price
        cash += revenue
        existing = holdings[stock_symbol]
        existing["quantity"] -= quantity
        if existing["quantity"] <= 0:
            del holdings[stock_symbol]
        return round(cash, 2), holdings

    return cash, holdings


def calculate_streak(price_history: list[dict], stock_symbol: str) -> tuple[int, str | None]:
    relevant = sorted(
        [p for p in price_history if p.get("stock_symbol") == stock_symbol and p.get("direction")],
        key=lambda x: x["period"],
    )
    if not relevant:
        return 0, None
    streak_dir = relevant[-1]["direction"]
    streak_len = 0
    for p in reversed(relevant):
        if p["direction"] == streak_dir:
            streak_len += 1
        else:
            break
    return streak_len, streak_dir


def is_streak_reversal_bet(action: str, quantity: int, streak_direction: str | None) -> bool | None:
    if streak_direction is None or action == "hold" or quantity == 0:
        return None
    if streak_direction == "down" and action == "buy":
        return True
    if streak_direction == "up" and action == "sell":
        return True
    return False
