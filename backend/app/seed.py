"""Seed script: create default admin, sample experiment, and questionnaires."""
import asyncio
import uuid

from sqlalchemy import select

from app.database import engine, async_session, Base
from app.models import *  # noqa
from app.models.researcher import Researcher
from app.models.experiment import Experiment, PriceSequence
from app.models.questionnaire import Questionnaire
from app.models.education import EducationContent
from app.utils.security import hash_password
from app.services.price_generator import generate_experiment_prices

PRE_TEST_QUESTIONS = [
    {
        "id": "q1",
        "text": "一枚公平硬币连续抛出5次正面后，第6次抛出正面的概率是多少？",
        "options": [
            {"key": "A", "text": "小于50%，因为之前已经连续出现正面", "is_correct": False},
            {"key": "B", "text": "等于50%，每次抛掷都是独立事件", "is_correct": True},
            {"key": "C", "text": "大于50%，正面出现有连续性", "is_correct": False},
        ],
        "explanation": "每次抛硬币都是独立事件，无论之前的结果如何，每次正面的概率都是50%。",
        "category": "gambler_fallacy",
    },
    {
        "id": "q2",
        "text": "一只股票连续下跌了5天，假设每天涨跌是独立的，明天上涨的概率会：",
        "options": [
            {"key": "A", "text": "增大，因为'该涨了'", "is_correct": False},
            {"key": "B", "text": "不变，每天的涨跌是独立的", "is_correct": True},
            {"key": "C", "text": "减小，下跌趋势会继续", "is_correct": False},
        ],
        "explanation": "如果每天涨跌是独立事件，之前的下跌不会影响明天上涨的概率。",
        "category": "gambler_fallacy",
    },
    {
        "id": "q3",
        "text": "在轮盘赌中，连续出现了8次红色，下一次出现黑色的概率：",
        "options": [
            {"key": "A", "text": "大于50%", "is_correct": False},
            {"key": "B", "text": "等于正常概率（约47.4%）", "is_correct": True},
            {"key": "C", "text": "接近100%", "is_correct": False},
        ],
        "explanation": "轮盘的每次旋转都是独立的，之前的结果不会影响下一次的概率分布。",
        "category": "gambler_fallacy",
    },
    {
        "id": "q4",
        "text": "小明买彩票已经50期没中奖了，他认为下一期中奖的可能性更大了，这种想法：",
        "options": [
            {"key": "A", "text": "是合理的，概率在积累", "is_correct": False},
            {"key": "B", "text": "是错误的，每期中奖概率相同", "is_correct": True},
            {"key": "C", "text": "取决于彩票类型", "is_correct": False},
        ],
        "explanation": "每期彩票开奖都是独立事件，之前是否中奖不影响下一期的中奖概率。",
        "category": "gambler_fallacy",
    },
    {
        "id": "q5",
        "text": "以下哪种投资策略最能体现理性决策？",
        "options": [
            {"key": "A", "text": "股票连跌5天后买入，因为'跌多了一定会涨'", "is_correct": False},
            {"key": "B", "text": "基于公司基本面和合理估值做出投资决定", "is_correct": True},
            {"key": "C", "text": "股票连涨5天后卖出，因为'涨多了一定会跌'", "is_correct": False},
        ],
        "explanation": "理性投资应基于基本面分析，而非基于过去价格走势的直觉判断。",
        "category": "gambler_fallacy",
    },
]

