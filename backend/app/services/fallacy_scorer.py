def calculate_behavioral_score(trade_actions: list[dict]) -> tuple[float | None, float | None]:
    streak_trades = [
        t for t in trade_actions
        if t.get("streak_length") and t["streak_length"] >= 2
        and t.get("is_streak_reversal_bet") is not None
    ]
    if not streak_trades:
        return None, None
    reversal_bets = sum(1 for t in streak_trades if t["is_streak_reversal_bet"])
    ratio = reversal_bets / len(streak_trades)
    score = ratio * 100
    return round(score, 1), round(ratio, 4)


def determine_bias_level(score: float | None) -> str:
    if score is None:
        return "mild"
    if score < 30:
        return "mild"
    if score < 60:
        return "moderate"
    return "severe"


def calculate_cognitive_score(responses: list[dict]) -> tuple[float, int, int]:
    if not responses:
        return 0.0, 0, 0
    correct = sum(1 for r in responses if r.get("is_correct"))
    total = len(responses)
    return round(correct / total * 100, 1), correct, total
