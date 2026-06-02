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


def calculate_game_fallacy_score(rounds: list[dict]) -> tuple[float | None, float | None]:
    """Score gambler's fallacy from race-car-game predictions.

    A round is a "streak opportunity" when the obstacles in the rounds immediately
    before it formed a same-side streak of length >= 2. On such rounds, a prediction
    on the OPPOSITE side of the streak is an anti-streak (gambler's-fallacy) bet.
    Score = anti-streak bets / streak opportunities, scaled to 0-100.
    """
    streak_rounds = [
        r for r in rounds
        if r.get("streak_length", 0) >= 2 and r.get("is_streak_reversal_prediction") is not None
    ]
    if not streak_rounds:
        return None, None
    reversal_bets = sum(1 for r in streak_rounds if r["is_streak_reversal_prediction"])
    ratio = reversal_bets / len(streak_rounds)
    return round(ratio * 100, 1), round(ratio, 4)