POST_TEST_QUESTIONS = [
    {
        "id": "pq1",
        "text": "投掷一个公平骰子，连续3次出现6点后，第4次出现6点的概率是：",
        "options": [
            {"key": "A", "text": "1/6，与之前结果无关", "is_correct": True},
            {"key": "B", "text": "小于1/6，不太可能再出现6", "is_correct": False},
            {"key": "C", "text": "大于1/6，6点有连续性", "is_correct": False},
        ],
        "explanation": "骰子每次投掷都是独立事件，出现6点的概率始终为1/6。",
        "category": "gambler_fallacy",
    },
    {
        "id": "pq2",
        "text": "基金经理小李过去3年每年都跑赢大盘，假设每年表现独立，下一年他继续跑赢的概率：",
        "options": [
            {"key": "A", "text": "比正常概率更低，因为'好运不会持续'", "is_correct": False},
            {"key": "B", "text": "与正常概率相同", "is_correct": True},
            {"key": "C", "text": "比正常概率更高，因为他有能力", "is_correct": False},
        ],
        "explanation": "如果假设每年表现是独立的，过去的表现不会改变未来的概率。",
        "category": "gambler_fallacy",
    },
    {
        "id": "pq3",
        "text": "你观察到某支股票在过去10期中有7期上涨。在每期涨跌概率相等(50%)的情况下，下一期上涨的概率是：",
        "options": [
            {"key": "A", "text": "小于50%，需要'回归平均'", "is_correct": False},
            {"key": "B", "text": "50%", "is_correct": True},
            {"key": "C", "text": "70%，延续之前的走势", "is_correct": False},
        ],
        "explanation": "每期涨跌是独立事件，过去的7次上涨不会使下一期更可能下跌或上涨。",
        "category": "gambler_fallacy",
    },
    {
        "id": "pq4",
        "text": "以下关于赌徒谬误的说法，哪个是正确的？",
        "options": [
            {"key": "A", "text": "只有不理性的人才会犯赌徒谬误", "is_correct": False},
            {"key": "B", "text": "赌徒谬误源于人类对随机性的系统性误解，很常见", "is_correct": True},
            {"key": "C", "text": "赌徒谬误在金融市场中不存在", "is_correct": False},
        ],
        "explanation": "赌徒谬误是人类认知的一个普遍偏差，即使受过良好教育的人也可能犯这种错误。",
        "category": "gambler_fallacy",
    },
    {
        "id": "pq5",
        "text": "在你的模拟交易中，最能帮助你避免赌徒谬误的做法是：",
        "options": [
            {"key": "A", "text": "记住每期价格变动都是独立的，不被连续走势影响判断", "is_correct": True},
            {"key": "B", "text": "找出价格的规律和模式", "is_correct": False},
            {"key": "C", "text": "总是在下跌后买入", "is_correct": False},
        ],
        "explanation": "避免赌徒谬误的关键是认识到每期价格变动的独立性。",
        "category": "gambler_fallacy",
    },
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # Check if admin exists
        result = await db.execute(select(Researcher).where(Researcher.username == "admin"))
        if not result.scalar_one_or_none():
            admin = Researcher(
                username="admin",
                hashed_password=hash_password("admin123"),
                display_name="管理员",
                role="admin",
            )
            db.add(admin)

        # Check if demo experiment exists
        result = await db.execute(select(Experiment).where(Experiment.code == "DEMO2026"))
        if not result.scalar_one_or_none():
            config = {
                "total_periods": 20,
                "observation_periods": 2,
                "num_assets": 1,
                "initial_cash": 100000,
                "price_mode": "binary",
                "assets": [
                    {
                        "symbol": "A",
                        "name": "股票A",
                        "initial_price": 100,
                        "up_prob": 0.5,
                        "change_pct": 0.1,
                    }
                ],
                "seed_round1": 42,
                "seed_round2": 123,
                "education_version": "text",
                "show_explanations": True,
                "group_assignment": "balanced_random",
            }

            exp = Experiment(
                name="演示实验",
                code="DEMO2026",
                description="演示用行为金融实验",
                status="active",
                config=config,
            )
            db.add(exp)
            await db.flush()

            # Generate prices
            for round_num in [1, 2]:
                prices = generate_experiment_prices(config, round_num)
                for p in prices:
                    ps = PriceSequence(
                        experiment_id=exp.id,
                        round_num=p["round_num"],
                        stock_symbol=p["stock_symbol"],
                        period=p["period"],
                        price=p["price"],
                        direction=p["direction"],
                    )
                    db.add(ps)

            # Pre-test questionnaire
            pre_q = Questionnaire(
                experiment_id=exp.id,
                phase="pre_test",
                questions=PRE_TEST_QUESTIONS,
            )
            db.add(pre_q)

            # Post-test questionnaire
            post_q = Questionnaire(
                experiment_id=exp.id,
                phase="post_test",
                questions=POST_TEST_QUESTIONS,
            )
            db.add(post_q)

            # Education content
            for bias in ["generic", "mild", "moderate", "severe"]:
                for group in ["control", "feedback", "guidance", "feedback_guidance"]:
                    edu = EducationContent(
                        experiment_id=exp.id,
                        bias_level=bias,
                        version="text",
                        group_type=group,
                        title=f"认识赌徒谬误 - {'个性化' if group in ('feedback', 'feedback_guidance') else '通用'}版",
                        content={
                            "sections": [
                                {
                                    "heading": "什么是赌徒谬误？",
                                    "body": "赌徒谬误（Gambler's Fallacy）是指人们错误地认为，如果某个随机事件连续发生了多次，那么接下来发生相反事件的概率就会增大。例如，硬币连续出现5次正面后，认为下一次出反面的概率更大。",
                                    "image_url": None,
                                },
                                {
                                    "heading": "在投资中的表现",
                                    "body": f"根据您的测试结果（{bias}偏差倾向），{'您在实际交易中需要特别注意以下情况：' if bias != 'mild' else '您的表现已经较好，但仍需注意：'}\n\n"
                                    "1. 看到股票连续上涨后，错误地认为'该跌了'\n"
                                    "2. 看到股票连续下跌后，错误地认为'该涨了'\n"
                                    "3. 基于过去的价格模式而非基本面做出交易决策",
                                },
                                {
                                    "heading": "如何克服",
                                    "body": "1. 牢记独立事件原则：每期价格变动不受之前的影响\n"
                                    "2. 交易前问自己：'我的决策是基于概率分析还是直觉？'\n"
                                    "3. 制定交易计划并严格执行，减少情绪化决策\n"
                                    "4. 当发现自己在'等反转'时，停下来重新评估",
                                },
                            ],
                            "key_takeaways": [
                                "每期价格涨跌都是独立事件",
                                "连续上涨不意味着下一期更可能下跌",
                                "连续下跌不意味着下一期更可能上涨",
                                "理性投资应基于概率分析，不被过去走势影响",
                            ],
                            "examples": [
                                {
                                    "scenario": "股票A连续下跌了4期，你觉得'该涨了'，于是买入大量股票",
                                    "correct_thinking": "每期涨跌是独立的，连续下跌不会增加下期上涨的概率。应该基于概率分析（50%涨跌概率）而非直觉做决策。",
                                }
                            ],
                        },
                    )
                    db.add(edu)

        await db.commit()
        print("Seed completed: admin (admin/admin123), demo experiment (DEMO2026)")


if __name__ == "__main__":
    asyncio.run(seed())
