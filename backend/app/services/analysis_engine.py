from app.services.fallacy_scorer import (
    calculate_behavioral_score,
    calculate_cognitive_score,
    determine_bias_level,
)


def determine_investor_profile(cognitive_score: float, behavioral_score: float | None) -> dict:
    if behavioral_score is None:
        behavioral_score = 50.0

    cognitive_good = cognitive_score >= 60
    behavioral_good = behavioral_score < 40

    if cognitive_good and behavioral_good:
        return {
            "type_name": "理性投资者",
            "description": "您在认知和行为上都表现出较强的理性判断能力，能够识别独立事件并在交易中避免赌徒谬误。",
            "consistency_score": round(min(cognitive_score, 100 - behavioral_score) / 100, 2),
        }
    elif cognitive_good and not behavioral_good:
        return {
            "type_name": "知行不一型",
            "description": "您在理论上理解概率独立性，但在实际交易中仍然容易受到赌徒谬误的影响。知道不等于做到，需要在实践中加强理性决策。",
            "consistency_score": round(max(0, (cognitive_score - behavioral_score)) / 100, 2),
        }
    elif not cognitive_good and behavioral_good:
        return {
            "type_name": "直觉正确型",
            "description": "虽然在理论测试中表现一般，但您的交易行为相对理性，直觉判断较好。建议加强概率理论学习。",
            "consistency_score": round(
                max(0, (100 - behavioral_score - (100 - cognitive_score))) / 100, 2
            ),
        }
    else:
        return {
            "type_name": "需要提升型",
            "description": "在认知和行为两个维度上都存在一定的赌徒谬误倾向，建议认真学习概率知识并在投资中注意避免该偏差。",
            "consistency_score": round(
                max(0, (cognitive_score + (100 - behavioral_score)) / 200), 2
            ),
        }


def build_comprehensive_analysis(
    pre_responses: list[dict],
    post_responses: list[dict],
    round1_trades: list[dict],
    round2_trades: list[dict],
    group: str,
) -> dict:
    pre_score, pre_correct, pre_total = calculate_cognitive_score(pre_responses)
    post_score, post_correct, post_total = calculate_cognitive_score(post_responses)

    r1_behavioral, r1_ratio = calculate_behavioral_score(round1_trades)
    r2_behavioral, r2_ratio = calculate_behavioral_score(round2_trades)

    bias_level = determine_bias_level(r1_behavioral)
    profile = determine_investor_profile(
        post_score, r2_behavioral if r2_behavioral is not None else r1_behavioral
    )

    b_improvement = None
    if r1_behavioral is not None and r2_behavioral is not None:
        b_improvement = round(r1_behavioral - r2_behavioral, 1)

    return {
        "cognitive": {
            "pre_test_score": pre_score,
            "post_test_score": post_score,
            "improvement": round(post_score - pre_score, 1),
            "bias_level": bias_level,
        },
        "behavioral": {
            "round1_fallacy_score": r1_behavioral,
            "round2_fallacy_score": r2_behavioral,
            "improvement": b_improvement,
            "streak_reversal_ratio_r1": r1_ratio,
            "streak_reversal_ratio_r2": r2_ratio,
        },
        "profile": profile,
        "group": group,
    }


def build_final_results(
    pre_responses: list[dict],
    post_responses: list[dict],
    round1_session: dict,
    round2_session: dict,
    round1_trades: list[dict],
    round2_trades: list[dict],
    group: str,
) -> dict:
    analysis = build_comprehensive_analysis(
        pre_responses, post_responses, round1_trades, round2_trades, group
    )

    r1_pnl = round1_session.get("pnl", 0) or 0
    r1_pnl_pct = round1_session.get("pnl_pct", 0) or 0
    r2_pnl = round2_session.get("pnl", 0) or 0
    r2_pnl_pct = round2_session.get("pnl_pct", 0) or 0

    has_guidance = group in ("guidance", "feedback_guidance")
    edu_type = "personalized" if group in ("feedback", "feedback_guidance") else "generic"

    r1_fs = round1_session.get("behavioral_fallacy_score")
    r2_fs = round2_session.get("behavioral_fallacy_score")
    fallacy_imp = None
    if r1_fs is not None and r2_fs is not None:
        fallacy_imp = round(r1_fs - r2_fs, 1)

    return {
        "comparison": {
            "round1_pnl": r1_pnl,
            "round1_pnl_pct": r1_pnl_pct,
            "round2_pnl": r2_pnl,
            "round2_pnl_pct": r2_pnl_pct,
            "pnl_improvement": round(r2_pnl - r1_pnl, 2),
            "round1_fallacy_score": r1_fs,
            "round2_fallacy_score": r2_fs,
            "fallacy_improvement": fallacy_imp,
        },
        **analysis,
        "education_received": edu_type,
        "had_guidance": has_guidance,
    }
